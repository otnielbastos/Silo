-- Script de Segurança para o Sistema SiloSystem (VERSÃO CORRIGIDA)
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

-- Verificar se as colunas já existem antes de adicioná-las
SET @sql = '';

-- Verificar e adicionar perfil_id
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'usuarios' 
  AND column_name = 'perfil_id';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN perfil_id INT, ');
END IF;

-- Verificar e adicionar senha_hash
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'usuarios' 
  AND column_name = 'senha_hash';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN senha_hash VARCHAR(255), ');
END IF;

-- Verificar e adicionar salt
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'usuarios' 
  AND column_name = 'salt';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN salt VARCHAR(255), ');
END IF;

-- Verificar e adicionar token_reset
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'usuarios' 
  AND column_name = 'token_reset';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN token_reset VARCHAR(255), ');
END IF;

-- Verificar e adicionar token_reset_expira (SEM VALOR PADRÃO)
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'usuarios' 
  AND column_name = 'token_reset_expira';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN token_reset_expira TIMESTAMP NULL, ');
END IF;

-- Verificar e adicionar tentativas_login
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'usuarios' 
  AND column_name = 'tentativas_login';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN tentativas_login INT DEFAULT 0, ');
END IF;

-- Verificar e adicionar bloqueado_ate (SEM VALOR PADRÃO)
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'usuarios' 
  AND column_name = 'bloqueado_ate';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN bloqueado_ate TIMESTAMP NULL, ');
END IF;

-- Verificar e adicionar ativo
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'usuarios' 
  AND column_name = 'ativo';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN ativo BOOLEAN DEFAULT TRUE, ');
END IF;

-- Verificar e adicionar criado_por
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'usuarios' 
  AND column_name = 'criado_por';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN criado_por INT, ');
END IF;

-- Verificar e adicionar atualizado_por
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'usuarios' 
  AND column_name = 'atualizado_por';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN atualizado_por INT, ');
END IF;

-- Verificar e adicionar data_atualizacao
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'usuarios' 
  AND column_name = 'data_atualizacao';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ');
END IF;

-- Executar ALTER TABLE apenas se há colunas para adicionar
IF LENGTH(@sql) > 0 THEN
    SET @sql = CONCAT('ALTER TABLE usuarios ', TRIM(TRAILING ', ' FROM @sql));
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END IF;

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

-- Inserir perfis padrão (apenas se não existirem)
INSERT IGNORE INTO perfis (nome, descricao, permissoes) VALUES 
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

-- Adicionar campos de auditoria nas tabelas principais (apenas se não existirem)

-- Tabela clientes
SET @sql = '';

SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'clientes' 
  AND column_name = 'criado_por';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN criado_por INT, ');
END IF;

SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'clientes' 
  AND column_name = 'atualizado_por';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN atualizado_por INT, ');
END IF;

SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'clientes' 
  AND column_name = 'data_atualizacao';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ');
END IF;

IF LENGTH(@sql) > 0 THEN
    SET @sql = CONCAT('ALTER TABLE clientes ', TRIM(TRAILING ', ' FROM @sql));
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END IF;

-- Tabela pedidos
SET @sql = '';

SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'pedidos' 
  AND column_name = 'criado_por';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN criado_por INT, ');
END IF;

SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'pedidos' 
  AND column_name = 'atualizado_por';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN atualizado_por INT, ');
END IF;

SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'pedidos' 
  AND column_name = 'data_atualizacao';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ');
END IF;

IF LENGTH(@sql) > 0 THEN
    SET @sql = CONCAT('ALTER TABLE pedidos ', TRIM(TRAILING ', ' FROM @sql));
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END IF;

-- Tabela produtos
SET @sql = '';

SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'produtos' 
  AND column_name = 'criado_por';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN criado_por INT, ');
END IF;

SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'produtos' 
  AND column_name = 'atualizado_por';

IF @col_exists = 0 THEN
    SET @sql = CONCAT(@sql, 'ADD COLUMN atualizado_por INT, ');
END IF;

IF LENGTH(@sql) > 0 THEN
    SET @sql = CONCAT('ALTER TABLE produtos ', TRIM(TRAILING ', ' FROM @sql));
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END IF;

-- Criar usuário administrador padrão (apenas se não existir)
SET @admin_exists = 0;
SELECT COUNT(*) INTO @admin_exists FROM usuarios WHERE email = 'admin@silosystem.com';

IF @admin_exists = 0 THEN
    INSERT INTO usuarios (nome, email, senha_hash, perfil_id, ativo, data_criacao) VALUES 
    ('Administrador', 'admin@silosystem.com', '$2b$12$LQv3c1yqBw2MQDzwjbXMQeDCKlWKIKbVVXWCjBYNZlKgWzKzGkMme', 1, TRUE, NOW());
END IF;

-- Adicionar Foreign Keys apenas se não existirem (para evitar erros de referência circular)
-- Não vamos adicionar FKs para criado_por e atualizado_por para evitar referências circulares

-- FK para perfil_id em usuarios
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'usuarios' 
  AND column_name = 'perfil_id' 
  AND referenced_table_name = 'perfis';

IF @fk_exists = 0 THEN
    ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_perfil FOREIGN KEY (perfil_id) REFERENCES perfis(id);
END IF;

-- FK para usuario_id em sessoes
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'sessoes' 
  AND column_name = 'usuario_id' 
  AND referenced_table_name = 'usuarios';

IF @fk_exists = 0 THEN
    ALTER TABLE sessoes ADD CONSTRAINT fk_sessoes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
END IF;

-- FK para usuario_id em auditoria
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE table_schema = 'loja_organizada' 
  AND table_name = 'auditoria' 
  AND column_name = 'usuario_id' 
  AND referenced_table_name = 'usuarios';

IF @fk_exists = 0 THEN
    ALTER TABLE auditoria ADD CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
END IF;

-- Mensagem de sucesso
SELECT 'Script de segurança executado com sucesso!' as Resultado; 