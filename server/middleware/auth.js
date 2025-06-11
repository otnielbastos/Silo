const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// Chave secreta para JWT (em produção, mover para variáveis de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_aqui';
const JWT_EXPIRES_IN = '8h';

// Middleware de autenticação
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de acesso requerido' 
      });
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar se a sessão existe e está ativa
    const [sessao] = await db.execute(
      'SELECT s.*, u.nome, u.email, u.ativo, u.bloqueado_ate, p.nome as perfil, p.permissoes FROM sessoes s JOIN usuarios u ON s.usuario_id = u.id JOIN perfis p ON u.perfil_id = p.id WHERE s.token = ? AND s.ativo = TRUE AND s.data_expiracao > NOW()',
      [token]
    );

    if (sessao.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Sessão inválida ou expirada' 
      });
    }

    const usuario = sessao[0];

    // Verificar se o usuário está ativo
    if (!usuario.ativo) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário desativado' 
      });
    }

    // Verificar se o usuário não está bloqueado
    if (usuario.bloqueado_ate && new Date() < new Date(usuario.bloqueado_ate)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário temporariamente bloqueado' 
      });
    }

    // Adicionar informações do usuário ao request
    req.user = {
      id: usuario.usuario_id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      permissoes: JSON.parse(usuario.permissoes)
    };

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Token inválido' 
    });
  }
};

// Middleware de autorização
const authorize = (recurso, acao) => {
  return (req, res, next) => {
    const { permissoes } = req.user;
    
    if (!permissoes[recurso] || !permissoes[recurso].includes(acao)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado: permissão insuficiente' 
      });
    }

    next();
  };
};

// Middleware para verificar se é o dono do recurso (para vendedores)
const checkOwnership = (tabela, campo_usuario = 'criado_por') => {
  return async (req, res, next) => {
    try {
      const { user } = req;
      const recursoId = req.params.id;

      // Administradores e gerentes têm acesso total
      if (user.perfil === 'Administrador' || user.perfil === 'Gerente') {
        return next();
      }

      // Vendedores só podem acessar seus próprios recursos
      if (user.perfil === 'Vendedor') {
        const [recurso] = await db.execute(
          `SELECT ${campo_usuario} FROM ${tabela} WHERE id = ?`,
          [recursoId]
        );

        if (recurso.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Recurso não encontrado' 
          });
        }

        if (recurso[0][campo_usuario] !== user.id) {
          return res.status(403).json({ 
            success: false, 
            message: 'Acesso negado: você só pode acessar seus próprios recursos' 
          });
        }
      }

      next();
    } catch (error) {
      console.error('Erro na verificação de propriedade:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  };
};

// Função para gerar token JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Função para hash de senha
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Função para verificar senha
const verifyPassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  authenticate,
  authorize,
  checkOwnership,
  generateToken,
  hashPassword,
  verifyPassword,
  JWT_SECRET,
  JWT_EXPIRES_IN
}; 