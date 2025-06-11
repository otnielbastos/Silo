-- Insert default profiles
INSERT INTO perfis (nome, descricao, permissoes, ativo) VALUES
('Administrador', 'Acesso total ao sistema', 
 '{"usuarios":["criar","listar","editar","excluir"],"clientes":["criar","listar","editar","excluir"],"pedidos":["criar","listar","editar","excluir"],"produtos":["criar","listar","editar","excluir"],"estoque":["criar","listar","editar","excluir"],"entregas":["criar","listar","editar","excluir"],"relatorios":["criar","listar","editar","excluir"]}'::jsonb, 
 TRUE),
('Gerente', 'Acesso a todos os módulos exceto usuários', 
 '{"usuarios":[],"clientes":["criar","listar","editar","excluir"],"pedidos":["criar","listar","editar","excluir"],"produtos":["criar","listar","editar","excluir"],"estoque":["criar","listar","editar","excluir"],"entregas":["criar","listar","editar","excluir"],"relatorios":["criar","listar","editar","excluir"]}'::jsonb, 
 TRUE),
('Vendedor', 'Acesso restrito a clientes e pedidos próprios', 
 '{"usuarios":[],"clientes":["create","read","update"],"pedidos":["create","read","update"],"produtos":["read"],"financeiro":[],"relatorios":["read"]}'::jsonb, 
 TRUE);

-- Insert default admin user (password: admin123 - hash gerado com bcrypt)
INSERT INTO usuarios (nome, email, senha, perfil_id, ativo, senha_hash) VALUES
('Administrador', 'admin@silosystem.com', '', 1, TRUE, '$2b$12$WRm7Q5F4D2Oic62x0yq2xuv5oIeI8Qf5tF1BfIJPCSqqHLCDCP40K');

-- Insert ALL products from MySQL.sql with Supabase Storage images
INSERT INTO produtos (nome, descricao, preco_venda, preco_custo, quantidade_minima, categoria, tipo_produto, unidade_medida, status, imagem_url) VALUES
('Nhoque Tradicional - 500g', 'Nhoque Tradicional de 500g feito de batata', 25.00, 6.61, 3, 'Congelados', 'producao_propria', 'Pacote', 'ativo', 'produtos/1748975675797-731946779.jpg'),
('Nhoque Recheado Mussarela - 500g', 'Contem pacote de 500g de nhoque recheado de Mussarela', 40.00, 12.72, 3, 'Congelados', 'producao_propria', 'Pacote', 'ativo', 'produtos/1748975772896-582541457.jpg'),
('Nhoque Recheado Mussarela com Catupiry - 500g', 'Pacote de 500g com Nhoque Recheado Mussarela com Catupiry', 40.00, 11.18, 3, 'Congelados', 'producao_propria', 'Pacote', 'ativo', 'produtos/1748975798766-619419538.jpg'),
('Nhoque Recheado Presunto com Mussarela - 500g', 'Pacote de 500g de Nhoque Recheado Presunto com Mussarela', 40.00, 10.42, 3, 'Congelados', 'producao_propria', 'Pacote', 'ativo', 'produtos/1748975822395-385952879.jpg'),
('Nhoque Recheado Calabresa com Mussarela - 500g', 'Pacote de 500g de Nhoque Recheado Calabresa com Mussarela', 40.00, 10.37, 3, 'Congelados', 'producao_propria', 'Pacote', 'ativo', 'produtos/1748975843109-869330303.jpg'),
('Molho ao Sugo Extrato - 500ml', 'Pote de 500ml de molho de extrato de tomate', 20.00, 7.74, 3, 'Molho', 'producao_propria', 'Pote', 'ativo', 'produtos/1748975880417-190043038.jpg'),
('Molho Bolonhesa Extrato - 500ml', 'Pote de 500ml de molho de extrato de tomate', 20.00, 12.64, 3, 'Molho', 'producao_propria', 'Pote', 'ativo', 'produtos/1748975904643-820407538.jpg'),
('Refrigerante Coca-Cola - Lata 350ml', 'Refrigerante Coca-Cola - Lata 350ml', 3.00, 7.90, 5, 'Bebidas', 'revenda', 'Latas', 'ativo', 'produtos/1748988215446-707073668.png'),
('Refrigerante Coca-Cola Zero - Lata 350ml', 'Refrigerante Coca-Cola Zero - Lata 350ml', 3.00, 7.90, 5, 'Bebidas', 'revenda', 'Latas', 'ativo', 'produtos/1748988382869-601995256.png'),
('Refrigerante Guarana Antartica - Lata 269ml', 'Refrigerante Guarana Antartica - Lata 269ml', 3.00, 4.99, 5, 'Bebidas', 'revenda', 'Latas', 'ativo', 'produtos/1748988278894-87367356.png'),
('Caldo Verde', 'Caldo Verde tradicional', 25.00, 9.23, 2, 'Caldo', 'producao_propria', 'Pote', 'ativo', 'produtos/1749062849455-744863486.jpg'),
('Molho ao Sugo Natural - 500ml', 'Molho ao Sugo Natural - 500ml', 15.00, 7.02, 2, 'Molho', 'producao_propria', 'Pote', 'ativo', 'produtos/1749062876280-551634345.jpg');

-- Insert stock for ALL products
INSERT INTO estoque (produto_id, quantidade_atual, quantidade_pronta_entrega, quantidade_encomenda) VALUES
(1, 7, 7, 0),   -- Nhoque Tradicional - 500g
(2, 0, 0, 0),   -- Nhoque Recheado Mussarela - 500g
(3, 0, 0, 0),   -- Nhoque Recheado Mussarela com Catupiry - 500g
(4, 0, 0, 0),   -- Nhoque Recheado Presunto com Mussarela - 500g
(5, 0, 0, 0),   -- Nhoque Recheado Calabresa com Mussarela - 500g
(6, 0, 0, 0),   -- Molho ao Sugo Extrato - 500ml
(7, 0, 0, 0),   -- Molho Bolonhesa Extrato - 500ml
(8, 0, 0, 0),   -- Refrigerante Coca-Cola - Lata 350ml
(9, 0, 0, 0),   -- Refrigerante Coca-Cola Zero - Lata 350ml
(10, 0, 0, 0),  -- Refrigerante Guarana Antartica - Lata 269ml
(11, 0, 0, 0),  -- Caldo Verde
(12, 0, 0, 0);  -- Molho ao Sugo Natural - 500ml

-- Insert sample client
INSERT INTO clientes (nome, email, telefone, cpf_cnpj, tipo_pessoa, endereco_rua, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep, status, criado_por) VALUES
('Cliente Exemplo', 'cliente@exemplo.com', '11999999999', '12345678901', 'fisica', 'Rua Exemplo', '123', 'Centro', 'São Paulo', 'SP', '01234567', 'ativo', 1); 