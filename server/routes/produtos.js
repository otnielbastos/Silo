const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtosController');

// Listar todos os produtos
router.get('/', produtosController.listarTodos);

// Listar produtos para venda (produção própria e revenda)
router.get('/venda', produtosController.listarParaVenda);

// Upload de imagem
router.post('/upload', produtosController.uploadImagem);

// Buscar produto por ID
router.get('/:id', produtosController.buscarPorId);

// Criar novo produto
router.post('/', produtosController.criar);

// Atualizar produto
router.put('/:id', produtosController.atualizar);

// Deletar produto
router.delete('/:id', produtosController.deletar);

module.exports = router; 