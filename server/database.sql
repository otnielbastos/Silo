-- Criar o banco de dados
CREATE DATABASE IF NOT EXISTS loja_organizada;
USE loja_organizada;

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    cargo VARCHAR(50),
    status ENUM('ativo', 'inativo') DEFAULT 'ativo',
    ultimo_acesso TIMESTAMP,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco_venda DECIMAL(10,2) NOT NULL,
    preco_custo DECIMAL(10,2) NOT NULL,
    quantidade_minima INT NOT NULL,
    quantidade_atual INT NOT NULL DEFAULT 0,
    categoria VARCHAR(100),
    unidade_medida VARCHAR(20),
    tipo_produto ENUM('producao_propria', 'revenda', 'materia_prima') NOT NULL DEFAULT 'producao_propria',
    status ENUM('ativo', 'inativo') DEFAULT 'ativo',
    imagem_url VARCHAR(255),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    telefone VARCHAR(20),
    cpf_cnpj VARCHAR(20) UNIQUE,
    tipo_pessoa ENUM('fisica', 'juridica') NOT NULL,
    endereco_rua VARCHAR(255),
    endereco_numero VARCHAR(20),
    endereco_complemento VARCHAR(100),
    endereco_bairro VARCHAR(100),
    endereco_cidade VARCHAR(100),
    endereco_estado CHAR(2),
    endereco_cep VARCHAR(10),
    observacoes TEXT,
    status ENUM('ativo', 'inativo') DEFAULT 'ativo',
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    numero_pedido VARCHAR(50) UNIQUE NOT NULL,
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pendente', 'aprovado', 'em_separacao', 'em_entrega', 'concluido', 'cancelado') NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    forma_pagamento VARCHAR(50) NOT NULL,
    observacoes TEXT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- Criar tabela de itens do pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- Criar tabela de estoque
CREATE TABLE IF NOT EXISTS estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    quantidade_atual INT NOT NULL DEFAULT 0,
    ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- Criar tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    tipo_movimento ENUM('entrada', 'saida', 'ajuste') NOT NULL,
    quantidade INT NOT NULL,
    motivo VARCHAR(100) NOT NULL,
    valor DECIMAL(10,2),
    documento_referencia VARCHAR(50),
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fabricacao DATE,
    data_validade DATE,
    usuario_id INT,
    observacao TEXT,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- Criar tabela de entregas
CREATE TABLE IF NOT EXISTS entregas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    status ENUM('aguardando', 'em_rota', 'entregue', 'cancelada') NOT NULL,
    data_agendada DATE,
    periodo_entrega ENUM('manha', 'tarde', 'noite'),
    endereco_entrega_rua VARCHAR(255) NOT NULL,
    endereco_entrega_numero VARCHAR(20),
    endereco_entrega_complemento VARCHAR(100),
    endereco_entrega_bairro VARCHAR(100),
    endereco_entrega_cidade VARCHAR(100),
    endereco_entrega_estado CHAR(2),
    endereco_entrega_cep VARCHAR(10),
    transportadora VARCHAR(100),
    codigo_rastreamento VARCHAR(50),
    observacoes TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
);

-- Criar tabela de configurações de relatórios
CREATE TABLE IF NOT EXISTS configuracoes_relatorios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    filtros JSON,
    periodo_padrao VARCHAR(50),
    usuario_id INT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 