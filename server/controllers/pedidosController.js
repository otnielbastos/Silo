const pool = require('../config/database');

// Função para normalizar status
const normalizeStatus = (status) => {
    if (!status || status.trim() === '') {
        return 'pendente';
    }
    return status.toLowerCase().trim();
};

// Função para validar status
const isValidStatus = (status) => {
    const validStatuses = [
        'pendente', 'aprovado', 'aguardando_producao', 'em_preparo', 
        'em_separacao', 'produzido', 'pronto', 'em_entrega', 
        'entregue', 'concluido', 'cancelado'
    ];
    return validStatuses.includes(normalizeStatus(status));
};

// Função para processar entrada automática de estoque (quando produção é finalizada)
const processarEntradaAutomaticaEstoque = async (connection, pedidoId, itens) => {
    try {
        console.log(`Processando entrada automática de estoque para encomenda - Pedido ${pedidoId}`);
        
        const produtosAfetados = [];
        
        for (const item of itens) {
            const { produto_id, quantidade } = item;
            
            // Inserir movimentação de entrada específica para estoque de encomenda
            await connection.query(`
                INSERT INTO movimentacoes_estoque 
                (produto_id, tipo_movimento, quantidade, motivo, documento_referencia, pedido_id, tipo_operacao, tipo_estoque, data_fabricacao, observacao)
                VALUES (?, 'entrada', ?, 'Produção finalizada - Encomenda', ?, ?, 'automatica', 'encomenda', CURDATE(), 'Entrada automática por conclusão de produção - ESTOQUE DE ENCOMENDA')
            `, [produto_id, quantidade, `#${pedidoId}`, pedidoId]);
            
            // Inserir ou atualizar registro na tabela estoque com separação por tipo
            await connection.query(`
                INSERT INTO estoque (produto_id, quantidade_atual, quantidade_pronta_entrega, quantidade_encomenda, ultima_atualizacao)
                VALUES (?, ?, 0, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                quantidade_atual = quantidade_atual + ?,
                quantidade_encomenda = quantidade_encomenda + ?,
                ultima_atualizacao = NOW()
            `, [produto_id, quantidade, quantidade, quantidade, quantidade]);
            
            produtosAfetados.push({
                produto_id,
                quantidade,
                operacao: 'entrada',
                tipo_estoque: 'encomenda'
            });
        }
        
        // Log da operação
        await connection.query(`
            INSERT INTO log_operacoes_automaticas 
            (pedido_id, tipo_operacao, status_anterior, status_novo, produtos_afetados, observacoes)
            VALUES (?, 'entrada_estoque', 'em_preparo', 'produzido', ?, 'Entrada automática por conclusão da produção - ESTOQUE DE ENCOMENDA')
        `, [pedidoId, JSON.stringify(produtosAfetados)]);
        
        console.log(`Entrada automática processada com sucesso para pedido ${pedidoId}`);
        return true;
        
    } catch (error) {
        console.error('Erro ao processar entrada automática:', error);
        throw error;
    }
};

