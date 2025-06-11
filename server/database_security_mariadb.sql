-- Script de Segurança para o Sistema SiloSystem (VERSÃO MARIADB)
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

-- Adicionar colunas na tabela usuarios (ignorar erros se já existirem)
ALTER TABLE usuarios 
ADD COLUMN perfil_id INT,
ADD COLUMN senha_hash VARCHAR(255),
ADD COLUMN salt VARCHAR(255),
ADD COLUMN token_reset VARCHAR(255),
ADD COLUMN token_reset_expira TIMESTAMP NULL,
ADD COLUMN tentativas_login INT DEFAULT 0,
ADD COLUMN bloqueado_ate TIMESTAMP NULL,
ADD COLUMN ativo BOOLEAN DEFAULT TRUE,
ADD COLUMN criado_por INT,
ADD COLUMN atualizado_por INT,
ADD COLUMN data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

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
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_token (token)
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
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_data_acao (data_acao)
);

-- Criar tabela de tentativas de login
CREATE TABLE IF NOT EXISTS tentativas_login (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255),
    ip_address VARCHAR(45),
    sucesso BOOLEAN,
    motivo VARCHAR(100),
    user_agent TEXT,
    data_tentativa TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_ip_address (ip_address)
);

-- Inserir perfis padrão (MariaDB compatível)
INSERT INTO perfis (nome, descricao, permissoes) VALUES 
('Administrador', 'Acesso total ao sistema', '{"usuarios":["create","read","update","delete"],"clientes":["create","read","update","delete"],"pedidos":["create","read","update","delete"],"produtos":["create","read","update","delete"],"financeiro":["create","read","update","delete"],"relatorios":["create","read","update","delete"]}'),
('Gerente', 'Acesso a todos os módulos exceto usuários', '{"usuarios":[],"clientes":["create","read","update","delete"],"pedidos":["create","read","update","delete"],"produtos":["create","read","update","delete"],"financeiro":["create","read","update","delete"],"relatorios":["create","read","update","delete"]}'),
('Vendedor', 'Acesso restrito a clientes e pedidos próprios', '{"usuarios":[],"clientes":["create","read","update"],"pedidos":["create","read","update"],"produtos":["read"],"financeiro":[],"relatorios":[]}')
ON DUPLICATE KEY UPDATE nome = nome;

-- Adicionar campos de auditoria nas tabelas principais
ALTER TABLE clientes 
ADD COLUMN criado_por INT,
ADD COLUMN atualizado_por INT,
ADD COLUMN data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE pedidos 
ADD COLUMN criado_por INT,
ADD COLUMN atualizado_por INT,
ADD COLUMN data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Adicionar campos de auditoria na tabela produtos (se existir)
ALTER TABLE produtos 
ADD COLUMN criado_por INT,
ADD COLUMN atualizado_por INT;

-- Criar usuário administrador padrão
INSERT INTO usuarios (nome, email, senha_hash, perfil_id, ativo, data_criacao) VALUES 
('Administrador', 'admin@silosystem.com', '$2b$12$LQv3c1yqBw2MQDzwjbXMQeDCKlWKIKbVVXWCjBYNZlKgWzKzGkMme', 1, TRUE, NOW())
ON DUPLICATE KEY UPDATE email = email;

-- Adicionar Foreign Keys (ignorar se já existirem)
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_perfil FOREIGN KEY (perfil_id) REFERENCES perfis(id);
ALTER TABLE sessoes ADD CONSTRAINT fk_sessoes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE auditoria ADD CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);

-- Mensagem de sucesso
SELECT 'Script de segurança executado com sucesso!' as Resultado; 