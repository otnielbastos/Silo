
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Dashboard() {
  const stats = [
    {
      title: "Vendas Hoje",
      value: "R$ 2.847,00",
      description: "+12% desde ontem",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pedidos Ativos",
      value: "23",
      description: "8 em preparo",
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Produtos",
      value: "156",
      description: "12 com baixo estoque",
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Clientes",
      value: "89",
      description: "5 novos esta semana",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  const recentOrders = [
    { id: "#001", customer: "João Silva", total: "R$ 45,90", status: "Em preparo", time: "10:30" },
    { id: "#002", customer: "Maria Santos", total: "R$ 78,50", status: "Pronto", time: "10:15" },
    { id: "#003", customer: "Pedro Costa", total: "R$ 32,00", status: "Entregue", time: "09:45" },
    { id: "#004", customer: "Ana Oliveira", total: "R$ 56,80", status: "Recebido", time: "09:30" },
  ];

  const alerts = [
    { type: "stock", message: "Produto 'Açúcar 1kg' com estoque baixo (3 unidades)", priority: "high" },
    { type: "order", message: "5 encomendas para hoje", priority: "medium" },
    { type: "delivery", message: "3 entregas pendentes no Bairro Centro", priority: "medium" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Entregue": return "bg-green-100 text-green-800";
      case "Pronto": return "bg-blue-100 text-blue-800";
      case "Em preparo": return "bg-yellow-100 text-yellow-800";
      case "Recebido": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-600">Visão geral da sua loja</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
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
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {order.id.slice(-2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{order.customer}</p>
                      <p className="text-sm text-gray-600">{order.time} - {order.total}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              ))}
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
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className={`p-1 rounded-full ${alert.priority === 'high' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                    <AlertTriangle className={`w-4 h-4 ${alert.priority === 'high' ? 'text-red-600' : 'text-yellow-600'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{alert.message}</p>
                    <p className="text-xs text-gray-600 capitalize">{alert.type} • {alert.priority} priority</p>
                  </div>
                </div>
              ))}
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
              { name: "Novo Pedido", icon: ShoppingCart, color: "from-blue-500 to-cyan-500" },
              { name: "Cadastrar Produto", icon: Package, color: "from-green-500 to-emerald-500" },
              { name: "Novo Cliente", icon: Users, color: "from-purple-500 to-pink-500" },
              { name: "Relatório", icon: TrendingUp, color: "from-orange-500 to-red-500" },
            ].map((action, index) => (
              <button
                key={index}
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