// Função para processar saída automática de estoque (quando entrega é realizada)
const processarSaidaAutomaticaEstoque = async (connection, pedidoId, itens, tipoPedido) => {
    try {
        console.log(`Processando saída automática de estoque para pedido ${pedidoId} (tipo: ${tipoPedido})`);
        
        const produtosAfetados = [];
        const tipoEstoque = tipoPedido === 'encomenda' ? 'encomenda' : 'pronta_entrega';
        
        for (const item of itens) {
            const { produto_id, quantidade } = item;
            
            // Verificar se há estoque suficiente no tipo correto
            const [estoque] = await connection.query(`
                SELECT e.*, p.nome as produto_nome 
                FROM estoque e
                INNER JOIN produtos p ON e.produto_id = p.id
                WHERE e.produto_id = ?
            `, [produto_id]);
            
            if (estoque.length === 0) {
                throw new Error(`Produto ${produto_id} não encontrado no estoque`);
            }
            
            const estoqueItem = estoque[0];
            const quantidadeDisponivel = tipoPedido === 'encomenda' 
                ? estoqueItem.quantidade_encomenda 
                : estoqueItem.quantidade_pronta_entrega;
            
            if (quantidadeDisponivel < quantidade) {
                throw new Error(`Estoque insuficiente para ${estoqueItem.produto_nome}. Disponível no estoque ${tipoEstoque}: ${quantidadeDisponivel}, Necessário: ${quantidade}`);
            }
            
            // Inserir movimentação de saída
            await connection.query(`
                INSERT INTO movimentacoes_estoque 
                (produto_id, tipo_movimento, quantidade, motivo, documento_referencia, pedido_id, tipo_operacao, tipo_estoque, observacao)
                VALUES (?, 'saida', ?, ?, ?, ?, 'automatica', ?, 'Saída automática por entrega realizada')
            `, [produto_id, quantidade, tipoPedido === 'encomenda' ? 'Entrega - Encomenda' : 'Venda - Pronta Entrega', `#${pedidoId}`, pedidoId, tipoEstoque]);
            
            // Atualizar estoque de acordo com o tipo
            if (tipoPedido === 'encomenda') {
                await connection.query(`
                    UPDATE estoque 
                    SET quantidade_atual = quantidade_atual - ?, 
                        quantidade_encomenda = quantidade_encomenda - ?,
                        ultima_atualizacao = NOW()
                    WHERE produto_id = ?
                `, [quantidade, quantidade, produto_id]);
            } else {
                await connection.query(`
                    UPDATE estoque 
                    SET quantidade_atual = quantidade_atual - ?, 
                        quantidade_pronta_entrega = quantidade_pronta_entrega - ?,
                        ultima_atualizacao = NOW()
                    WHERE produto_id = ?
                `, [quantidade, quantidade, produto_id]);
            }
            
            produtosAfetados.push({
                produto_id,
                quantidade,
                operacao: 'saida',
                tipo_estoque: tipoEstoque
            });
        }
        
        // Log da operação
        await connection.query(`
            INSERT INTO log_operacoes_automaticas 
            (pedido_id, tipo_operacao, status_anterior, status_novo, produtos_afetados, observacoes)
            VALUES (?, 'saida_estoque', 'pronto', 'entregue', ?, ?)
        `, [pedidoId, JSON.stringify(produtosAfetados), `Saída automática por entrega - Tipo: ${tipoPedido} - Estoque: ${tipoEstoque}`]);
        
        console.log(`Saída automática processada com sucesso para pedido ${pedidoId}`);
        return true;
        
    } catch (error) {
        console.error('Erro ao processar saída automática:', error);
        throw error;
    }
};

