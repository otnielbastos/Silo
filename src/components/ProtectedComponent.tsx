import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PagePermission, ActionPermission } from '@/types/permissions';
import { Shield, Lock } from 'lucide-react';

interface ProtectedComponentProps {
  children: React.ReactNode;
  page: PagePermission;
  action?: ActionPermission;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  children,
  page,
  action = 'visualizar',
  fallback,
  showFallback = true
}) => {
  const { hasPageAccess, hasActionAccess, loading } = usePermissions();

  // Mostrar loading enquanto carrega permissões
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Verificar se tem acesso à página
  if (!hasPageAccess(page)) {
    if (!showFallback) return null;
    
    return fallback || (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Shield className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Acesso Negado</h3>
        <p className="text-gray-500 mb-1">Você não tem permissão para acessar esta página.</p>
        <p className="text-sm text-gray-400">Contate o administrador se precisar de acesso.</p>
      </div>
    );
  }

  // Verificar se tem acesso à ação específica
  if (!hasActionAccess(page, action)) {
    if (!showFallback) return null;
    
    return fallback || (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Lock className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Ação Não Permitida</h3>
        <p className="text-gray-500 mb-1">Você não tem permissão para realizar esta ação.</p>
        <p className="text-sm text-gray-400">Permissão necessária: {action}</p>
      </div>
    );
  }

  // Renderizar o conteúdo se tiver permissão
  return <>{children}</>;
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