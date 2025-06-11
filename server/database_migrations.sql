-- ==========================================
-- MIGRAÇÃO: Sistema de Encomendas e Controle Automático de Estoque
-- Data: 2024-01-XX
-- Descrição: Adição de campos para suportar encomendas e pronta entrega
--            com controle automático de entrada/saída de estoque
-- ==========================================

USE loja_organizada;

-- 1. Adicionar novos campos na tabela pedidos
ALTER TABLE pedidos 
ADD COLUMN tipo ENUM('pronta_entrega', 'encomenda') NOT NULL DEFAULT 'pronta_entrega' AFTER status,
ADD COLUMN data_entrega_prevista DATE NULL AFTER tipo,
ADD COLUMN horario_entrega TIME NULL AFTER data_entrega_prevista,
ADD COLUMN observacoes_producao TEXT NULL AFTER observacoes;

-- 2. Atualizar enum do status para incluir novos status
ALTER TABLE pedidos 
MODIFY COLUMN status ENUM(
    'pendente',
    'aprovado', 
    'aguardando_producao',
    'em_preparo',
    'em_separacao',
    'produzido',
    'pronto',
    'em_entrega',
    'entregue',
    'concluido',
    'cancelado'
) NOT NULL DEFAULT 'pendente';

-- 3. Adicionar campo de controle para automação de estoque
ALTER TABLE pedidos
ADD COLUMN estoque_processado BOOLEAN DEFAULT FALSE AFTER observacoes_producao;

-- 4. Criar índices para otimização de consultas
CREATE INDEX idx_pedidos_tipo ON pedidos(tipo);
CREATE INDEX idx_pedidos_data_entrega ON pedidos(data_entrega_prevista);
CREATE INDEX idx_pedidos_status_tipo ON pedidos(status, tipo);

-- 5. Adicionar campo de referência na tabela movimentacoes_estoque para rastreamento
ALTER TABLE movimentacoes_estoque 
ADD COLUMN pedido_id INT NULL AFTER documento_referencia,
ADD COLUMN tipo_operacao ENUM('manual', 'automatica') DEFAULT 'manual' AFTER pedido_id,
ADD COLUMN tipo_estoque ENUM('pronta_entrega', 'encomenda') DEFAULT 'pronta_entrega' AFTER tipo_operacao;

-- 6. Criar foreign key para relacionar movimentações com pedidos
ALTER TABLE movimentacoes_estoque 
ADD CONSTRAINT fk_movimentacao_pedido 
FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL;

-- 7. Adicionar campos de estoque separado por tipo
ALTER TABLE estoque
ADD COLUMN quantidade_pronta_entrega INT NOT NULL DEFAULT 0 AFTER quantidade_atual,
ADD COLUMN quantidade_encomenda INT NOT NULL DEFAULT 0 AFTER quantidade_pronta_entrega;

-- 8. Migrar dados existentes (considerar todo estoque atual como pronta entrega)
UPDATE estoque 
SET quantidade_pronta_entrega = quantidade_atual, 
    quantidade_encomenda = 0;

-- 9. Criar tabela de log para auditoria das operações automáticas
CREATE TABLE IF NOT EXISTS log_operacoes_automaticas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    tipo_operacao ENUM('entrada_estoque', 'saida_estoque') NOT NULL,
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50),
    produtos_afetados JSON,
    data_operacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

-- 10. Criar tabela para transferências entre tipos de estoque
CREATE TABLE IF NOT EXISTS transferencias_estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL,
    origem ENUM('pronta_entrega', 'encomenda') NOT NULL,
    destino ENUM('pronta_entrega', 'encomenda') NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    pedido_id INT NULL,
    usuario_id INT NULL,
    observacao TEXT,
    data_transferencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos(id),
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
    INDEX idx_transferencias_produto (produto_id),
    INDEX idx_transferencias_data (data_transferencia)
);

-- 11. Atualizar pedidos existentes com valores padrão
UPDATE pedidos 
SET tipo = 'pronta_entrega', 
    estoque_processado = TRUE 
WHERE status IN ('concluido', 'entregue', 'cancelado');

-- ==========================================
-- COMENTÁRIOS SOBRE A LÓGICA DE USO:
-- ==========================================

/*
FLUXO PARA ENCOMENDAS:
1. Cliente faz pedido (tipo: 'encomenda', status: 'pendente') 
2. Empresa aprova (status: 'aprovado' -> 'aguardando_producao')
3. Inicia produção (status: 'em_preparo')
4. Finaliza produção (status: 'produzido') 
   -> TRIGGER: Sistema faz ENTRADA automática no estoque de ENCOMENDA
5. Separa produtos (status: 'pronto')
6. Entrega (status: 'entregue') 
   -> TRIGGER: Sistema faz SAÍDA automática do estoque de ENCOMENDA

FLUXO PARA PRONTA ENTREGA:
1. Cliente faz pedido (tipo: 'pronta_entrega', status: 'pendente')
   -> VALIDAÇÃO: Verifica se há estoque de PRONTA ENTREGA disponível
2. Empresa aprova (status: 'aprovado' ou 'pronto')
3. Entrega (status: 'entregue')
   -> TRIGGER: Sistema faz SAÍDA automática do estoque de PRONTA ENTREGA

SEPARAÇÃO DE ESTOQUE:
- quantidade_pronta_entrega: Estoque disponível para vendas imediatas
- quantidade_encomenda: Estoque produzido especificamente para encomendas
- quantidade_atual: Soma total (pronta_entrega + encomenda)

REGRAS DE NEGÓCIO:
1. Pedidos de pronta entrega só podem ser criados se houver estoque de pronta entrega
2. Pedidos de encomenda não verificam estoque (será produzido)
3. Quando uma encomenda é produzida, entra automaticamente no estoque de encomenda
4. Estoque de encomenda não fica visível para pedidos de pronta entrega
5. É possível transferir estoque entre tipos se necessário
*/

-- ==========================================
-- VERIFICAÇÕES PÓS-MIGRAÇÃO
-- ==========================================

-- Verificar se as colunas foram adicionadas
DESCRIBE pedidos;
DESCRIBE estoque;
DESCRIBE movimentacoes_estoque;

-- Verificar se os índices foram criados
SHOW INDEX FROM pedidos WHERE Key_name LIKE 'idx_pedidos_%';

-- Verificar estrutura da tabela de log
DESCRIBE log_operacoes_automaticas;

-- Verificar estrutura da tabela de transferências
DESCRIBE transferencias_estoque;

SELECT 'Migração concluída com sucesso! Sistema de estoque separado implementado.' as resultado; 