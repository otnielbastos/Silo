const pool = require('../config/database');

const estoqueController = {
    // Listar todas as movimentações
    async listarMovimentacoes(req, res) {
        try {
            const [movimentacoes] = await pool.query(`
                SELECT 
                    m.*,
                    p.nome as produto_nome,
                    p.unidade_medida,
                    p.categoria
                FROM movimentacoes_estoque m
                INNER JOIN produtos p ON m.produto_id = p.id
                ORDER BY m.data_movimentacao DESC
            `);
            res.json(movimentacoes);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar movimentação por ID
    async buscarMovimentacaoPorId(req, res) {
        try {
            const [movimentacao] = await pool.query(`
                SELECT 
                    m.*,
                    p.nome as produto_nome,
                    p.unidade_medida,
                    p.categoria
                FROM movimentacoes_estoque m
                INNER JOIN produtos p ON m.produto_id = p.id
                WHERE m.id = ?
            `, [req.params.id]);

            if (movimentacao.length === 0) {
                return res.status(404).json({ message: 'Movimentação não encontrada' });
            }
            res.json(movimentacao[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Criar nova movimentação
    async criarMovimentacao(req, res) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const { 
                produto_id, 
                tipo_movimento, 
                quantidade, 
                motivo, 
                valor,
                documento_referencia, 
                data_fabricacao,
                data_validade,
                observacao 
            } = req.body;

            console.log('Dados recebidos:', req.body);

            // Verificar se o produto existe
            const [produto] = await connection.query('SELECT * FROM produtos WHERE id = ?', [produto_id]);
            if (produto.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Produto não encontrado' });
            }

            // Lógica para calcular data de validade automática para nhoques
            let dataValidadeFinal = data_validade;
            
            if (motivo === 'Produção' && data_fabricacao) {
                const produtoNome = produto[0].nome.toLowerCase();
                if (produtoNome.includes('nhoque')) {
                    // Calcular automaticamente 3 meses a partir da data de fabricação
                    const fabricacao = new Date(data_fabricacao);
                    const validade = new Date(fabricacao);
                    validade.setMonth(validade.getMonth() + 3);
                    dataValidadeFinal = validade.toISOString().split('T')[0];
                    
                    console.log(`Validade automática calculada para nhoque: ${dataValidadeFinal}`);
                }
            }

            // Calcular nova quantidade
            const quantidadeAtual = produto[0].quantidade_atual || 0;
            let novaQuantidade;

            if (tipo_movimento === 'entrada') {
                novaQuantidade = quantidadeAtual + quantidade;
            } else if (tipo_movimento === 'saida') {
                if (quantidadeAtual < quantidade) {
                    await connection.rollback();
                    return res.status(400).json({ 
                        message: `Estoque insuficiente. Disponível: ${quantidadeAtual}, Solicitado: ${quantidade}` 
                    });
                }
                novaQuantidade = quantidadeAtual - quantidade;
            } else { // ajuste
                novaQuantidade = quantidade;
            }

            // Inserir movimentação
            const [resultMovimentacao] = await connection.query(`
                INSERT INTO movimentacoes_estoque (
                    produto_id, tipo_movimento, quantidade, motivo, valor,
                    documento_referencia, data_fabricacao, data_validade, observacao
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [produto_id, tipo_movimento, quantidade, motivo, valor, documento_referencia, data_fabricacao, dataValidadeFinal, observacao]);

            // Atualizar quantidade no produto
            await connection.query(
                'UPDATE produtos SET quantidade_atual = ? WHERE id = ?',
                [novaQuantidade, produto_id]
            );

            // Atualizar ou inserir na tabela estoque
            await connection.query(`
                INSERT INTO estoque (produto_id, quantidade_atual) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE 
                quantidade_atual = ?, ultima_atualizacao = CURRENT_TIMESTAMP
            `, [produto_id, novaQuantidade, novaQuantidade]);

            await connection.commit();

            // Buscar a movimentação criada com dados do produto
            const [novaMovimentacao] = await connection.query(`
                SELECT 
                    m.*,
                    p.nome as produto_nome,
                    p.unidade_medida,
                    p.categoria,
                    p.quantidade_atual
                FROM movimentacoes_estoque m
                INNER JOIN produtos p ON m.produto_id = p.id
                WHERE m.id = ?
            `, [resultMovimentacao.insertId]);

            res.status(201).json(novaMovimentacao[0]);

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao criar movimentação:', error);
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Atualizar movimentação
    async atualizarMovimentacao(req, res) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const { 
                produto_id, 
                tipo_movimento, 
                quantidade, 
                motivo, 
                valor,
                documento_referencia, 
                data_fabricacao,
                data_validade,
                observacao 
            } = req.body;

            // Buscar movimentação atual
            const [movimentacaoAtual] = await connection.query(
                'SELECT * FROM movimentacoes_estoque WHERE id = ?', 
                [req.params.id]
            );

            if (movimentacaoAtual.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Movimentação não encontrada' });
            }

            // Buscar produto
            const [produto] = await connection.query('SELECT * FROM produtos WHERE id = ?', [produto_id]);
            if (produto.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Produto não encontrado' });
            }

            // Lógica para calcular data de validade automática para nhoques
            let dataValidadeFinal = data_validade;
            
            if (motivo === 'Produção' && data_fabricacao) {
                const produtoNome = produto[0].nome.toLowerCase();
                if (produtoNome.includes('nhoque')) {
                    // Calcular automaticamente 3 meses a partir da data de fabricação
                    const fabricacao = new Date(data_fabricacao);
                    const validade = new Date(fabricacao);
                    validade.setMonth(validade.getMonth() + 3);
                    dataValidadeFinal = validade.toISOString().split('T')[0];
                    
                    console.log(`Validade automática atualizada para nhoque: ${dataValidadeFinal}`);
                }
            }

            const movAntiga = movimentacaoAtual[0];
            const quantidadeAtualProduto = produto[0].quantidade_atual || 0;

            // Reverter movimentação antiga
            let quantidadeRevertida;
            if (movAntiga.tipo_movimento === 'entrada') {
                quantidadeRevertida = quantidadeAtualProduto - movAntiga.quantidade;
            } else if (movAntiga.tipo_movimento === 'saida') {
                quantidadeRevertida = quantidadeAtualProduto + movAntiga.quantidade;
            } else { // era ajuste, precisamos conhecer o valor anterior
                quantidadeRevertida = quantidadeAtualProduto; // Mantém o atual para ajustes
            }

            // Aplicar nova movimentação
            let novaQuantidade;
            if (tipo_movimento === 'entrada') {
                novaQuantidade = quantidadeRevertida + quantidade;
            } else if (tipo_movimento === 'saida') {
                if (quantidadeRevertida < quantidade) {
                    await connection.rollback();
                    return res.status(400).json({ 
                        message: `Estoque insuficiente após reversão. Disponível: ${quantidadeRevertida}, Solicitado: ${quantidade}` 
                    });
                }
                novaQuantidade = quantidadeRevertida - quantidade;
            } else { // ajuste
                novaQuantidade = quantidade;
            }

            // Atualizar movimentação
            await connection.query(`
                UPDATE movimentacoes_estoque 
                SET produto_id = ?, tipo_movimento = ?, quantidade = ?, motivo = ?, valor = ?,
                    documento_referencia = ?, data_fabricacao = ?, data_validade = ?, observacao = ?
                WHERE id = ?
            `, [produto_id, tipo_movimento, quantidade, motivo, valor, documento_referencia, data_fabricacao, dataValidadeFinal, observacao, req.params.id]);

            // Atualizar quantidade no produto
            await connection.query(
                'UPDATE produtos SET quantidade_atual = ? WHERE id = ?',
                [novaQuantidade, produto_id]
            );

            // Atualizar tabela estoque
            await connection.query(`
                UPDATE estoque 
                SET quantidade_atual = ?, ultima_atualizacao = CURRENT_TIMESTAMP 
                WHERE produto_id = ?
            `, [novaQuantidade, produto_id]);

            await connection.commit();

            // Buscar movimentação atualizada
            const [movimentacaoAtualizada] = await connection.query(`
                SELECT 
                    m.*,
                    p.nome as produto_nome,
                    p.unidade_medida,
                    p.categoria,
                    p.quantidade_atual
                FROM movimentacoes_estoque m
                INNER JOIN produtos p ON m.produto_id = p.id
                WHERE m.id = ?
            `, [req.params.id]);

            res.json(movimentacaoAtualizada[0]);

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao atualizar movimentação:', error);
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Deletar movimentação
    async deletarMovimentacao(req, res) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Buscar movimentação
            const [movimentacao] = await connection.query(
                'SELECT * FROM movimentacoes_estoque WHERE id = ?', 
                [req.params.id]
            );

            if (movimentacao.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Movimentação não encontrada' });
            }

            const mov = movimentacao[0];

            // Buscar produto
            const [produto] = await connection.query('SELECT quantidade_atual FROM produtos WHERE id = ?', [mov.produto_id]);
            const quantidadeAtual = produto[0].quantidade_atual || 0;

            // Calcular quantidade após reversão da movimentação
            let novaQuantidade;
            if (mov.tipo_movimento === 'entrada') {
                novaQuantidade = quantidadeAtual - mov.quantidade;
                if (novaQuantidade < 0) {
                    await connection.rollback();
                    return res.status(400).json({ 
                        message: 'Não é possível excluir esta movimentação pois resultaria em estoque negativo' 
                    });
                }
            } else if (mov.tipo_movimento === 'saida') {
                novaQuantidade = quantidadeAtual + mov.quantidade;
            } else { // ajuste - mais complexo, por simplicidade não permitir exclusão
                await connection.rollback();
                return res.status(400).json({ 
                    message: 'Não é possível excluir movimentações de ajuste' 
                });
            }

            // Deletar movimentação
            await connection.query('DELETE FROM movimentacoes_estoque WHERE id = ?', [req.params.id]);

            // Atualizar quantidade no produto
            await connection.query(
                'UPDATE produtos SET quantidade_atual = ? WHERE id = ?',
                [novaQuantidade, mov.produto_id]
            );

            // Atualizar tabela estoque
            await connection.query(`
                UPDATE estoque 
                SET quantidade_atual = ?, ultima_atualizacao = CURRENT_TIMESTAMP 
                WHERE produto_id = ?
            `, [novaQuantidade, mov.produto_id]);

            await connection.commit();
            res.json({ message: 'Movimentação excluída com sucesso' });

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao deletar movimentação:', error);
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Buscar produtos com estoque baixo
    async buscarEstoqueBaixo(req, res) {
        try {
            const [produtos] = await pool.query(`
                SELECT id, nome, categoria, unidade_medida, quantidade_atual, quantidade_minima, tipo_produto
                FROM produtos 
                WHERE quantidade_atual <= quantidade_minima AND status = 'ativo'
                ORDER BY categoria, nome
            `);
            res.json(produtos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Relatório de estoque
    async relatorioEstoque(req, res) {
        try {
            const [produtos] = await pool.query(`
                SELECT 
                    p.id,
                    p.nome,
                    p.categoria,
                    p.unidade_medida,
                    p.quantidade_atual,
                    p.quantidade_minima,
                    p.preco_custo,
                    p.preco_venda,
                    p.tipo_produto,
                    (p.quantidade_atual * p.preco_custo) as valor_estoque_custo,
                    (p.quantidade_atual * p.preco_venda) as valor_estoque_venda,
                    CASE 
                        WHEN p.quantidade_atual <= p.quantidade_minima THEN 'BAIXO'
                        WHEN p.quantidade_atual <= (p.quantidade_minima * 2) THEN 'MEDIO'
                        ELSE 'NORMAL'
                    END as status_estoque
                FROM produtos p
                WHERE p.status = 'ativo'
                ORDER BY p.categoria, p.nome
            `);

            const resumo = {
                total_produtos: produtos.length,
                produtos_estoque_baixo: produtos.filter(p => p.status_estoque === 'BAIXO').length,
                valor_total_custo: produtos.reduce((sum, p) => sum + (parseFloat(p.valor_estoque_custo) || 0), 0),
                valor_total_venda: produtos.reduce((sum, p) => sum + (parseFloat(p.valor_estoque_venda) || 0), 0)
            };

            res.json({
                produtos,
                resumo
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = estoqueController; 