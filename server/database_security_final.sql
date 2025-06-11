-- Script Final de Segurança para SiloSystem
-- Adaptado à estrutura atual do banco de dados

USE loja_organizada;

-- 1. POPULAR TABELA DE PERFIS (que já existe mas está vazia)
INSERT INTO perfis (nome, descricao, permissoes) VALUES 
('Administrador', 'Acesso total ao sistema', '{"usuarios":["create","read","update","delete"],"clientes":["create","read","update","delete"],"pedidos":["create","read","update","delete"],"produtos":["create","read","update","delete"],"financeiro":["create","read","update","delete"],"relatorios":["create","read","update","delete"]}'),
('Gerente', 'Acesso a todos os módulos exceto usuários', '{"usuarios":[],"clientes":["create","read","update","delete"],"pedidos":["create","read","update","delete"],"produtos":["create","read","update","delete"],"financeiro":["create","read","update","delete"],"relatorios":["create","read","update","delete"]}'),
('Vendedor', 'Acesso restrito a clientes e pedidos próprios', '{"usuarios":[],"clientes":["create","read","update"],"pedidos":["create","read","update"],"produtos":["read"],"financeiro":[],"relatorios":[]}')
ON DUPLICATE KEY UPDATE nome = nome;

-- 2. CRIAR TABELAS FALTANTES

-- Tabela de sessões (se não existir)
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

-- Tabela de auditoria (se não existir)
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

-- Tabela de tentativas de login (se não existir)
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

-- 3. ADICIONAR CAMPOS DE AUDITORIA NAS TABELAS EXISTENTES (apenas se não existirem)

-- Verificar e adicionar campos na tabela clientes
SET @sql_clientes = '';
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = 'loja_organizada' AND table_name = 'clientes' AND column_name = 'criado_por';
IF @col_exists = 0 THEN
    SET @sql_clientes = CONCAT(@sql_clientes, 'ADD COLUMN criado_por INT, ');
END IF;

SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = 'loja_organizada' AND table_name = 'clientes' AND column_name = 'atualizado_por';
IF @col_exists = 0 THEN
    SET @sql_clientes = CONCAT(@sql_clientes, 'ADD COLUMN atualizado_por INT, ');
END IF;

SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = 'loja_organizada' AND table_name = 'clientes' AND column_name = 'data_atualizacao';
IF @col_exists = 0 THEN
    SET @sql_clientes = CONCAT(@sql_clientes, 'ADD COLUMN data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ');
END IF;

IF LENGTH(@sql_clientes) > 0 THEN
    SET @sql_clientes = CONCAT('ALTER TABLE clientes ', TRIM(TRAILING ', ' FROM @sql_clientes));
    SET @sql_clientes = CONCAT(@sql_clientes, ';');
    PREPARE stmt FROM @sql_clientes;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END IF;

-- Verificar e adicionar campos na tabela pedidos
SET @sql_pedidos = '';
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = 'loja_organizada' AND table_name = 'pedidos' AND column_name = 'criado_por';
IF @col_exists = 0 THEN
    SET @sql_pedidos = CONCAT(@sql_pedidos, 'ADD COLUMN criado_por INT, ');
END IF;

SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = 'loja_organizada' AND table_name = 'pedidos' AND column_name = 'atualizado_por';
IF @col_exists = 0 THEN
    SET @sql_pedidos = CONCAT(@sql_pedidos, 'ADD COLUMN atualizado_por INT, ');
END IF;

SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = 'loja_organizada' AND table_name = 'pedidos' AND column_name = 'data_atualizacao';
IF @col_exists = 0 THEN
    SET @sql_pedidos = CONCAT(@sql_pedidos, 'ADD COLUMN data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ');
END IF;

IF LENGTH(@sql_pedidos) > 0 THEN
    SET @sql_pedidos = CONCAT('ALTER TABLE pedidos ', TRIM(TRAILING ', ' FROM @sql_pedidos));
    SET @sql_pedidos = CONCAT(@sql_pedidos, ';');
    PREPARE stmt FROM @sql_pedidos;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END IF;

-- Verificar e adicionar campos na tabela produtos
SET @sql_produtos = '';
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = 'loja_organizada' AND table_name = 'produtos' AND column_name = 'criado_por';
IF @col_exists = 0 THEN
    SET @sql_produtos = CONCAT(@sql_produtos, 'ADD COLUMN criado_por INT, ');
END IF;

SELECT COUNT(*) INTO @col_exists FROM information_schema.columns WHERE table_schema = 'loja_organizada' AND table_name = 'produtos' AND column_name = 'atualizado_por';
IF @col_exists = 0 THEN
    SET @sql_produtos = CONCAT(@sql_produtos, 'ADD COLUMN atualizado_por INT, ');
END IF;

IF LENGTH(@sql_produtos) > 0 THEN
    SET @sql_produtos = CONCAT('ALTER TABLE produtos ', TRIM(TRAILING ', ' FROM @sql_produtos));
    SET @sql_produtos = CONCAT(@sql_produtos, ';');
    PREPARE stmt FROM @sql_produtos;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END IF;

-- 4. CRIAR USUÁRIO ADMINISTRADOR PADRÃO
INSERT INTO usuarios (nome, email, senha_hash, perfil_id, ativo, data_criacao) VALUES 
('Administrador', 'admin@silosystem.com', '$2b$12$LQv3c1yqBw2MQDzwjbXMQeDCKlWKIKbVVXWCjBYNZlKgWzKzGkMme', 1, TRUE, NOW())
ON DUPLICATE KEY UPDATE email = email;

-- 5. CRIAR FOREIGN KEYS (apenas se não existirem)

-- FK para usuarios.perfil_id
SET @fk_count = 0;
SELECT COUNT(*) INTO @fk_count FROM information_schema.KEY_COLUMN_USAGE 
WHERE table_schema = 'loja_organizada' AND table_name = 'usuarios' AND column_name = 'perfil_id' AND referenced_table_name = 'perfis';

IF @fk_count = 0 THEN
    ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_perfil FOREIGN KEY (perfil_id) REFERENCES perfis(id);
END IF;

-- FK para sessoes.usuario_id
SET @fk_count = 0;
SELECT COUNT(*) INTO @fk_count FROM information_schema.KEY_COLUMN_USAGE 
WHERE table_schema = 'loja_organizada' AND table_name = 'sessoes' AND column_name = 'usuario_id' AND referenced_table_name = 'usuarios';

IF @fk_count = 0 THEN
    ALTER TABLE sessoes ADD CONSTRAINT fk_sessoes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
END IF;

-- FK para auditoria.usuario_id
SET @fk_count = 0;
SELECT COUNT(*) INTO @fk_count FROM information_schema.KEY_COLUMN_USAGE 
WHERE table_schema = 'loja_organizada' AND table_name = 'auditoria' AND column_name = 'usuario_id' AND referenced_table_name = 'usuarios';

IF @fk_count = 0 THEN
    ALTER TABLE auditoria ADD CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
END IF;

-- Mensagem de sucesso
SELECT 'Sistema de segurança configurado com sucesso!' as Status,
       'admin@silosystem.com' as Usuario_Admin,
       'admin123' as Senha_Admin; 