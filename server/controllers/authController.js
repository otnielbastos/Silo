const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { 
  generateToken, 
  hashPassword, 
  verifyPassword 
} = require('../middleware/auth');

// Middleware de validação para login
const validateLogin = [
  body('email').isEmail().withMessage('Email inválido'),
  // Aceitar tanto 'senha' (frontend pt-br) quanto 'password' (padrão)
  body('senha').optional().isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('password').optional().isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  // Validação customizada para garantir que pelo menos um dos campos existe
  body().custom((value, { req }) => {
    if (!req.body.senha && !req.body.password) {
      throw new Error('Senha é obrigatória');
    }
    return true;
  })
];

// Middleware de validação para registro
const validateRegister = [
  body('nome').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('perfil_id').isInt({ min: 1 }).withMessage('Perfil inválido')
];

// Função para registrar tentativa de login
const registrarTentativaLogin = async (email, ip, sucesso, motivo, userAgent) => {
  try {
    await db.execute(
      'INSERT INTO tentativas_login (email, ip_address, sucesso, motivo, user_agent) VALUES (?, ?, ?, ?, ?)',
      [email, ip, sucesso, motivo, userAgent]
    );
  } catch (error) {
    console.error('Erro ao registrar tentativa de login:', error);
  }
};

// Função para registrar auditoria
const registrarAuditoria = async (usuarioId, acao, tabela, registroId, dadosAntigos, dadosNovos, ip, userAgent) => {
  try {
    await db.execute(
      'INSERT INTO auditoria (usuario_id, acao, tabela, registro_id, dados_antigos, dados_novos, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [usuarioId, acao, tabela, registroId, JSON.stringify(dadosAntigos), JSON.stringify(dadosNovos), ip, userAgent]
    );
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
};

// Login
const login = async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { email, password, senha } = req.body;
    // Usar 'senha' se disponível, senão usar 'password'
    const senhaInput = senha || password;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Verificar se o usuário existe
    const [usuarios] = await db.execute(
      'SELECT u.*, p.nome as perfil, p.permissoes FROM usuarios u JOIN perfis p ON u.perfil_id = p.id WHERE u.email = ?',
      [email.toLowerCase()]
    );

    if (usuarios.length === 0) {
      await registrarTentativaLogin(email, ip, false, 'Usuário não encontrado', userAgent);
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    const usuario = usuarios[0];

    // Verificar se o usuário está ativo
    if (!usuario.ativo) {
      await registrarTentativaLogin(email, ip, false, 'Usuário desativado', userAgent);
      return res.status(401).json({
        success: false,
        message: 'Usuário desativado'
      });
    }

    // Verificar se o usuário não está bloqueado
    if (usuario.bloqueado_ate && new Date() < new Date(usuario.bloqueado_ate)) {
      await registrarTentativaLogin(email, ip, false, 'Usuário bloqueado', userAgent);
      return res.status(401).json({
        success: false,
        message: 'Usuário temporariamente bloqueado'
      });
    }

    // Verificar senha
    // Usar apenas senha_hash, nunca o campo senha em texto plano
    const senhaHashParaComparar = usuario.senha_hash;
    
    if (!senhaHashParaComparar) {
      console.error('ERRO: Usuário não possui senha_hash!');
      return res.status(500).json({
        success: false,
        message: 'Erro de configuração do usuário'
      });
    }
    
    const senhaValida = await verifyPassword(senhaInput, senhaHashParaComparar);
    
    if (!senhaValida) {
      // Incrementar tentativas de login
      await db.execute(
        'UPDATE usuarios SET tentativas_login = tentativas_login + 1 WHERE id = ?',
        [usuario.id]
      );

      // Bloquear usuário após 5 tentativas
      if (usuario.tentativas_login >= 4) {
        const bloqueioAte = new Date();
        bloqueioAte.setMinutes(bloqueioAte.getMinutes() + 30); // Bloquear por 30 minutos
        
        await db.execute(
          'UPDATE usuarios SET bloqueado_ate = ? WHERE id = ?',
          [bloqueioAte, usuario.id]
        );
      }

      await registrarTentativaLogin(email, ip, false, 'Senha incorreta', userAgent);
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    // Reset tentativas de login em caso de sucesso
    await db.execute(
      'UPDATE usuarios SET tentativas_login = 0, bloqueado_ate = NULL, ultimo_acesso = NOW() WHERE id = ?',
      [usuario.id]
    );

    // Gerar token JWT
    const token = generateToken(usuario.id);

    // Criar sessão
    const dataExpiracao = new Date();
    dataExpiracao.setHours(dataExpiracao.getHours() + 8); // 8 horas

    await db.execute(
      'INSERT INTO sessoes (usuario_id, token, ip_address, user_agent, data_expiracao) VALUES (?, ?, ?, ?, ?)',
      [usuario.id, token, ip, userAgent, dataExpiracao]
    );

    await registrarTentativaLogin(email, ip, true, 'Login bem-sucedido', userAgent);
    await registrarAuditoria(usuario.id, 'LOGIN', 'usuarios', usuario.id, null, { ip, userAgent }, ip, userAgent);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token,
        user: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          permissoes: JSON.parse(usuario.permissoes)
        }
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      // Desativar sessão
      await db.execute(
        'UPDATE sessoes SET ativo = FALSE WHERE token = ?',
        [token]
      );

      await registrarAuditoria(req.user.id, 'LOGOUT', 'usuarios', req.user.id, null, null, req.ip, req.get('User-Agent'));
    }

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Registrar usuário (apenas para administradores)
const register = async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { nome, email, password, perfil_id } = req.body;

    // Verificar se o email já existe
    const [usuarioExistente] = await db.execute(
      'SELECT id FROM usuarios WHERE email = ?',
      [email.toLowerCase()]
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email já está em uso'
      });
    }

    // Verificar se o perfil existe
    const [perfil] = await db.execute(
      'SELECT id FROM perfis WHERE id = ? AND ativo = TRUE',
      [perfil_id]
    );

    if (perfil.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Perfil inválido'
      });
    }

    // Hash da senha
    const senhaHash = await hashPassword(password);

    // Criar usuário
    const [resultado] = await db.execute(
      'INSERT INTO usuarios (nome, email, senha_hash, perfil_id, ativo, criado_por) VALUES (?, ?, ?, ?, TRUE, ?)',
      [nome, email.toLowerCase(), senhaHash, perfil_id, req.user.id]
    );

    await registrarAuditoria(
      req.user.id, 
      'CREATE', 
      'usuarios', 
      resultado.insertId, 
      null, 
      { nome, email: email.toLowerCase(), perfil_id }, 
      req.ip, 
      req.get('User-Agent')
    );

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        id: resultado.insertId,
        nome,
        email: email.toLowerCase(),
        perfil_id
      }
    });

  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Verificar token (para frontend)
