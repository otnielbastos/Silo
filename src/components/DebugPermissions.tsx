import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

export const DebugPermissions: React.FC = () => {
  const { user } = useAuth();
  const { permissions, loading, hasPageAccess, hasActionAccess } = usePermissions();

  return (
    <div className="fixed top-4 right-4 bg-black text-white p-3 rounded-lg text-xs max-w-sm z-50 opacity-95">
      <h3 className="font-bold mb-2 text-yellow-300">🔍 DEBUG</h3>
      
      <div className="space-y-1">
        <div><strong>User:</strong> {user?.nome} ({user?.perfil})</div>
        <div><strong>Loading:</strong> {loading ? '⏳ SIM' : '✅ NÃO'}</div>
        <div><strong>Has Permissions:</strong> {permissions ? '✅ SIM' : '❌ NÃO'}</div>
        
        <div className="border-t border-gray-600 pt-2 mt-2">
          <div><strong>Testes:</strong></div>
          <div>• Dashboard: {hasPageAccess('dashboard') ? '✅' : '❌'}</div>
          <div>• Usuários: {hasPageAccess('usuarios') ? '✅' : '❌'}</div>
          <div>• Usuários+View: {hasActionAccess('usuarios', 'visualizar') ? '✅' : '❌'}</div>
        </div>
        
        <div className="border-t border-gray-600 pt-2 mt-2">
          <div><strong>Storage:</strong></div>
          <div>• Token: {localStorage.getItem('token') ? '✅' : '❌'}</div>
          <div>• User: {localStorage.getItem('user') ? '✅' : '❌'}</div>
        </div>
        
        {permissions && (
          <div className="border-t border-gray-600 pt-2 mt-2">
            <div><strong>Pages:</strong> {permissions.pages?.length || 0}</div>
            <div className="text-xs text-gray-300">
              {permissions.pages?.join(', ') || 'Nenhuma'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 