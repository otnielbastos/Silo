const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');

// Listar todos os clientes
router.get('/', clientesController.listar);

// Buscar clientes por termo
router.get('/buscar', clientesController.buscar);

// Estatísticas de clientes  
router.get('/estatisticas', clientesController.estatisticas);

// Buscar cliente por ID
router.get('/:id', clientesController.buscarPorId);

// Criar novo cliente
router.post('/', clientesController.criar);

// Atualizar cliente
router.put('/:id', clientesController.atualizar);

// Deletar cliente
router.delete('/:id', clientesController.deletar);

module.exports = router; 