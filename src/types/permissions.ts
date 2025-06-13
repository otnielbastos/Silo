// Tipos para o sistema de permissões

export type PagePermission = 
  | 'dashboard'
  | 'produtos' 
  | 'pedidos'
  | 'clientes'
  | 'estoque'
  | 'entregas'
  | 'relatorios'
  | 'usuarios'
  | 'configuracoes';

export type ActionPermission = 
  | 'visualizar'
  | 'criar'
  | 'editar'
  | 'excluir'
  | 'aprovar'
  | 'cancelar'
  | 'exportar'
  | 'imprimir';

export interface PageActions {
  [key: string]: ActionPermission[];
}

export interface PermissionSet {
  pages: PagePermission[];
  actions: {
    [page in PagePermission]?: ActionPermission[];
  };
}

export interface PerfilPermissoes {
  id: number;
  nome: string;
  descricao: string;
  permissoes: PermissionSet;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

// Permissões padrão por página
export const DEFAULT_PAGE_ACTIONS: Record<PagePermission, ActionPermission[]> = {
  dashboard: ['visualizar'],
  produtos: ['visualizar', 'criar', 'editar', 'excluir', 'exportar'],
  pedidos: ['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'cancelar', 'exportar', 'imprimir'],
  clientes: ['visualizar', 'criar', 'editar', 'excluir', 'exportar'],
  estoque: ['visualizar', 'editar', 'exportar'],
  entregas: ['visualizar', 'editar', 'exportar'],
  relatorios: ['visualizar', 'exportar', 'imprimir'],
  usuarios: ['visualizar', 'criar', 'editar', 'excluir'],
  configuracoes: ['visualizar', 'editar']
};

// Labels para exibição
export const PAGE_LABELS: Record<PagePermission, string> = {
  dashboard: 'Dashboard',
  produtos: 'Produtos',
  pedidos: 'Pedidos',
  clientes: 'Clientes',
  estoque: 'Estoque',
  entregas: 'Entregas',
  relatorios: 'Relatórios',
  usuarios: 'Usuários',
  configuracoes: 'Configurações'
};

export const ACTION_LABELS: Record<ActionPermission, string> = {
  visualizar: 'Visualizar',
  criar: 'Criar',
  editar: 'Editar',
  excluir: 'Excluir',
  aprovar: 'Aprovar',
  cancelar: 'Cancelar',
  exportar: 'Exportar',
  imprimir: 'Imprimir'
};

// Perfis pré-definidos
export const PERFIS_PADRAO: Omit<PerfilPermissoes, 'id' | 'data_criacao' | 'data_atualizacao'>[] = [
  {
    nome: 'Administrador',
    descricao: 'Acesso total ao sistema',
    ativo: true,
    permissoes: {
      pages: ['dashboard', 'produtos', 'pedidos', 'clientes', 'estoque', 'entregas', 'relatorios', 'usuarios', 'configuracoes'],
      actions: {
        dashboard: ['visualizar'],
        produtos: ['visualizar', 'criar', 'editar', 'excluir', 'exportar'],
        pedidos: ['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'cancelar', 'exportar', 'imprimir'],
        clientes: ['visualizar', 'criar', 'editar', 'excluir', 'exportar'],
        estoque: ['visualizar', 'editar', 'exportar'],
        entregas: ['visualizar', 'editar', 'exportar'],
        relatorios: ['visualizar', 'exportar', 'imprimir'],
        usuarios: ['visualizar', 'criar', 'editar', 'excluir'],
        configuracoes: ['visualizar', 'editar']
      }
    }
  },
  {
    nome: 'Gerente',
    descricao: 'Acesso de gerenciamento operacional',
    ativo: true,
    permissoes: {
      pages: ['dashboard', 'produtos', 'pedidos', 'clientes', 'estoque', 'entregas', 'relatorios'],
      actions: {
        dashboard: ['visualizar'],
        produtos: ['visualizar', 'criar', 'editar', 'exportar'],
        pedidos: ['visualizar', 'criar', 'editar', 'aprovar', 'exportar', 'imprimir'],
        clientes: ['visualizar', 'criar', 'editar', 'exportar'],
        estoque: ['visualizar', 'editar', 'exportar'],
        entregas: ['visualizar', 'editar', 'exportar'],
        relatorios: ['visualizar', 'exportar', 'imprimir']
      }
    }
  },
  {
    nome: 'Vendedor',
    descricao: 'Acesso para vendas e atendimento',
    ativo: true,
    permissoes: {
      pages: ['dashboard', 'produtos', 'pedidos', 'clientes'],
      actions: {
        dashboard: ['visualizar'],
        produtos: ['visualizar'],
        pedidos: ['visualizar', 'criar', 'editar'],
        clientes: ['visualizar', 'criar', 'editar']
      }
    }
  },
  {
    nome: 'Operacional',
    descricao: 'Acesso para produção e estoque',
    ativo: true,
    permissoes: {
      pages: ['dashboard', 'produtos', 'pedidos', 'estoque', 'entregas'],
      actions: {
        dashboard: ['visualizar'],
        produtos: ['visualizar'],
        pedidos: ['visualizar', 'editar'],
        estoque: ['visualizar', 'editar'],
        entregas: ['visualizar', 'editar']
      }
    }
  }
]; 