const verifyToken = async (req, res) => {
  res.json({
    success: true,
    message: 'Token válido',
    data: {
      user: {
        id: req.user.id,
        nome: req.user.nome,
        email: req.user.email,
        perfil: req.user.perfil,
        permissoes: req.user.permissoes
      }
    }
  });
};

// Alterar senha
const changePassword = async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;

    if (!senha_atual || !nova_senha) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (nova_senha.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha deve ter pelo menos 6 caracteres'
      });
    }

    // Buscar senha atual do usuário
    const [usuario] = await db.execute(
      'SELECT senha_hash, senha FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (usuario.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar senha atual
    const senhaValida = await verifyPassword(senha_atual, usuario[0].senha_hash || usuario[0].senha);
    
    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Hash da nova senha
    const novaSenhaHash = await hashPassword(nova_senha);

    // Atualizar senha
    await db.execute(
      'UPDATE usuarios SET senha_hash = ?, atualizado_por = ? WHERE id = ?',
      [novaSenhaHash, req.user.id, req.user.id]
    );

    await registrarAuditoria(
      req.user.id, 
      'UPDATE_PASSWORD', 
      'usuarios', 
      req.user.id, 
      null, 
      { acao: 'Alteração de senha' }, 
      req.ip, 
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  login,
  logout,
  register,
  verifyToken,
  changePassword,
  validateLogin,
  validateRegister
}; 