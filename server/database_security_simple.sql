-- Script Ultra-Simples de Segurança para SiloSystem
-- Versão sem condicionais para MariaDB

USE loja_organizada;

-- 1. POPULAR TABELA DE PERFIS
INSERT IGNORE INTO perfis (nome, descricao, permissoes) VALUES 
('Administrador', 'Acesso total ao sistema', '{"usuarios":["create","read","update","delete"],"clientes":["create","read","update","delete"],"pedidos":["create","read","update","delete"],"produtos":["create","read","update","delete"],"financeiro":["create","read","update","delete"],"relatorios":["create","read","update","delete"]}'),
('Gerente', 'Acesso a todos os módulos exceto usuários', '{"usuarios":[],"clientes":["create","read","update","delete"],"pedidos":["create","read","update","delete"],"produtos":["create","read","update","delete"],"financeiro":["create","read","update","delete"],"relatorios":["create","read","update","delete"]}'),
('Vendedor', 'Acesso restrito a clientes e pedidos próprios', '{"usuarios":[],"clientes":["create","read","update"],"pedidos":["create","read","update"],"produtos":["read"],"financeiro":[],"relatorios":[]}');

-- 2. CRIAR TABELAS FALTANTES

-- Tabela de sessões
CREATE TABLE IF NOT EXISTS sessoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_expiracao TIMESTAMP NULL,
    ativo BOOLEAN DEFAULT TRUE,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_token (token)
);

-- Tabela de auditoria
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

-- Tabela de tentativas de login
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

-- 3. CRIAR USUÁRIO ADMINISTRADOR PADRÃO
INSERT IGNORE INTO usuarios (nome, email, senha_hash, perfil_id, ativo, data_criacao) VALUES 
('Administrador', 'admin@silosystem.com', '$2b$12$LQv3c1yqBw2MQDzwjbXMQeDCKlWKIKbVVXWCjBYNZlKgWzKzGkMme', 1, TRUE, NOW());

-- 4. MENSAGEM DE SUCESSO
SELECT 'Sistema de segurança configurado!' as Status,
       'admin@silosystem.com' as Usuario,
       'admin123' as Senha; 