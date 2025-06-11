const pool = require('../config/database');

const clientesController = {
    // Listar todos os clientes
    async listar(req, res) {
        try {
            const [clientes] = await pool.query(`
                SELECT 
                    c.*,
                    COALESCE(COUNT(p.id), 0) as total_pedidos,
                    COALESCE(MAX(p.data_pedido), '') as ultimo_pedido,
                    COALESCE(SUM(p.valor_total), 0) as total_gasto
                FROM clientes c
                LEFT JOIN pedidos p ON c.id = p.cliente_id
                WHERE c.status = 'ativo'
                GROUP BY c.id
                ORDER BY c.nome
            `);
            res.json(clientes);
        } catch (error) {
            console.error('Erro ao listar clientes:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar cliente por ID
    async buscarPorId(req, res) {
        try {
            const [cliente] = await pool.query(`
                SELECT 
                    c.*,
                    COALESCE(COUNT(p.id), 0) as total_pedidos,
                    COALESCE(MAX(p.data_pedido), '') as ultimo_pedido,
                    COALESCE(SUM(p.valor_total), 0) as total_gasto
                FROM clientes c
                LEFT JOIN pedidos p ON c.id = p.cliente_id
                WHERE c.id = ?
                GROUP BY c.id
            `, [req.params.id]);

            if (cliente.length === 0) {
                return res.status(404).json({ message: 'Cliente não encontrado' });
            }
            res.json(cliente[0]);
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Criar novo cliente
    async criar(req, res) {
        try {
            const {
                nome,
                email,
                telefone,
                cpf_cnpj,
                tipo_pessoa,
                endereco_rua,
                endereco_numero,
                endereco_complemento,
                endereco_bairro,
                endereco_cidade,
                endereco_estado,
                endereco_cep,
                observacoes
            } = req.body;

            console.log('Criando cliente com dados:', req.body);

            // Converter campos vazios para null para evitar problemas com UNIQUE constraints
            const emailTratado = email && email.trim() !== '' ? email.trim() : null;
            const cpfCnpjTratado = cpf_cnpj && cpf_cnpj.trim() !== '' ? cpf_cnpj.trim() : null;

            // Verificar se já existe cliente com mesmo email ou CPF/CNPJ
            if (emailTratado) {
                const [emailExistente] = await pool.query('SELECT id FROM clientes WHERE email = ? AND status = "ativo"', [emailTratado]);
                if (emailExistente.length > 0) {
                    return res.status(400).json({ message: 'Já existe um cliente com este email' });
                }
            }

            if (cpfCnpjTratado) {
                const [cpfExistente] = await pool.query('SELECT id FROM clientes WHERE cpf_cnpj = ? AND status = "ativo"', [cpfCnpjTratado]);
                if (cpfExistente.length > 0) {
                    return res.status(400).json({ message: 'Já existe um cliente com este CPF/CNPJ' });
                }
            }

            const [result] = await pool.query(`
                INSERT INTO clientes (
                    nome, email, telefone, cpf_cnpj, tipo_pessoa,
                    endereco_rua, endereco_numero, endereco_complemento,
                    endereco_bairro, endereco_cidade, endereco_estado,
                    endereco_cep, observacoes, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo')
            `, [
                nome, 
                emailTratado, 
                telefone, 
                cpfCnpjTratado, 
                tipo_pessoa || 'fisica',
                endereco_rua || null,
                endereco_numero || null,
                endereco_complemento || null,
                endereco_bairro || null,
                endereco_cidade || null,
                endereco_estado || null,
                endereco_cep || null,
                observacoes || null
            ]);

            const clienteId = result.insertId;
            console.log('Cliente criado com ID:', clienteId);

            // Buscar cliente criado com dados calculados
            const [novoCliente] = await pool.query(`
                SELECT 
                    c.*,
                    COALESCE(COUNT(p.id), 0) as total_pedidos,
                    COALESCE(MAX(p.data_pedido), '') as ultimo_pedido,
                    COALESCE(SUM(p.valor_total), 0) as total_gasto
                FROM clientes c
                LEFT JOIN pedidos p ON c.id = p.cliente_id
                WHERE c.id = ?
                GROUP BY c.id
            `, [clienteId]);

            res.status(201).json(novoCliente[0]);
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Email ou CPF/CNPJ já cadastrado' });
            }
            res.status(500).json({ error: error.message });
        }
    },

    // Atualizar cliente
    async atualizar(req, res) {
        try {
            const {
                nome,
                email,
                telefone,
                cpf_cnpj,
                tipo_pessoa,
                endereco_rua,
                endereco_numero,
                endereco_complemento,
                endereco_bairro,
                endereco_cidade,
                endereco_estado,
                endereco_cep,
                observacoes
            } = req.body;

            // Verificar se cliente existe
            const [clienteExistente] = await pool.query('SELECT id FROM clientes WHERE id = ? AND status = "ativo"', [req.params.id]);
            if (clienteExistente.length === 0) {
                return res.status(404).json({ message: 'Cliente não encontrado' });
            }

            // Converter campos vazios para null para evitar problemas com UNIQUE constraints
            const emailTratado = email && email.trim() !== '' ? email.trim() : null;
            const cpfCnpjTratado = cpf_cnpj && cpf_cnpj.trim() !== '' ? cpf_cnpj.trim() : null;

            // Verificar duplicatas (exceto o próprio cliente)
            if (emailTratado) {
                const [emailExistente] = await pool.query('SELECT id FROM clientes WHERE email = ? AND id != ? AND status = "ativo"', [emailTratado, req.params.id]);
                if (emailExistente.length > 0) {
                    return res.status(400).json({ message: 'Já existe um cliente com este email' });
                }
            }

            if (cpfCnpjTratado) {
                const [cpfExistente] = await pool.query('SELECT id FROM clientes WHERE cpf_cnpj = ? AND id != ? AND status = "ativo"', [cpfCnpjTratado, req.params.id]);
                if (cpfExistente.length > 0) {
                    return res.status(400).json({ message: 'Já existe um cliente com este CPF/CNPJ' });
                }
            }

            await pool.query(`
                UPDATE clientes SET
                    nome = ?, email = ?, telefone = ?, cpf_cnpj = ?, tipo_pessoa = ?,
                    endereco_rua = ?, endereco_numero = ?, endereco_complemento = ?,
                    endereco_bairro = ?, endereco_cidade = ?, endereco_estado = ?,
                    endereco_cep = ?, observacoes = ?
                WHERE id = ?
            `, [
                nome, 
                emailTratado, 
                telefone, 
                cpfCnpjTratado, 
                tipo_pessoa || 'fisica',
                endereco_rua || null,
                endereco_numero || null,
                endereco_complemento || null,
                endereco_bairro || null,
                endereco_cidade || null,
                endereco_estado || null,
                endereco_cep || null,
                observacoes || null,
                req.params.id
            ]);

            // Buscar cliente atualizado com dados calculados
            const [clienteAtualizado] = await pool.query(`
                SELECT 
                    c.*,
                    COALESCE(COUNT(p.id), 0) as total_pedidos,
                    COALESCE(MAX(p.data_pedido), '') as ultimo_pedido,
                    COALESCE(SUM(p.valor_total), 0) as total_gasto
                FROM clientes c
                LEFT JOIN pedidos p ON c.id = p.cliente_id
                WHERE c.id = ?
                GROUP BY c.id
            `, [req.params.id]);

            res.json(clienteAtualizado[0]);
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Email ou CPF/CNPJ já cadastrado' });
            }
            res.status(500).json({ error: error.message });
        }
    },

    // Deletar cliente (soft delete)
    async deletar(req, res) {
        try {
            // Verificar se cliente existe
            const [clienteExistente] = await pool.query('SELECT id FROM clientes WHERE id = ? AND status = "ativo"', [req.params.id]);
            if (clienteExistente.length === 0) {
                return res.status(404).json({ message: 'Cliente não encontrado' });
            }

            // Verificar se cliente tem pedidos
            const [pedidos] = await pool.query('SELECT COUNT(*) as total FROM pedidos WHERE cliente_id = ?', [req.params.id]);
            if (pedidos[0].total > 0) {
                return res.status(400).json({ 
                    message: 'Não é possível excluir cliente que possui pedidos. Use a inativação.' 
                });
            }

            // Soft delete
            await pool.query('UPDATE clientes SET status = "inativo" WHERE id = ?', [req.params.id]);
            res.json({ message: 'Cliente excluído com sucesso' });
        } catch (error) {
            console.error('Erro ao deletar cliente:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar clientes por termo
    async buscar(req, res) {
        try {
            const { termo } = req.query;
            if (!termo) {
                return res.status(400).json({ message: 'Termo de busca é obrigatório' });
            }

            const [clientes] = await pool.query(`
                SELECT 
                    c.*,
                    COALESCE(COUNT(p.id), 0) as total_pedidos,
                    COALESCE(MAX(p.data_pedido), '') as ultimo_pedido,
                    COALESCE(SUM(p.valor_total), 0) as total_gasto
                FROM clientes c
                LEFT JOIN pedidos p ON c.id = p.cliente_id
                WHERE c.status = 'ativo' 
                AND (
                    c.nome LIKE ? OR 
                    c.telefone LIKE ? OR 
                    c.email LIKE ? OR
                    c.endereco_bairro LIKE ?
                )
                GROUP BY c.id
                ORDER BY c.nome
            `, [`%${termo}%`, `%${termo}%`, `%${termo}%`, `%${termo}%`]);

            res.json(clientes);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Estatísticas de clientes
    async estatisticas(req, res) {
        try {
            const [stats] = await pool.query(`
                SELECT 
                    COUNT(*) as total_clientes,
                    COUNT(CASE WHEN c.data_cadastro >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as novos_ultimo_mes,
                    COALESCE(AVG(total_gasto), 0) as ticket_medio
                FROM clientes c
                LEFT JOIN (
                    SELECT cliente_id, SUM(valor_total) as total_gasto
                    FROM pedidos 
                    GROUP BY cliente_id
                ) p ON c.id = p.cliente_id
                WHERE c.status = 'ativo'
            `);

            const [topClientes] = await pool.query(`
                SELECT 
                    c.nome,
                    COUNT(p.id) as total_pedidos,
                    COALESCE(SUM(p.valor_total), 0) as total_gasto
                FROM clientes c
                LEFT JOIN pedidos p ON c.id = p.cliente_id
                WHERE c.status = 'ativo'
                GROUP BY c.id, c.nome
                ORDER BY total_gasto DESC
                LIMIT 5
            `);

            res.json({
                resumo: stats[0],
                top_clientes: topClientes
            });
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = clientesController; 