const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoqueController');

// Listar todas as movimentações
router.get('/movimentacoes', estoqueController.listarMovimentacoes);

// Buscar movimentação por ID
router.get('/movimentacoes/:id', estoqueController.buscarMovimentacaoPorId);

// Criar nova movimentação
router.post('/movimentacoes', estoqueController.criarMovimentacao);

// Atualizar movimentação
router.put('/movimentacoes/:id', estoqueController.atualizarMovimentacao);

// Deletar movimentação
router.delete('/movimentacoes/:id', estoqueController.deletarMovimentacao);

// Buscar produtos com estoque baixo
router.get('/estoque-baixo', estoqueController.buscarEstoqueBaixo);

// Relatório completo de estoque
router.get('/relatorio', estoqueController.relatorioEstoque);

module.exports = router; 