import { Package, ShoppingCart, Users, BarChart3, Truck, Warehouse, Home, Settings, LogOut, User, UserCog } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ActivePage } from "@/pages/Index";

interface AppSidebarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
}

const menuItems = [
  {
    title: "Dashboard",
    url: "dashboard",
    icon: Home,
    permission: null, // Sempre visível
  },
  {
    title: "Produtos",
    url: "products",
    icon: Package,
    permission: { recurso: 'produtos', acao: 'listar' },
  },
  {
    title: "Pedidos",
    url: "orders",
    icon: ShoppingCart,
    permission: { recurso: 'pedidos', acao: 'listar' },
  },
  {
    title: "Clientes",
    url: "customers",
    icon: Users,
    permission: { recurso: 'clientes', acao: 'listar' },
  },
  {
    title: "Estoque",
    url: "stock",
    icon: Warehouse,
    permission: { recurso: 'estoque', acao: 'listar' },
  },
  {
    title: "Entregas",
    url: "deliveries",
    icon: Truck,
    permission: { recurso: 'entregas', acao: 'listar' },
  },
  {
    title: "Relatórios",
    url: "reports",
    icon: BarChart3,
    permission: { recurso: 'relatorios', acao: 'listar' },
  },
  {
    title: "Usuários",
    url: "users",
    icon: UserCog,
    permission: { recurso: 'usuarios', acao: 'listar' },
  },
];

export function AppSidebar({ activePage, setActivePage }: AppSidebarProps) {
  const { user, logout, checkPermission } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Filtrar itens do menu baseado nas permissões do usuário
  const visibleMenuItems = menuItems.filter(item => {
    if (!item.permission) return true; // Sempre visível (como Dashboard)
    return checkPermission(item.permission.recurso, item.permission.acao);
  });

  return (
    <Sidebar className="border-r-0 shadow-lg">
      <SidebarHeader className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">SiloSystem</h2>
            <p className="text-xs text-gray-600">Sistema Completo</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={activePage === item.url}
                    className={`w-full transition-all duration-200 ${
                      activePage === item.url
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <button
                      onClick={() => setActivePage(item.url as ActivePage)}
                      className="flex items-center gap-3 w-full"
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-gray-200 space-y-3">
        {/* Informações do usuário */}
        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{user?.nome}</p>
            <p className="text-xs text-gray-600 truncate">{user?.perfil}</p>
          </div>
        </div>
        
        {/* Botão de logout */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-gray-600 hover:text-red-600 hover:border-red-300"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sair</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
