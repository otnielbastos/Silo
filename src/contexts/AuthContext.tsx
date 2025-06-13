import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { authService } from '../services/supabaseAuth';
import api from '../services/api';

// Tipos
export interface User {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  perfil_id?: number;
  permissoes: {
    [key: string]: string[];
  };
}

export interface LoginData {
  email: string;
  password?: string;
  senha?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<boolean>;
  logout: () => void;
  checkPermission: (recurso: string, acao: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Verificar se há token salvo e validar
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          // Verificar se o token ainda é válido
          const result = await authService.verifyToken();
          
          if (result.success && result.data.valid) {
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        // Limpar dados inválidos
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (loginData: LoginData): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const result = await authService.login(loginData);
      
      if (result.success) {
        setUser(result.data.user);
        toast.success('Login realizado com sucesso!');
        return true;
      } else {
        toast.error(result.message || 'Erro no login');
        return false;
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      
      const errorMessage = error.message || 'Erro no servidor';
      toast.error(errorMessage);
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Erro no logout:', error);
      // Limpar dados locais mesmo em caso de erro
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      toast.success('Logout realizado com sucesso!');
    }
  };

  const checkPermission = (recurso: string, acao: string): boolean => {
    if (!user || !user.permissoes) {
      return false;
    }
    
    // Verificar se está no novo formato (com pages e actions)
    if (user.permissoes.pages && user.permissoes.actions) {
      const permissoesRecurso = user.permissoes.actions[recurso];
      return permissoesRecurso ? permissoesRecurso.includes(acao) : false;
    }
    
    // Fallback para formato antigo (compatibilidade)
    const permissoesRecurso = user.permissoes[recurso];
    return permissoesRecurso ? permissoesRecurso.includes(acao) : false;
  };

  const hasRole = (role: string): boolean => {
    return user?.perfil === role;
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para facilitar o uso da API autenticada (agora usando Supabase)
export const useApi = () => {
  return api;
}; 