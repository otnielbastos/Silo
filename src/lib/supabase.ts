import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos TypeScript baseados no schema do banco
export interface Perfil {
  id: number
  nome: string
  descricao?: string
  permissoes?: any
  ativo: boolean
  data_criacao: string
  data_atualizacao: string
}

export interface Usuario {
  id: number
  nome: string
  email: string
  senha: string
  cargo?: string
  status: 'ativo' | 'inativo'
  ultimo_acesso: string
  data_criacao: string
  perfil_id?: number
  perfil?: Perfil
  senha_hash?: string
  salt?: string
  token_reset?: string
  token_reset_expira?: string
  tentativas_login: number
  bloqueado_ate?: string
  ativo: boolean
  criado_por?: number
  atualizado_por?: number
  data_atualizacao: string
}

export interface Cliente {
  id: number
  nome: string
  email?: string
  telefone?: string
  cpf_cnpj?: string
  tipo_pessoa: 'fisica' | 'juridica'
  endereco_rua?: string
  endereco_numero?: string
  endereco_complemento?: string
  endereco_bairro?: string
  endereco_cidade?: string
  endereco_estado?: string
  endereco_cep?: string
  observacoes?: string
  status: 'ativo' | 'inativo'
  data_cadastro: string
  criado_por?: number
}

export interface Produto {
  id: number
  nome: string
  descricao?: string
  preco_venda: number
  preco_custo: number
  quantidade_minima: number
  categoria?: string
  tipo_produto: 'producao_propria' | 'revenda' | 'materia_prima'
  unidade_medida?: string
  imagem_url?: string
  status: 'ativo' | 'inativo'
  data_criacao: string
  data_atualizacao: string
}

export interface Estoque {
  id: number
  produto_id: number
  quantidade_atual: number
  quantidade_pronta_entrega: number
  quantidade_encomenda: number
  ultima_atualizacao: string
  produto?: Produto
}

export interface Pedido {
  id: number
  cliente_id: number
  numero_pedido: string
  data_pedido: string
  status: 'pendente' | 'aprovado' | 'aguardando_producao' | 'em_preparo' | 'em_separacao' | 'produzido' | 'pronto' | 'em_entrega' | 'entregue' | 'concluido' | 'cancelado'
  tipo: 'pronta_entrega' | 'encomenda'
  data_entrega_prevista?: string
  horario_entrega?: string
  valor_total: number
  forma_pagamento: string
  status_pagamento: 'pendente' | 'pago' | 'parcial'
  valor_pago: number
  data_pagamento?: string
  observacoes_pagamento?: string
  data_entrega?: string
  observacoes?: string
  observacoes_producao?: string
  estoque_processado: boolean
  criado_por?: number
  cliente?: Cliente
  itens?: ItemPedido[]
}

export interface ItemPedido {
  id: number
  pedido_id: number
  produto_id: number
  quantidade: number
  preco_unitario: number
  desconto_valor: number
  desconto_percentual: number
  tipo_desconto: 'valor' | 'percentual'
  preco_unitario_com_desconto: number
  subtotal: number
  produto?: Produto
}

export interface MovimentacaoEstoque {
  id: number
  produto_id: number
  tipo_movimento: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  motivo: string
  valor?: number
  documento_referencia?: string
  pedido_id?: number
  tipo_operacao: 'manual' | 'automatica'
  tipo_estoque: 'pronta_entrega' | 'encomenda'
  data_movimentacao: string
  data_fabricacao?: string
  data_validade?: string
  usuario_id?: number
  observacao?: string
  produto?: Produto
  pedido?: Pedido
}

export interface Entrega {
  id: number
  pedido_id: number
  status: 'aguardando' | 'em_rota' | 'entregue' | 'cancelada'
  data_agendada?: string
  periodo_entrega?: 'manha' | 'tarde' | 'noite'
  endereco_entrega_rua: string
  endereco_entrega_numero?: string
  endereco_entrega_complemento?: string
  endereco_entrega_bairro?: string
  endereco_entrega_cidade?: string
  endereco_entrega_estado?: string
  endereco_entrega_cep?: string
  transportadora?: string
  codigo_rastreamento?: string
  observacoes?: string
  data_criacao: string
  data_atualizacao: string
  pedido?: Pedido
}

export interface Auditoria {
  id: number
  usuario_id?: number
  acao: string
  tabela?: string
  registro_id?: number
  dados_antigos?: any
  dados_novos?: any
  ip_address?: string
  user_agent?: string
  data_acao: string
  usuario?: Usuario
}

// Helper para obter URL de imagem
export const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // Usar a mesma lógica da API para consistência
  const baseUrl = supabaseUrl || 'http://127.0.0.1:54321';
  
  // Se o path já começa com /uploads (formato: /uploads/produtos/arquivo.jpg)
  if (path.startsWith('/uploads/')) {
    // Remove o /uploads/ inicial e usa diretamente
    return `${baseUrl}/storage/v1/object/public/uploads/${path.replace('/uploads/', '')}`;
  } 
  // Se o path é apenas o nome do arquivo ou já está no formato correto
  else if (path.includes('/')) {
    // Já tem algum caminho, assume que está no formato correto
    return `${baseUrl}/storage/v1/object/public/uploads/${path}`;
  } 
  // Se é apenas o nome do arquivo, assume que está na pasta produtos
  else {
    return `${baseUrl}/storage/v1/object/public/uploads/produtos/${path}`;
  }
}; 