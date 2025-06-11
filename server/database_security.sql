-- Script de Segurança para o Sistema SiloSystem
-- Criação de tabelas para autenticação, autorização e auditoria

USE loja_organizada;

-- Criar tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS perfis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    permissoes JSON,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Atualizar tabela de usuários para sistema de segurança
ALTER TABLE usuarios 
ADD COLUMN perfil_id INT,
ADD COLUMN senha_hash VARCHAR(255),
ADD COLUMN salt VARCHAR(255),
ADD COLUMN token_reset VARCHAR(255),
ADD COLUMN token_reset_expira TIMESTAMP,
ADD COLUMN tentativas_login INT DEFAULT 0,
ADD COLUMN bloqueado_ate TIMESTAMP,
ADD COLUMN ativo BOOLEAN DEFAULT TRUE,
ADD COLUMN criado_por INT,
ADD COLUMN atualizado_por INT,
ADD COLUMN data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD FOREIGN KEY (perfil_id) REFERENCES perfis(id),
ADD FOREIGN KEY (criado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (atualizado_por) REFERENCES usuarios(id);

-- Criar tabela de sessões
CREATE TABLE IF NOT EXISTS sessoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_expiracao TIMESTAMP NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Criar tabela de log de auditoria
CREATE TABLE IF NOT EXISTS auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    acao VARCHAR(100) NOT NULL,
    tabela VARCHAR(50),
    registro_id INT,
    dados_antigos JSON,
    dados_novos JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    data_acao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Criar tabela de tentativas de login
CREATE TABLE IF NOT EXISTS tentativas_login (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255),
    ip_address VARCHAR(45),
    sucesso BOOLEAN,
    motivo VARCHAR(100),
    user_agent TEXT,
    data_tentativa TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir perfis padrão
INSERT INTO perfis (nome, descricao, permissoes) VALUES 
('Administrador', 'Acesso total ao sistema', JSON_OBJECT(
    'usuarios', JSON_ARRAY('create', 'read', 'update', 'delete'),
    'clientes', JSON_ARRAY('create', 'read', 'update', 'delete'),
    'pedidos', JSON_ARRAY('create', 'read', 'update', 'delete'),
    'produtos', JSON_ARRAY('create', 'read', 'update', 'delete'),
    'financeiro', JSON_ARRAY('create', 'read', 'update', 'delete'),
    'relatorios', JSON_ARRAY('create', 'read', 'update', 'delete')
)),
('Gerente', 'Acesso a todos os módulos exceto usuários', JSON_OBJECT(
    'usuarios', JSON_ARRAY(),
    'clientes', JSON_ARRAY('create', 'read', 'update', 'delete'),
    'pedidos', JSON_ARRAY('create', 'read', 'update', 'delete'),
    'produtos', JSON_ARRAY('create', 'read', 'update', 'delete'),
    'financeiro', JSON_ARRAY('create', 'read', 'update', 'delete'),
    'relatorios', JSON_ARRAY('create', 'read', 'update', 'delete')
)),
('Vendedor', 'Acesso restrito a clientes e pedidos próprios', JSON_OBJECT(
    'usuarios', JSON_ARRAY(),
    'clientes', JSON_ARRAY('create', 'read', 'update'),
    'pedidos', JSON_ARRAY('create', 'read', 'update'),
    'produtos', JSON_ARRAY('read'),
    'financeiro', JSON_ARRAY(),
    'relatorios', JSON_ARRAY()
));

-- Adicionar campo criado_por nas tabelas principais para controle de acesso
ALTER TABLE clientes 
ADD COLUMN criado_por INT,
ADD COLUMN atualizado_por INT,
ADD COLUMN data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD FOREIGN KEY (criado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (atualizado_por) REFERENCES usuarios(id);

ALTER TABLE pedidos 
ADD COLUMN criado_por INT,
ADD COLUMN atualizado_por INT,
ADD COLUMN data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD FOREIGN KEY (criado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (atualizado_por) REFERENCES usuarios(id);

ALTER TABLE produtos 
ADD COLUMN criado_por INT,
ADD COLUMN atualizado_por INT,
ADD FOREIGN KEY (criado_por) REFERENCES usuarios(id),
ADD FOREIGN KEY (atualizado_por) REFERENCES usuarios(id);

-- Criar usuário administrador padrão (senha: admin123)
-- Hash gerado com bcrypt para 'admin123'
INSERT INTO usuarios (nome, email, senha_hash, perfil_id, ativo, data_criacao) VALUES 
('Administrador', 'admin@silosystem.com', '$2b$12$LQv3c1yqBw2MQDzwjbXMQeDCKlWKIKbVVXWCjBYNZlKgWzKzGkMme', 1, TRUE, NOW());

-- Criar índices para melhor performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_perfil ON usuarios(perfil_id);
CREATE INDEX idx_sessoes_token ON sessoes(token);
CREATE INDEX idx_sessoes_usuario ON sessoes(usuario_id);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_data ON auditoria(data_acao);
CREATE INDEX idx_tentativas_login_email ON tentativas_login(email);
CREATE INDEX idx_tentativas_login_ip ON tentativas_login(ip_address);
CREATE INDEX idx_clientes_criado_por ON clientes(criado_por);
CREATE INDEX idx_pedidos_criado_por ON pedidos(criado_por); 