const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');

// Rotas para pedidos
router.get('/', pedidosController.listar);
router.get('/buscar', pedidosController.buscar);
router.get('/estatisticas', pedidosController.estatisticas);
router.get('/pagamentos-pendentes', pedidosController.pagamentosPendentes);
router.get('/nao-entregues', pedidosController.naoEntregues);
router.get('/:id', pedidosController.buscarPorId);
router.post('/', pedidosController.criar);
router.put('/:id', pedidosController.atualizar);
router.patch('/:id/cancelar', pedidosController.cancelar);
router.patch('/:id/pagamento', pedidosController.atualizarPagamento);
router.patch('/:id/entregar', pedidosController.marcarEntregue);

module.exports = router; 