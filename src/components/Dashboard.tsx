import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  getDashboardMainStats, 
  getPedidosRecentes, 
  getAlertas, 
  DashboardStats, 
  PedidoRecente, 
  Alerta 
} from '@/services/supabaseDashboard';
import { useNavigation } from '@/contexts/NavigationContext';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pedidosRecentes, setPedidosRecentes] = useState<PedidoRecente[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const { setActivePage } = useNavigation();

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        const [dadosStats, dadosPedidos, dadosAlertas] = await Promise.all([
          getDashboardMainStats(),
          getPedidosRecentes(),
          getAlertas()
        ]);
        
        setStats(dadosStats);
        setPedidosRecentes(dadosPedidos);
        setAlertas(dadosAlertas);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarPercentual = (valor: number): string => {
    const sinal = valor >= 0 ? '+' : '';
    return `${sinal}${valor.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "entregue": 
      case "concluido":
        return "bg-green-100 text-green-800";
      case "pronto": 
        return "bg-blue-100 text-blue-800";
      case "em_preparo": 
        return "bg-yellow-100 text-yellow-800";
      case "pendente":
      case "recebido": 
        return "bg-gray-100 text-gray-800";
      default: 
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status.toLowerCase()) {
      case "em_preparo": return "Em Preparo";
      case "pronto": return "Pronto";
      case "entregue": return "Entregue";
      case "concluido": return "Concluído";
      case "pendente": return "Pendente";
      default: return status;
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'bg-red-100';
      case 'media': return 'bg-yellow-100';
      case 'baixa': return 'bg-blue-100';
      default: return 'bg-gray-100';
    }
  };

  const getPrioridadeIconColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return 'text-red-600';
      case 'media': return 'text-yellow-600';
      case 'baixa': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  // Funções para as ações rápidas
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'novo-pedido':
        setActivePage('orders');
        break;
      case 'cadastrar-produto':
        setActivePage('products');
        break;
      case 'novo-cliente':
        setActivePage('customers');
        break;
      case 'relatorio':
        setActivePage('reports');
        break;
      default:
        console.log('Ação não implementada:', action);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Vendas Hoje",
      value: formatarMoeda(stats?.vendas_hoje || 0),
      description: `${formatarPercentual(stats?.variacao_vendas || 0)} desde ontem`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pedidos Ativos",
      value: (stats?.pedidos_ativos || 0).toString(),
      description: `${stats?.pedidos_preparo || 0} em preparo`,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Produtos",
      value: (stats?.total_produtos || 0).toString(),
      description: `${stats?.produtos_estoque_baixo || 0} com baixo estoque`,
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Clientes",
      value: (stats?.total_clientes || 0).toString(),
      description: `${stats?.novos_clientes_semana || 0} novos esta semana`,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-600">Visão geral da sua loja</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Pedidos Recentes
            </CardTitle>
            <CardDescription>Últimos pedidos do dia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pedidosRecentes.length > 0 ? (
                pedidosRecentes.map((pedido) => (
                  <div key={pedido.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {pedido.numero_pedido.slice(-2)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{pedido.cliente_nome}</p>
                        <p className="text-sm text-gray-600">{new Date(pedido.data_pedido).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {formatarMoeda(pedido.valor_total)}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(pedido.status)}>
                      {getStatusLabel(pedido.status)}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum pedido hoje</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alertas e Notificações
            </CardTitle>
            <CardDescription>Itens que precisam de atenção</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alertas.length > 0 ? (
                alertas.map((alerta, index) => (
                  <div key={index} className={`flex items-start gap-3 p-3 border rounded-lg ${getPrioridadeColor(alerta.prioridade)} border-opacity-50`}>
                    <div className={`p-1 rounded-full ${getPrioridadeColor(alerta.prioridade)}`}>
                      <AlertTriangle className={`w-4 h-4 ${getPrioridadeIconColor(alerta.prioridade)}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{alerta.descricao}</p>
                      <p className="text-xs text-gray-600 capitalize">{alerta.tipo} • {alerta.prioridade} prioridade</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum alerta no momento</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesso rápido às principais funcionalidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Novo Pedido", icon: ShoppingCart, color: "from-blue-500 to-cyan-500", action: "novo-pedido" },
              { name: "Cadastrar Produto", icon: Package, color: "from-green-500 to-emerald-500", action: "cadastrar-produto" },
              { name: "Novo Cliente", icon: Users, color: "from-purple-500 to-pink-500", action: "novo-cliente" },
              { name: "Relatório", icon: TrendingUp, color: "from-orange-500 to-red-500", action: "relatorio" },
            ].map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action.action)}
                className={`p-4 bg-gradient-to-r ${action.color} text-white rounded-lg hover:scale-105 transition-transform duration-200 shadow-md hover:shadow-lg`}
              >
                <action.icon className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">{action.name}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
