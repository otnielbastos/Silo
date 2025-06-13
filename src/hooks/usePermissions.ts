import { useState, useEffect } from 'react';
import { PagePermission, ActionPermission, PermissionSet } from '../types/permissions';
import { useAuth } from '../contexts/AuthContext';

// Hook principal para verificar permissões
export const usePermissions = () => {
  const { user } = useAuth();
  const [userPermissions, setUserPermissions] = useState<PermissionSet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserPermissions = () => {
      console.log('🔐 Carregando permissões para:', user?.nome, `(${user?.perfil})`);

      if (!user) {
        console.log('❌ Usuário não encontrado');
        setUserPermissions(null);
        setLoading(false);
        return;
      }

      // Usar as permissões reais do usuário vindas do banco
      if (user.permissoes && typeof user.permissoes === 'object') {
        console.log('✅ Usando permissões reais do banco de dados');
        console.log('📋 Permissões do usuário:', JSON.stringify(user.permissoes, null, 2));
        
        // Converter as permissões do formato do banco para o formato esperado
        const realPermissions: PermissionSet = {
          pages: (user.permissoes.pages || []) as PagePermission[],
          actions: (user.permissoes.actions || {}) as Record<PagePermission, ActionPermission[]>
        };
        
        setUserPermissions(realPermissions);
        setLoading(false);
        return;
      }

      // Fallback para administradores (caso as permissões não venham do banco)
      if (user.perfil === 'Administrador' || user.perfil === 'administrador' || user.perfil === 'admin') {
        console.log('⚠️ FALLBACK: Administrador sem permissões do banco - usando fallback');
        const adminPermissions: PermissionSet = {
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
        };
        
        setUserPermissions(adminPermissions);
        setLoading(false);
        return;
      }

      // Para outros perfis, acesso limitado
      console.log('⚠️ Perfil limitado - acesso restrito aplicado');
      const limitedPermissions: PermissionSet = {
        pages: ['dashboard'],
        actions: {
          dashboard: ['visualizar']
        }
      };
      
      setUserPermissions(limitedPermissions);
      setLoading(false);
    };

    // Executar imediatamente
    loadUserPermissions();
  }, [user]);

  const hasPageAccess = (page: PagePermission): boolean => {
    // Se ainda está carregando, negar acesso
    if (loading) {
      console.log('⏳ Ainda carregando permissões, negando acesso temporariamente');
      return false;
    }
    
    // Se não tem permissões, negar acesso
    if (!userPermissions) {
      console.log('❌ Sem permissões definidas, negando acesso');
      return false;
    }
    
    // Verificar se a página está na lista de páginas permitidas
    const hasAccess = userPermissions.pages?.includes(page) || false;
    console.log(`🔍 Verificando acesso à página "${page}":`, hasAccess ? '✅ PERMITIDO' : '❌ NEGADO');
    console.log(`📋 Páginas disponíveis:`, userPermissions.pages);
    return hasAccess;
  };

  const hasActionAccess = (page: PagePermission, action: ActionPermission): boolean => {
    // Se ainda está carregando, negar acesso
    if (loading) {
      console.log('⏳ Ainda carregando permissões, negando ação temporariamente');
      return false;
    }
    
    // Se não tem permissões, negar acesso
    if (!userPermissions) {
      console.log('❌ Sem permissões definidas, negando ação');
      return false;
    }
    
    // Primeiro verificar se tem acesso à página
    if (!hasPageAccess(page)) {
      console.log(`❌ Sem acesso à página "${page}", negando ação "${action}"`);
      return false;
    }
    
    // Verificar se tem a ação específica
    const pageActions = userPermissions.actions?.[page] || [];
    const hasAccess = pageActions.includes(action);
    console.log(`🔍 Verificando ação "${action}" na página "${page}":`, hasAccess ? '✅ PERMITIDO' : '❌ NEGADO');
    console.log(`📋 Ações disponíveis para "${page}":`, pageActions);
    return hasAccess;
  };

  const refreshPermissions = async () => {
    setLoading(true);
    // O useEffect será executado novamente
  };

  return {
    permissions: userPermissions,
    loading,
    hasPageAccess,
    hasActionAccess,
    refreshPermissions
  };
};

// Hook para verificar permissões de forma mais simples
export const usePageAccess = (page: PagePermission, action: ActionPermission = 'visualizar') => {
  const { hasPageAccess, hasActionAccess, loading } = usePermissions();
  
  return {
    hasAccess: hasPageAccess(page) && hasActionAccess(page, action),
    hasPageAccess: hasPageAccess(page),
    hasActionAccess: (actionToCheck: ActionPermission) => hasActionAccess(page, actionToCheck),
    loading
  };
};

// Hook para verificar permissões de uma página específica
export const usePagePermission = (page: PagePermission) => {
  const { hasActionAccess } = usePermissions();
  
  return {
    canView: hasActionAccess(page, 'visualizar'),
    canCreate: hasActionAccess(page, 'criar'),
    canEdit: hasActionAccess(page, 'editar'),
    canDelete: hasActionAccess(page, 'excluir'),
    canApprove: hasActionAccess(page, 'aprovar'),
    canCancel: hasActionAccess(page, 'cancelar'),
    canExport: hasActionAccess(page, 'exportar'),
    canPrint: hasActionAccess(page, 'imprimir'),
    loading: false
  };
}; 