const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { hashPassword } = require('../middleware/auth');

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

// Middleware de validação para criação de usuário
const validateUser = [
  body('nome').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('perfil_id').isInt({ min: 1 }).withMessage('Perfil inválido')
];

// Middleware de validação para atualização de usuário
const validateUserUpdate = [
  body('nome').optional().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('perfil_id').optional().isInt({ min: 1 }).withMessage('Perfil inválido')
];

// Listar usuários
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const perfil = req.query.perfil || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.nome, u.email, u.ativo, u.ultimo_acesso, u.data_criacao, 
             p.nome as perfil, p.id as perfil_id,
             c.nome as criado_por_nome
      FROM usuarios u 
      JOIN perfis p ON u.perfil_id = p.id 
      LEFT JOIN usuarios c ON u.criado_por = c.id
      WHERE 1=1
    `;
    
    const params = [];

    if (search) {
      query += ' AND (u.nome LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (perfil) {
      query += ' AND p.nome = ?';
      params.push(perfil);
    }

    if (status === 'ativo') {
      query += ' AND u.ativo = TRUE';
    } else if (status === 'inativo') {
      query += ' AND u.ativo = FALSE';
    }

    // Contar total de registros
    const countQuery = query.replace('SELECT u.id, u.nome, u.email, u.ativo, u.ultimo_acesso, u.data_criacao, p.nome as perfil, p.id as perfil_id, c.nome as criado_por_nome', 'SELECT COUNT(*) as total');
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;

    // Adicionar ordenação e paginação
    query += ' ORDER BY u.data_criacao DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [usuarios] = await db.execute(query, params);

    res.json({
      success: true,
      data: {
        usuarios,
        pagination: {
          current_page: page,
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Buscar usuário por ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [usuarios] = await db.execute(`
      SELECT u.id, u.nome, u.email, u.ativo, u.ultimo_acesso, u.data_criacao, u.data_atualizacao,
             p.nome as perfil, p.id as perfil_id,
             c.nome as criado_por_nome, c.id as criado_por,
             a.nome as atualizado_por_nome, a.id as atualizado_por
      FROM usuarios u 
      JOIN perfis p ON u.perfil_id = p.id 
      LEFT JOIN usuarios c ON u.criado_por = c.id
      LEFT JOIN usuarios a ON u.atualizado_por = a.id
      WHERE u.id = ?
    `, [id]);

    if (usuarios.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      data: usuarios[0]
    });

  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Criar usuário
const createUser = async (req, res) => {
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
      'SELECT id, nome FROM perfis WHERE id = ? AND ativo = TRUE',
      [perfil_id]
    );

    if (perfil.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Perfil inválido'
      });
    }

    // Gerar senha padrão se não fornecida
    const senhaFinal = password || 'usuario123';
    const senhaHash = await hashPassword(senhaFinal);

    // Criar usuário
    const [resultado] = await db.execute(`
      INSERT INTO usuarios (nome, email, senha_hash, perfil_id, ativo, criado_por, data_criacao) 
      VALUES (?, ?, ?, ?, TRUE, ?, NOW())
    `, [nome, email.toLowerCase(), senhaHash, perfil_id, req.user.id]);

    const novoUsuario = {
      id: resultado.insertId,
      nome,
      email: email.toLowerCase(),
      perfil_id,
      perfil: perfil[0].nome,
      ativo: true
    };

    await registrarAuditoria(
      req.user.id, 
      'CREATE', 
      'usuarios', 
      resultado.insertId, 
      null, 
      novoUsuario, 
      req.ip, 
      req.get('User-Agent')
    );

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: novoUsuario
    });

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar usuário
const updateUser = async (req, res) => {
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

    const { id } = req.params;
    const { nome, email, perfil_id, ativo } = req.body;

    // Buscar usuário atual
    const [usuarioAtual] = await db.execute(
      'SELECT * FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarioAtual.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const dadosAntigos = usuarioAtual[0];

    // Verificar se o email já existe (exceto para o próprio usuário)
    if (email && email.toLowerCase() !== dadosAntigos.email) {
      const [emailExists] = await db.execute(
        'SELECT id FROM usuarios WHERE email = ? AND id != ?',
        [email.toLowerCase(), id]
      );

      if (emailExists.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso'
        });
      }
    }

    // Verificar se o perfil existe
    if (perfil_id) {
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
    }

    // Construir query de atualização dinamicamente
    const campos = [];
    const valores = [];

    if (nome) {
      campos.push('nome = ?');
      valores.push(nome);
    }

    if (email) {
      campos.push('email = ?');
      valores.push(email.toLowerCase());
    }

    if (perfil_id) {
      campos.push('perfil_id = ?');
      valores.push(perfil_id);
    }

    if (typeof ativo === 'boolean') {
      campos.push('ativo = ?');
      valores.push(ativo);
    }

    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum campo para atualizar'
      });
    }

    campos.push('atualizado_por = ?', 'data_atualizacao = NOW()');
    valores.push(req.user.id, id);

    const query = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
    await db.execute(query, valores);

    // Buscar usuário atualizado
    const [usuarioAtualizado] = await db.execute(`
      SELECT u.id, u.nome, u.email, u.ativo, u.ultimo_acesso, u.data_criacao, u.data_atualizacao,
             p.nome as perfil, p.id as perfil_id
      FROM usuarios u 
      JOIN perfis p ON u.perfil_id = p.id 
      WHERE u.id = ?
    `, [id]);

    await registrarAuditoria(
      req.user.id, 
      'UPDATE', 
      'usuarios', 
      parseInt(id), 
      dadosAntigos, 
      usuarioAtualizado[0], 
      req.ip, 
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: usuarioAtualizado[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Desativar usuário (soft delete)
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Não permitir desativar a própria conta
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode desativar sua própria conta'
      });
    }

    // Buscar usuário atual
    const [usuarioAtual] = await db.execute(
      'SELECT * FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarioAtual.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Desativar usuário
    await db.execute(
      'UPDATE usuarios SET ativo = FALSE, atualizado_por = ?, data_atualizacao = NOW() WHERE id = ?',
      [req.user.id, id]
    );

    // Desativar todas as sessões do usuário
    await db.execute(
      'UPDATE sessoes SET ativo = FALSE WHERE usuario_id = ?',
      [id]
    );

    await registrarAuditoria(
      req.user.id, 
      'DEACTIVATE', 
      'usuarios', 
      parseInt(id), 
      usuarioAtual[0], 
      { ativo: false }, 
      req.ip, 
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Usuário desativado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Reativar usuário
const reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar usuário atual
    const [usuarioAtual] = await db.execute(
      'SELECT * FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarioAtual.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Reativar usuário
    await db.execute(
      'UPDATE usuarios SET ativo = TRUE, tentativas_login = 0, bloqueado_ate = NULL, atualizado_por = ?, data_atualizacao = NOW() WHERE id = ?',
      [req.user.id, id]
    );

    await registrarAuditoria(
      req.user.id, 
      'REACTIVATE', 
      'usuarios', 
      parseInt(id), 
      usuarioAtual[0], 
      { ativo: true }, 
      req.ip, 
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Usuário reativado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao reativar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Resetar senha do usuário
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const novaSenha = 'usuario123'; // Senha padrão

    // Buscar usuário
    const [usuario] = await db.execute(
      'SELECT nome, email FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuario.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Hash da nova senha
    const senhaHash = await hashPassword(novaSenha);

    // Atualizar senha
    await db.execute(
      'UPDATE usuarios SET senha_hash = ?, tentativas_login = 0, bloqueado_ate = NULL, atualizado_por = ?, data_atualizacao = NOW() WHERE id = ?',
      [senhaHash, req.user.id, id]
    );

    // Desativar todas as sessões do usuário
    await db.execute(
      'UPDATE sessoes SET ativo = FALSE WHERE usuario_id = ?',
      [id]
    );

    await registrarAuditoria(
      req.user.id, 
      'RESET_PASSWORD', 
      'usuarios', 
      parseInt(id), 
      null, 
      { acao: 'Reset de senha' }, 
      req.ip, 
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: `Senha do usuário ${usuario[0].nome} foi resetada para: ${novaSenha}`
    });

  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Listar perfis disponíveis
const getPerfis = async (req, res) => {
  try {
    const [perfis] = await db.execute(
      'SELECT id, nome, descricao FROM perfis WHERE ativo = TRUE ORDER BY nome'
    );

    res.json({
      success: true,
      data: perfis
    });

  } catch (error) {
    console.error('Erro ao buscar perfis:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  resetUserPassword,
  getPerfis,
  validateUser,
  validateUserUpdate
}; 