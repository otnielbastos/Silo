const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { 
  authenticate, 
  authorize, 
  hashPassword, 
  verifyPassword 
} = require('../middleware/auth');

// Função helper para verificar permissões
const requirePermission = (recurso, acao) => {
  return [authenticate, authorize(recurso, acao)];
};

// Listar usuários (apenas administradores)
router.get('/', ...requirePermission('usuarios', 'listar'), async (req, res) => {
  try {
    const [usuarios] = await db.execute(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.ativo,
        u.ultimo_acesso,
        u.data_criacao,
        u.perfil_id,
        p.nome as perfil
      FROM usuarios u
      JOIN perfis p ON u.perfil_id = p.id
      ORDER BY u.nome
    `);

    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Listar perfis (para dropdown)
router.get('/profiles', ...requirePermission('usuarios', 'listar'), async (req, res) => {
  try {
    const [perfis] = await db.execute(`
      SELECT id, nome, ativo
      FROM perfis
      WHERE ativo = TRUE
      ORDER BY nome
    `);

    res.json(perfis);
  } catch (error) {
    console.error('Erro ao listar perfis:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Criar usuário
router.post('/', 
  ...requirePermission('usuarios', 'criar'),
  [
    body('nome').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
    body('perfil_id').isInt({ min: 1 }).withMessage('Perfil inválido')
  ],
  async (req, res) => {
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
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// Atualizar usuário
router.put('/:id',
  ...requirePermission('usuarios', 'editar'),
  [
    body('nome').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').optional().isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
    body('perfil_id').isInt({ min: 1 }).withMessage('Perfil inválido')
  ],
  async (req, res) => {
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
      const { nome, email, password, perfil_id } = req.body;

      // Verificar se o usuário existe
      const [usuarioExistente] = await db.execute(
        'SELECT id FROM usuarios WHERE id = ?',
        [id]
      );

      if (usuarioExistente.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar se o email já está em uso por outro usuário
      const [emailExistente] = await db.execute(
        'SELECT id FROM usuarios WHERE email = ? AND id != ?',
        [email.toLowerCase(), id]
      );

      if (emailExistente.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso por outro usuário'
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

      // Preparar dados para atualização
      let updateQuery = 'UPDATE usuarios SET nome = ?, email = ?, perfil_id = ?, atualizado_por = ? WHERE id = ?';
      let updateParams = [nome, email.toLowerCase(), perfil_id, req.user.id, id];

      // Se senha foi fornecida, incluir na atualização
      if (password) {
        const senhaHash = await hashPassword(password);
        updateQuery = 'UPDATE usuarios SET nome = ?, email = ?, senha_hash = ?, perfil_id = ?, atualizado_por = ? WHERE id = ?';
        updateParams = [nome, email.toLowerCase(), senhaHash, perfil_id, req.user.id, id];
      }

      // Atualizar usuário
      await db.execute(updateQuery, updateParams);

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// Alternar status do usuário (ativar/desativar)
router.patch('/:id/toggle-status',
  ...requirePermission('usuarios', 'editar'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar se o usuário não está tentando desativar a si mesmo
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Você não pode desativar sua própria conta'
        });
      }

      // Buscar usuário atual
      const [usuario] = await db.execute(
        'SELECT id, ativo FROM usuarios WHERE id = ?',
        [id]
      );

      if (usuario.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      const novoStatus = !usuario[0].ativo;

      // Atualizar status
      await db.execute(
        'UPDATE usuarios SET ativo = ?, atualizado_por = ? WHERE id = ?',
        [novoStatus, req.user.id, id]
      );

      res.json({
        success: true,
        message: `Usuário ${novoStatus ? 'ativado' : 'desativado'} com sucesso`
      });

    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

module.exports = router; 