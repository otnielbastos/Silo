const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Caminho absoluto para a pasta de uploads
        const uploadPath = path.join(__dirname, '..', 'uploads', 'produtos');
        // Criar pasta se não existir
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Gerar nome único para o arquivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

// Filtro de arquivos
const fileFilter = (req, file, cb) => {
    // Verificar tipo do arquivo
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo inválido. Apenas imagens são permitidas.'));
    }
};

// Configuração do multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

const produtosController = {
    // Listar todos os produtos
    async listarTodos(req, res) {
        try {
            const [produtos] = await pool.query('SELECT * FROM produtos');
            res.json(produtos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar produto por ID
    async buscarPorId(req, res) {
        try {
            const [produto] = await pool.query('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
            if (produto.length === 0) {
                return res.status(404).json({ message: 'Produto não encontrado' });
            }
            res.json(produto[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Upload de imagem
    uploadImagem: (req, res) => {
        // Usar single como middleware
        const uploadSingle = upload.single('imagem');

        uploadSingle(req, res, (err) => {
            if (err) {
                console.error('Erro no upload:', err);
                if (err instanceof multer.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return res.status(400).json({
                            error: 'Arquivo muito grande. Limite de 10MB.'
                        });
                    }
                    return res.status(400).json({
                        error: 'Erro no upload do arquivo: ' + err.message
                    });
                }
                return res.status(400).json({
                    error: err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    error: 'Nenhum arquivo foi enviado.'
                });
            }

            // Construir URL relativa para a imagem
            const imageUrl = `/uploads/produtos/${req.file.filename}`;
            
            // Log de sucesso
            console.log('Upload realizado com sucesso:', {
                originalname: req.file.originalname,
                filename: req.file.filename,
                path: req.file.path,
                url: imageUrl
            });

            res.json({ imageUrl });
        });
    },

    // Criar novo produto
    async criar(req, res) {
        const { 
            nome, 
            descricao, 
            preco_venda, 
            preco_custo, 
            quantidade_minima,
            quantidade_atual,
            categoria, 
            unidade_medida,
            tipo_produto,
            imagem_url 
        } = req.body;

        try {
            console.log('Criando produto com dados:', req.body);

            const [result] = await pool.query(
                `INSERT INTO produtos (
                    nome, descricao, preco_venda, preco_custo, 
                    quantidade_minima, quantidade_atual, categoria, 
                    unidade_medida, tipo_produto, imagem_url, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo')`,
                [
                    nome, descricao, preco_venda, preco_custo,
                    quantidade_minima, 0, categoria,
                    unidade_medida, tipo_produto, imagem_url
                ]
            );
            
            const productId = result.insertId;
            console.log('Produto criado com ID:', productId);

            const [novoProduto] = await pool.query('SELECT * FROM produtos WHERE id = ?', [productId]);
            res.status(201).json(novoProduto[0]);
        } catch (error) {
            console.error('Erro ao criar produto:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Atualizar produto
    async atualizar(req, res) {
        const { nome, descricao, preco_venda, preco_custo, quantidade_minima, categoria, unidade_medida, tipo_produto, imagem_url, status } = req.body;
        try {
            const [result] = await pool.query(
                'UPDATE produtos SET nome = ?, descricao = ?, preco_venda = ?, preco_custo = ?, quantidade_minima = ?, categoria = ?, unidade_medida = ?, tipo_produto = ?, imagem_url = ?, status = ? WHERE id = ?',
                [nome, descricao, preco_venda, preco_custo, quantidade_minima, categoria, unidade_medida, tipo_produto, imagem_url, status, req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Produto não encontrado' });
            }

            const [produtoAtualizado] = await pool.query('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
            res.json(produtoAtualizado[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Deletar produto
    async deletar(req, res) {
        try {
            // Verificar se existem dependências
            const [itensVenda] = await pool.query('SELECT id FROM itens_pedido WHERE produto_id = ?', [req.params.id]);
            if (itensVenda.length > 0) {
                return res.status(400).json({ message: 'Não é possível excluir o produto pois existem vendas relacionadas' });
            }

            // Buscar informações do produto para deletar a imagem
            const [produto] = await pool.query('SELECT imagem_url FROM produtos WHERE id = ?', [req.params.id]);
            if (produto.length > 0 && produto[0].imagem_url) {
                const imagePath = path.join(__dirname, '..', produto[0].imagem_url);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            // Deletar registro do estoque
            await pool.query('DELETE FROM estoque WHERE produto_id = ?', [req.params.id]);
            
            const [result] = await pool.query('DELETE FROM produtos WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Produto não encontrado' });
            }
            res.json({ message: 'Produto deletado com sucesso' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Listar produtos para venda (produção própria e revenda)
    async listarParaVenda(req, res) {
        try {
            console.log('Buscando produtos para venda...');
            
            const [produtos] = await pool.query(`
                SELECT 
                    id,
                    nome,
                    descricao,
                    preco_venda,
                    preco_custo,
                    quantidade_minima,
                    quantidade_atual,
                    categoria,
                    unidade_medida,
                    tipo_produto,
                    imagem_url,
                    status
                FROM produtos 
                WHERE status = 'ativo' 
                AND tipo_produto IN ('producao_propria', 'revenda')
                ORDER BY nome
            `);
            
            console.log(`Encontrados ${produtos.length} produtos para venda`);
            
            // Converter valores numéricos e garantir que não sejam null/undefined
            const produtosFormatados = produtos.map(produto => ({
                id: parseInt(produto.id) || 0,
                nome: produto.nome || '',
                descricao: produto.descricao || '',
                preco_venda: parseFloat(produto.preco_venda) || 0,
                preco_custo: parseFloat(produto.preco_custo) || 0,
                quantidade_minima: parseInt(produto.quantidade_minima) || 0,
                quantidade_atual: parseInt(produto.quantidade_atual) || 0,
                categoria: produto.categoria || '',
                unidade_medida: produto.unidade_medida || 'un',
                tipo_produto: produto.tipo_produto || '',
                imagem_url: produto.imagem_url || null,
                status: produto.status || 'ativo'
            }));
            
            console.log('Produtos formatados:', produtosFormatados);
            res.json(produtosFormatados);
        } catch (error) {
            console.error('Erro ao buscar produtos para venda:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = produtosController; 