const pedidosController = {
    // Listar todos os pedidos com itens detalhados
    async listar(req, res) {
        try {
            const { vendedor } = req.query;
            
            // Construir query base
            let query = `
                SELECT 
                    p.*,
                    c.nome as cliente_nome,
                    c.telefone as cliente_telefone,
                    c.endereco_rua,
                    c.endereco_numero,
                    c.endereco_complemento,
                    c.endereco_bairro,
                    c.endereco_cidade,
                    c.endereco_estado,
                    CONCAT(c.endereco_rua, ', ', c.endereco_numero, 
                           CASE WHEN c.endereco_complemento IS NOT NULL 
                                THEN CONCAT(' - ', c.endereco_complemento) 
                                ELSE '' END,
                           ' - ', c.endereco_bairro) as endereco_completo
                FROM pedidos p
                INNER JOIN clientes c ON p.cliente_id = c.id
                WHERE p.status != 'cancelado'
            `;
            
            let queryParams = [];
            
            // Adicionar filtro por vendedor se especificado
            if (vendedor) {
                query += ` AND p.criado_por = ?`;
                queryParams.push(vendedor);
            }
            
            query += `
                ORDER BY 
                    CASE 
                        WHEN p.tipo = 'encomenda' AND p.data_entrega_prevista IS NOT NULL 
                        THEN p.data_entrega_prevista 
                        ELSE p.data_pedido 
                    END DESC
            `;

            // Buscar pedidos com novos campos
            const [pedidos] = await pool.query(query, queryParams);

            // Buscar itens para cada pedido
            const pedidosComItens = await Promise.all(
                pedidos.map(async (pedido) => {
                    const [itens] = await pool.query(`
                        SELECT 
                            ip.*,
                            pr.nome as produto_nome,
                            pr.unidade_medida
                        FROM itens_pedido ip
                        INNER JOIN produtos pr ON ip.produto_id = pr.id
                        WHERE ip.pedido_id = ?
                        ORDER BY pr.nome
                    `, [pedido.id]);

                    return {
                        ...pedido,
                        status: normalizeStatus(pedido.status),
                        itens: itens
                    };
                })
            );

            res.json(pedidosComItens);
        } catch (error) {
            console.error('Erro ao listar pedidos:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    },

    // Buscar pedido por ID com itens detalhados
    async buscarPorId(req, res) {
        try {
            const [pedido] = await pool.query(`
                SELECT 
                    p.*,
                    c.nome as cliente_nome,
                    c.telefone as cliente_telefone,
                    c.email as cliente_email,
                    CONCAT(c.endereco_rua, ', ', c.endereco_numero, 
                           CASE WHEN c.endereco_complemento IS NOT NULL 
                                THEN CONCAT(' - ', c.endereco_complemento) 
                                ELSE '' END,
                           ' - ', c.endereco_bairro) as endereco_completo
                FROM pedidos p
                INNER JOIN clientes c ON p.cliente_id = c.id
                WHERE p.id = ?
            `, [req.params.id]);

            if (pedido.length === 0) {
                return res.status(404).json({ message: 'Pedido não encontrado' });
            }

            const [itens] = await pool.query(`
                SELECT 
                    ip.*,
                    pr.nome as produto_nome,
                    pr.unidade_medida
                FROM itens_pedido ip
                INNER JOIN produtos pr ON ip.produto_id = pr.id
                WHERE ip.pedido_id = ?
                ORDER BY pr.nome
            `, [req.params.id]);

            const pedidoCompleto = {
                ...pedido[0],
                status: normalizeStatus(pedido[0].status),
                itens: itens
            };

            res.json(pedidoCompleto);
        } catch (error) {
            console.error('Erro ao buscar pedido:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Criar novo pedido
    async criar(req, res) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const {
                cliente_id,
                status = 'pendente',
                tipo = 'pronta_entrega',
                data_entrega_prevista,
                horario_entrega,
                forma_pagamento,
                observacoes,
                observacoes_producao,
                itens,
                endereco_entrega
            } = req.body;

            // Validações
            if (!cliente_id || !forma_pagamento || !itens || itens.length === 0) {
                return res.status(400).json({ 
                    message: 'Cliente, forma de pagamento e itens são obrigatórios' 
                });
            }

            // Validar tipo
            if (!['pronta_entrega', 'encomenda'].includes(tipo)) {
                return res.status(400).json({ 
                    message: 'Tipo deve ser "pronta_entrega" ou "encomenda"' 
                });
            }

            // Para encomendas, data de entrega é obrigatória
            if (tipo === 'encomenda' && !data_entrega_prevista) {
                return res.status(400).json({ 
                    message: 'Data de entrega prevista é obrigatória para encomendas' 
                });
            }

            // Normalizar e validar status
            const statusNormalizado = normalizeStatus(status);
            if (!isValidStatus(statusNormalizado)) {
                return res.status(400).json({ 
                    message: 'Status inválido' 
                });
            }

            // Verificar se cliente existe
            const [clienteExiste] = await connection.query(
                'SELECT id FROM clientes WHERE id = ? AND status = "ativo"', 
                [cliente_id]
            );
            if (clienteExiste.length === 0) {
                return res.status(400).json({ message: 'Cliente não encontrado ou inativo' });
            }

            // Gerar número do pedido sequencial
            const [ultimoPedido] = await connection.query(
                'SELECT MAX(CAST(SUBSTRING(numero_pedido, 2) AS UNSIGNED)) as ultimo_numero FROM pedidos WHERE numero_pedido LIKE "#%"'
            );
            const proximoNumero = (ultimoPedido[0].ultimo_numero || 0) + 1;
            const numeroPedido = `#${String(proximoNumero).padStart(3, '0')}`;

            // Calcular valor total
            let valorTotal = 0;
            const itensValidados = [];

            for (const item of itens) {
                const { produto_id, quantidade, preco_unitario } = item;
                
                if (!produto_id || !quantidade || !preco_unitario) {
                    throw new Error('Todos os itens devem ter produto, quantidade e preço');
                }

                // Verificar se produto existe
                const [produto] = await connection.query(
                    'SELECT id, nome, quantidade_atual FROM produtos WHERE id = ? AND status = "ativo"',
                    [produto_id]
                );
                if (produto.length === 0) {
                    throw new Error(`Produto ${produto_id} não encontrado ou inativo`);
                }

                // Para pronta entrega, verificar estoque disponível
                if (tipo === 'pronta_entrega' && produto[0].quantidade_atual < quantidade) {
                    throw new Error(`Estoque insuficiente para ${produto[0].nome}. Disponível: ${produto[0].quantidade_atual}`);
                }

                const subtotal = quantidade * preco_unitario;
                valorTotal += subtotal;

                itensValidados.push({
                    produto_id,
                    quantidade,
                    preco_unitario: parseFloat(preco_unitario),
                    subtotal
                });
            }

            // Inserir pedido
            const [resultPedido] = await connection.query(`
                INSERT INTO pedidos (
                    cliente_id, numero_pedido, status, tipo, data_entrega_prevista, 
                    horario_entrega, valor_total, forma_pagamento, observacoes, 
                    observacoes_producao, estoque_processado
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                cliente_id, numeroPedido, statusNormalizado, tipo, 
                data_entrega_prevista, horario_entrega, valorTotal, 
                forma_pagamento, observacoes, observacoes_producao, false
            ]);

            const pedidoId = resultPedido.insertId;

            // Inserir itens do pedido
            for (const item of itensValidados) {
                await connection.query(`
                    INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal)
                    VALUES (?, ?, ?, ?, ?)
                `, [pedidoId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]);
            }

            await connection.commit();

            // Buscar pedido criado com detalhes
            const [novoPedido] = await connection.query(`
                SELECT p.*, c.nome as cliente_nome 
                FROM pedidos p
                INNER JOIN clientes c ON p.cliente_id = c.id
                WHERE p.id = ?
            `, [pedidoId]);

            res.status(201).json({
                ...novoPedido[0],
                itens: itensValidados
            });

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao criar pedido:', error);
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Atualizar pedido
    async atualizar(req, res) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const pedidoId = req.params.id;
            const { 
                status, 
                tipo,
                data_entrega_prevista,
                horario_entrega,
                forma_pagamento, 
                observacoes, 
                observacoes_producao,
                itens 
            } = req.body;

            // Verificar se pedido existe e buscar dados atuais
            const [pedidoExiste] = await connection.query(`
                SELECT id, status, tipo, estoque_processado 
                FROM pedidos WHERE id = ?
            `, [pedidoId]);
            
            if (pedidoExiste.length === 0) {
                return res.status(404).json({ message: 'Pedido não encontrado' });
            }

            const pedidoAtual = pedidoExiste[0];
            const statusAtual = normalizeStatus(pedidoAtual.status);
            const tipoAtual = pedidoAtual.tipo;
            const estoqueProcessado = pedidoAtual.estoque_processado;

            // Não permitir edição de pedidos concluídos ou cancelados
            if (['concluido', 'cancelado'].includes(statusAtual)) {
                return res.status(400).json({ 
                    message: 'Não é possível editar pedidos concluídos ou cancelados' 
                });
            }

            // Normalizar e validar novo status
            const statusNormalizado = normalizeStatus(status);
            if (!isValidStatus(statusNormalizado)) {
                return res.status(400).json({ 
                    message: 'Status inválido' 
                });
            }

            // Buscar itens do pedido para processamento de estoque
            const [itensPedido] = await connection.query(`
                SELECT ip.produto_id, ip.quantidade, p.nome as produto_nome
                FROM itens_pedido ip
                INNER JOIN produtos p ON ip.produto_id = p.id
                WHERE ip.pedido_id = ?
            `, [pedidoId]);

            // Lógica de processamento automático de estoque baseada na mudança de status
            const tipoFinal = tipo || tipoAtual;

            // ENTRADA AUTOMÁTICA DE ESTOQUE - Para encomendas quando finaliza produção
            if (tipoFinal === 'encomenda' && 
                statusAtual !== 'produzido' && 
                statusNormalizado === 'produzido' && 
                !estoqueProcessado) {
                
                console.log(`Processando entrada automática para encomenda - Pedido ${pedidoId}`);
                await processarEntradaAutomaticaEstoque(connection, pedidoId, itensPedido);
                
                // Marcar que o estoque foi processado
                await connection.query(`
                    UPDATE pedidos SET estoque_processado = TRUE WHERE id = ?
                `, [pedidoId]);
            }

            // SAÍDA AUTOMÁTICA DE ESTOQUE - Quando pedido é entregue
            if ((statusAtual !== 'entregue' && statusNormalizado === 'entregue') ||
                (statusAtual !== 'concluido' && statusNormalizado === 'concluido')) {
                
                console.log(`Processando saída automática para entrega - Pedido ${pedidoId} (tipo: ${tipoFinal})`);
                
                // Para pronta entrega, fazer saída direto
                // Para encomenda, só fazer saída se já houve entrada (produzido)
                if (tipoFinal === 'pronta_entrega' || 
                   (tipoFinal === 'encomenda' && estoqueProcessado)) {
                    
                    await processarSaidaAutomaticaEstoque(connection, pedidoId, itensPedido, tipoFinal);
                } else if (tipoFinal === 'encomenda' && !estoqueProcessado) {
                    throw new Error('Não é possível entregar encomenda sem antes finalizar a produção (status: produzido)');
                }
            }

            let valorTotal = null;

            // Se itens foram fornecidos, reprocessar
            if (itens && itens.length > 0) {
                // Remover itens antigos
                await connection.query('DELETE FROM itens_pedido WHERE pedido_id = ?', [pedidoId]);

                valorTotal = 0;
                // Adicionar novos itens
                for (const item of itens) {
                    const { produto_id, quantidade, preco_unitario } = item;
                    
                    // Verificar se produto existe
                    const [produto] = await connection.query(
                        'SELECT id, nome, quantidade_atual FROM produtos WHERE id = ? AND status = "ativo"',
                        [produto_id]
                    );
                    
                    if (produto.length === 0) {
                        throw new Error(`Produto ${produto_id} não encontrado ou inativo`);
                    }

                    const subtotal = quantidade * preco_unitario;
                    valorTotal += subtotal;

                    await connection.query(`
                        INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal)
                        VALUES (?, ?, ?, ?, ?)
                    `, [pedidoId, produto_id, quantidade, preco_unitario, subtotal]);
                }
            }

            // Atualizar pedido
            const updateFields = [];
            const updateValues = [];

            if (status) {
                updateFields.push('status = ?');
                updateValues.push(statusNormalizado);
            }
            if (tipo) {
                updateFields.push('tipo = ?');
                updateValues.push(tipo);
            }
            if (data_entrega_prevista !== undefined) {
                updateFields.push('data_entrega_prevista = ?');
                updateValues.push(data_entrega_prevista);
            }
            if (horario_entrega !== undefined) {
                updateFields.push('horario_entrega = ?');
                updateValues.push(horario_entrega);
            }
            if (forma_pagamento) {
                updateFields.push('forma_pagamento = ?');
                updateValues.push(forma_pagamento);
            }
            if (observacoes !== undefined) {
                updateFields.push('observacoes = ?');
                updateValues.push(observacoes);
            }
            if (observacoes_producao !== undefined) {
                updateFields.push('observacoes_producao = ?');
                updateValues.push(observacoes_producao);
            }
            if (valorTotal !== null) {
                updateFields.push('valor_total = ?');
                updateValues.push(valorTotal);
            }

            if (updateFields.length > 0) {
                updateValues.push(pedidoId);

            await connection.query(`
                    UPDATE pedidos 
                    SET ${updateFields.join(', ')}
                WHERE id = ?
                `, updateValues);
            }

            await connection.commit();

            // Buscar pedido atualizado
            const [pedidoAtualizado] = await connection.query(`
                SELECT 
                    p.*,
                    c.nome as cliente_nome,
                    c.telefone as cliente_telefone
                FROM pedidos p
                INNER JOIN clientes c ON p.cliente_id = c.id
                WHERE p.id = ?
            `, [pedidoId]);

            res.json({
                ...pedidoAtualizado[0],
                status: normalizeStatus(pedidoAtualizado[0].status)
            });

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao atualizar pedido:', error);
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Cancelar pedido (restaurar estoque)
    async cancelar(req, res) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const pedidoId = req.params.id;

            // Verificar se pedido existe e pode ser cancelado
            const [pedido] = await connection.query(
                'SELECT id, status, numero_pedido FROM pedidos WHERE id = ?', 
                [pedidoId]
            );
            if (pedido.length === 0) {
                return res.status(404).json({ message: 'Pedido não encontrado' });
            }

            if (['concluido', 'cancelado'].includes(pedido[0].status)) {
                return res.status(400).json({ 
                    message: 'Pedido já foi concluído ou cancelado' 
                });
            }

            // Restaurar estoque
            const [itens] = await connection.query(
                'SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = ?',
                [pedidoId]
            );

            for (const item of itens) {
                await connection.query(
                    'UPDATE produtos SET quantidade_atual = quantidade_atual + ? WHERE id = ?',
                    [item.quantidade, item.produto_id]
                );

                // Registrar movimentação de estoque (devolução)
                await connection.query(`
                    INSERT INTO movimentacoes_estoque (
                        produto_id, tipo_movimento, quantidade, motivo, 
                        documento_referencia, data_movimentacao
                    ) VALUES (?, 'entrada', ?, 'Cancelamento de Pedido', ?, NOW())
                `, [item.produto_id, item.quantidade, pedido[0].numero_pedido]);
            }

            // Cancelar pedido
            await connection.query(
                'UPDATE pedidos SET status = "cancelado" WHERE id = ?',
                [pedidoId]
            );

            // Cancelar entrega se existir
            await connection.query(
                'UPDATE entregas SET status = "cancelada" WHERE pedido_id = ?',
                [pedidoId]
            );

            await connection.commit();
            res.json({ message: 'Pedido cancelado com sucesso' });

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao cancelar pedido:', error);
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Buscar pedidos com filtros
    async buscar(req, res) {
        try {
            const { 
                cliente_nome, 
                status, 
                data_inicio, 
                data_fim, 
                numero_pedido,
                tipo,
                paymentStatus
            } = req.query;

            let query = `
                SELECT 
                    p.*,
                    c.nome as cliente_nome,
                    c.telefone as cliente_telefone,
                    c.endereco_rua,
                    c.endereco_numero,
                    c.endereco_complemento,
                    c.endereco_bairro,
                    c.endereco_cidade,
                    c.endereco_estado,
                    CONCAT(c.endereco_rua, ', ', c.endereco_numero, 
                           CASE WHEN c.endereco_complemento IS NOT NULL 
                                THEN CONCAT(' - ', c.endereco_complemento) 
                                ELSE '' END,
                           ' - ', c.endereco_bairro) as endereco_completo
                FROM pedidos p
                INNER JOIN clientes c ON p.cliente_id = c.id
                WHERE 1=1
            `;
            
            const params = [];

            if (cliente_nome) {
                query += ' AND c.nome LIKE ?';
                params.push(`%${cliente_nome}%`);
            }

            if (status) {
                query += ' AND p.status = ?';
                params.push(status);
            }

            if (tipo) {
                query += ' AND p.tipo = ?';
                params.push(tipo);
            }

            if (paymentStatus) {
                query += ' AND p.status_pagamento = ?';
                params.push(paymentStatus);
            }

            if (data_inicio) {
                query += ' AND DATE(p.data_pedido) >= ?';
                params.push(data_inicio);
            }

            if (data_fim) {
                query += ' AND DATE(p.data_pedido) <= ?';
                params.push(data_fim);
            }

            if (numero_pedido) {
                query += ' AND p.numero_pedido LIKE ?';
                params.push(`%${numero_pedido}%`);
            }

            query += ` ORDER BY 
                    CASE 
                        WHEN p.tipo = 'encomenda' AND p.data_entrega_prevista IS NOT NULL 
                        THEN p.data_entrega_prevista 
                        ELSE p.data_pedido 
                    END DESC 
                LIMIT 100`;

            const [pedidos] = await pool.query(query, params);

            // Buscar itens para cada pedido (igual ao método listar)
            const pedidosComItens = await Promise.all(
                pedidos.map(async (pedido) => {
                    const [itens] = await pool.query(`
                        SELECT 
                            ip.*,
                            pr.nome as produto_nome,
                            pr.unidade_medida
                        FROM itens_pedido ip
                        INNER JOIN produtos pr ON ip.produto_id = pr.id
                        WHERE ip.pedido_id = ?
                        ORDER BY pr.nome
                    `, [pedido.id]);

                    return {
                        ...pedido,
                        status: normalizeStatus(pedido.status),
                        itens: itens
                    };
                })
            );

            res.json(pedidosComItens);

        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Estatísticas de pedidos
    async estatisticas(req, res) {
        try {
            const [resumo] = await pool.query(`
                SELECT 
                    COUNT(*) as total_pedidos,
                    COUNT(CASE WHEN DATE(data_pedido) = CURDATE() THEN 1 END) as pedidos_hoje,
                    COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes,
                    COUNT(CASE WHEN status = 'em_preparo' THEN 1 END) as em_preparo,
                    COUNT(CASE WHEN status = 'pronto' THEN 1 END) as prontos,
                    COUNT(CASE WHEN status = 'concluido' THEN 1 END) as concluidos,
                    COALESCE(SUM(CASE WHEN DATE(data_pedido) = CURDATE() THEN valor_total END), 0) as vendas_hoje,
                    COALESCE(SUM(CASE WHEN WEEK(data_pedido) = WEEK(NOW()) THEN valor_total END), 0) as vendas_semana,
                    COALESCE(SUM(CASE WHEN MONTH(data_pedido) = MONTH(NOW()) THEN valor_total END), 0) as vendas_mes,
                    COALESCE(AVG(valor_total), 0) as ticket_medio
                FROM pedidos 
                WHERE status != 'cancelado'
            `);

            const [produtosMaisVendidos] = await pool.query(`
                SELECT 
                    pr.nome as produto_nome,
                    SUM(ip.quantidade) as total_vendido,
                    SUM(ip.subtotal) as receita_total
                FROM itens_pedido ip
                INNER JOIN produtos pr ON ip.produto_id = pr.id
                INNER JOIN pedidos p ON ip.pedido_id = p.id
                WHERE p.status != 'cancelado'
                    AND DATE(p.data_pedido) >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY pr.id, pr.nome
                ORDER BY total_vendido DESC
                LIMIT 10
            `);

            const [vendasDiarias] = await pool.query(`
                SELECT 
                    DATE(data_pedido) as data,
                    COUNT(*) as total_pedidos,
                    SUM(valor_total) as total_vendas
                FROM pedidos 
                WHERE status != 'cancelado'
                    AND DATE(data_pedido) >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY DATE(data_pedido)
                ORDER BY data DESC
            `);

            res.json({
                resumo: resumo[0],
                produtos_mais_vendidos: produtosMaisVendidos,
                vendas_diarias: vendasDiarias
            });

        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Atualizar status de pagamento
    async atualizarPagamento(req, res) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const pedidoId = req.params.id;
            const { 
                status_pagamento, 
                valor_pago, 
                observacoes_pagamento 
            } = req.body;

            // Verificar se pedido existe
            const [pedidoExiste] = await connection.query(
                'SELECT id, valor_total, status_pagamento, valor_pago FROM pedidos WHERE id = ?', 
                [pedidoId]
            );
            if (pedidoExiste.length === 0) {
                return res.status(404).json({ message: 'Pedido não encontrado' });
            }

            const pedido = pedidoExiste[0];
            const valorTotal = parseFloat(pedido.valor_total);
            const valorPagoAtual = parseFloat(pedido.valor_pago || 0);
            const novoValorPago = parseFloat(valor_pago || 0);

            // Validar valor pago
            if (novoValorPago < 0) {
                return res.status(400).json({ message: 'Valor pago não pode ser negativo' });
            }

            if (novoValorPago > valorTotal) {
                return res.status(400).json({ message: 'Valor pago não pode ser maior que o valor total' });
            }

            // Determinar status de pagamento automaticamente se não fornecido
            let statusPagamento = status_pagamento;
            if (!statusPagamento) {
                if (novoValorPago === 0) {
                    statusPagamento = 'pendente';
                } else if (novoValorPago >= valorTotal) {
                    statusPagamento = 'pago';
                } else {
                    statusPagamento = 'parcial';
                }
            }

            // Atualizar pagamento
            await connection.query(`
                UPDATE pedidos SET 
                    status_pagamento = ?,
                    valor_pago = ?,
                    data_pagamento = ${statusPagamento === 'pago' ? 'NOW()' : 'data_pagamento'},
                    observacoes_pagamento = ?
                WHERE id = ?
            `, [statusPagamento, novoValorPago, observacoes_pagamento, pedidoId]);

            await connection.commit();

            // Buscar pedido atualizado
            const [pedidoAtualizado] = await connection.query(`
                SELECT 
                    p.*,
                    c.nome as cliente_nome,
                    c.telefone as cliente_telefone
                FROM pedidos p
                INNER JOIN clientes c ON p.cliente_id = c.id
                WHERE p.id = ?
            `, [pedidoId]);

            res.json({
                ...pedidoAtualizado[0],
                status: normalizeStatus(pedidoAtualizado[0].status)
            });

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao atualizar pagamento:', error);
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Listar pedidos com pagamentos pendentes
    async pagamentosPendentes(req, res) {
        try {
            const [pedidos] = await pool.query(`
                SELECT 
                    p.*,
                    c.nome as cliente_nome,
                    c.telefone as cliente_telefone,
                    (p.valor_total - COALESCE(p.valor_pago, 0)) as valor_pendente,
                    DATEDIFF(NOW(), p.data_pedido) as dias_atraso
                FROM pedidos p
                INNER JOIN clientes c ON p.cliente_id = c.id
                WHERE p.status_pagamento IN ('pendente', 'parcial')
                    AND p.status != 'cancelado'
                ORDER BY p.data_pedido ASC
            `);

            res.json(pedidos.map(pedido => ({
                ...pedido,
                status: normalizeStatus(pedido.status)
            })));
        } catch (error) {
            console.error('Erro ao buscar pagamentos pendentes:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Listar pedidos não entregues
    async naoEntregues(req, res) {
        try {
            const [pedidos] = await pool.query(`
                SELECT 
                    p.*,
                    c.nome as cliente_nome,
                    c.telefone as cliente_telefone,
                    c.endereco_rua,
                    c.endereco_numero,
                    c.endereco_bairro,
                    CONCAT(c.endereco_rua, ', ', c.endereco_numero, ' - ', c.endereco_bairro) as endereco_completo,
                    DATEDIFF(NOW(), p.data_pedido) as dias_pendentes
                FROM pedidos p
                INNER JOIN clientes c ON p.cliente_id = c.id
                WHERE p.status NOT IN ('concluido', 'cancelado')
                ORDER BY p.data_pedido ASC
            `);

            // Buscar itens para cada pedido
            const pedidosComItens = await Promise.all(
                pedidos.map(async (pedido) => {
                    const [itens] = await pool.query(`
                        SELECT 
                            ip.*,
                            pr.nome as produto_nome,
                            pr.unidade_medida
                        FROM itens_pedido ip
                        INNER JOIN produtos pr ON ip.produto_id = pr.id
                        WHERE ip.pedido_id = ?
                        ORDER BY pr.nome
                    `, [pedido.id]);

                    return {
                        ...pedido,
                        status: normalizeStatus(pedido.status),
                        itens: itens
                    };
                })
            );

            res.json(pedidosComItens);
        } catch (error) {
            console.error('Erro ao buscar pedidos não entregues:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Marcar pedido como entregue
    async marcarEntregue(req, res) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const pedidoId = req.params.id;

            // Verificar se pedido existe
            const [pedidoExiste] = await connection.query(
                'SELECT id, status FROM pedidos WHERE id = ?', 
                [pedidoId]
            );
            if (pedidoExiste.length === 0) {
                return res.status(404).json({ message: 'Pedido não encontrado' });
            }

            // Atualizar status para concluído e marcar data de entrega
            await connection.query(`
                UPDATE pedidos SET 
                    status = 'concluido',
                    data_entrega = NOW()
                WHERE id = ?
            `, [pedidoId]);

            await connection.commit();

            res.json({ message: 'Pedido marcado como entregue com sucesso' });

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao marcar como entregue:', error);
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    }
};

module.exports = pedidosController; 