import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Package, 
  ShoppingCart, 
  UserCheck, 
  BarChart3, 
  Settings, 
  LogOut,
  Shield,
  ChevronDown
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHome from '@/pages/DashboardHome';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Reports from '@/components/Reports';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  requiredPermission?: {
    recurso: string;
    acao: string;
  };
  requiredRole?: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: 'Início',
    icon: <Home className="h-4 w-4" />,
    path: '/dashboard'
  },
  {
    id: 'users',
    label: 'Usuários',
    icon: <Users className="h-4 w-4" />,
    path: '/dashboard/users',
    requiredPermission: { recurso: 'usuarios', acao: 'read' }
  },
  {
    id: 'clients',
    label: 'Clientes',
    icon: <UserCheck className="h-4 w-4" />,
    path: '/dashboard/clients',
    requiredPermission: { recurso: 'clientes', acao: 'read' }
  },
  {
    id: 'products',
    label: 'Produtos',
    icon: <Package className="h-4 w-4" />,
    path: '/dashboard/products',
    requiredPermission: { recurso: 'produtos', acao: 'read' }
  },
  {
    id: 'orders',
    label: 'Pedidos',
    icon: <ShoppingCart className="h-4 w-4" />,
    path: '/dashboard/orders',
    requiredPermission: { recurso: 'pedidos', acao: 'read' }
  },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: <BarChart3 className="h-4 w-4" />,
    path: '/dashboard/reports',
    requiredPermission: { recurso: 'relatorios', acao: 'read' }
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: <Settings className="h-4 w-4" />,
    path: '/dashboard/settings'
  }
];

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, checkPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getVisibleMenuItems = () => {
    return menuItems.filter(item => {
      if (item.requiredPermission) {
        return checkPermission(item.requiredPermission.recurso, item.requiredPermission.acao);
      }
      return true;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrador':
        return 'bg-red-100 text-red-800';
      case 'Gerente':
        return 'bg-blue-100 text-blue-800';
      case 'Vendedor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isCurrentPath = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">SiloSystem</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user ? getInitials(user.nome) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.nome}
              </p>
              <Badge variant="secondary" className={`text-xs ${getRoleColor(user?.perfil || '')}`}>
                {user?.perfil}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {getVisibleMenuItems().map((item) => (
            <Button
              key={item.id}
              variant={isCurrentPath(item.path) ? "default" : "ghost"}
              className={`w-full justify-start ${
                isCurrentPath(item.path) 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
            >
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </Button>
          ))}
        </nav>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold text-gray-900">
                {menuItems.find(item => isCurrentPath(item.path))?.label || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user ? getInitials(user.nome) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium">{user?.nome}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{user?.nome}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <Badge variant="outline" className={`mt-1 text-xs ${getRoleColor(user?.perfil || '')}`}>
                        {user?.perfil}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6">
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route 
              path="users/*" 
              element={
                <ProtectedRoute requiredPermission={{ recurso: 'usuarios', acao: 'read' }}>
                  <div className="text-center py-8">
                    <h2 className="text-2xl font-bold">Gerenciamento de Usuários</h2>
                    <p className="text-muted-foreground">Em desenvolvimento...</p>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="clients/*" 
              element={
                <ProtectedRoute requiredPermission={{ recurso: 'clientes', acao: 'read' }}>
                  <div className="text-center py-8">
                    <h2 className="text-2xl font-bold">Gerenciamento de Clientes</h2>
                    <p className="text-muted-foreground">Em desenvolvimento...</p>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="products/*" 
              element={
                <ProtectedRoute requiredPermission={{ recurso: 'produtos', acao: 'read' }}>
                  <div className="text-center py-8">
                    <h2 className="text-2xl font-bold">Gerenciamento de Produtos</h2>
                    <p className="text-muted-foreground">Em desenvolvimento...</p>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="orders/*" 
              element={
                <ProtectedRoute requiredPermission={{ recurso: 'pedidos', acao: 'read' }}>
                  <div className="text-center py-8">
                    <h2 className="text-2xl font-bold">Gerenciamento de Pedidos</h2>
                    <p className="text-muted-foreground">Em desenvolvimento...</p>
                  </div>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="reports/*" 
              element={
                <ProtectedRoute requiredPermission={{ recurso: 'relatorios', acao: 'read' }}>
                  <Reports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="settings/*" 
              element={
                <div className="text-center py-8">
                  <h2 className="text-2xl font-bold">Configurações</h2>
                  <p className="text-muted-foreground">Em desenvolvimento...</p>
                </div>
              } 
            />
            <Route 
              path="profile/*" 
              element={
                <div className="text-center py-8">
                  <h2 className="text-2xl font-bold">Meu Perfil</h2>
                  <p className="text-muted-foreground">Em desenvolvimento...</p>
                </div>
              } 
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 