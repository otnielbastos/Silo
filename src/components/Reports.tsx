
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, TrendingUp, DollarSign, Calendar, Download, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

export function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  
  const salesData = [
    { day: "Seg", vendas: 180, pedidos: 12 },
    { day: "Ter", vendas: 240, pedidos: 18 },
    { day: "Qua", vendas: 320, pedidos: 22 },
    { day: "Qui", vendas: 280, pedidos: 15 },
    { day: "Sex", vendas: 450, pedidos: 28 },
    { day: "Sáb", vendas: 520, pedidos: 35 },
    { day: "Dom", vendas: 380, pedidos: 25 },
  ];

  const topProducts = [
    { name: "Pão Francês", sold: 156, revenue: "R$ 109,20" },
    { name: "Refrigerante 2L", sold: 45, revenue: "R$ 400,50" },
    { name: "Leite 1L", sold: 38, revenue: "R$ 220,40" },
    { name: "Açúcar 1kg", sold: 28, revenue: "R$ 126,00" },
  ];

  const paymentMethods = [
    { name: "PIX", value: 45, color: "#10B981" },
    { name: "Cartão Crédito", value: 30, color: "#3B82F6" },
    { name: "Dinheiro", value: 20, color: "#F59E0B" },
    { name: "Cartão Débito", value: 5, color: "#EF4444" },
  ];

  const neighborhoods = [
    { name: "Centro", orders: 85, percentage: 40 },
    { name: "Jardim", orders: 52, percentage: 25 },
    { name: "Vila Nova", orders: 38, percentage: 18 },
    { name: "Outros", orders: 35, percentage: 17 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-8 h-8" />
            Relatórios
          </h2>
          <p className="text-gray-600">Análise completa do desempenho da loja</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Últimos 7 dias", value: "7d" },
              { label: "Últimos 30 dias", value: "30d" },
              { label: "Este mês", value: "month" },
              { label: "Personalizado", value: "custom" },
            ].map((period) => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? "default" : "outline"}
                onClick={() => setSelectedPeriod(period.value)}
                className={selectedPeriod === period.value ? "bg-gradient-to-r from-blue-500 to-purple-600" : ""}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Receita Total",
            value: "R$ 2.890,00",
            change: "+15.3%",
            changeType: "positive",
            icon: DollarSign,
            color: "text-green-600",
            bgColor: "bg-green-100",
          },
          {
            title: "Pedidos",
            value: "155",
            change: "+8.2%",
            changeType: "positive",
            icon: BarChart3,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
          },
          {
            title: "Ticket Médio",
            value: "R$ 18,65",
            change: "+2.1%",
            changeType: "positive",
            icon: TrendingUp,
            color: "text-purple-600",
            bgColor: "bg-purple-100",
          },
          {
            title: "Taxa Conversão",
            value: "3.2%",
            change: "-0.5%",
            changeType: "negative",
            icon: Calendar,
            color: "text-orange-600",
            bgColor: "bg-orange-100",
          },
        ].map((kpi, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-800">{kpi.value}</p>
                  <p className={`text-xs ${kpi.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                    {kpi.change} vs período anterior
                  </p>
                </div>
                <div className={`p-3 rounded-full ${kpi.bgColor}`}>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Vendas por Dia</CardTitle>
            <CardDescription>Receita e número de pedidos dos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Bar dataKey="vendas" fill="#3B82F6" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Métodos de Pagamento</CardTitle>
            <CardDescription>Distribuição dos métodos de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>Ranking dos produtos por quantidade vendida</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.sold} unidades</p>
                    </div>
                  </div>
                  <p className="font-bold text-green-600">{product.revenue}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Neighborhoods */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Entregas por Bairro</CardTitle>
            <CardDescription>Distribuição geográfica dos pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {neighborhoods.map((neighborhood, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-800">{neighborhood.name}</span>
                    <span className="text-sm text-gray-600">{neighborhood.orders} pedidos</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${neighborhood.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{neighborhood.percentage}% do total</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Exportar Relatórios</CardTitle>
          <CardDescription>Baixe relatórios detalhados em diferentes formatos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start">
              <Download className="w-4 h-4 mr-2" />
              Relatório de Vendas (PDF)
            </Button>
            <Button variant="outline" className="justify-start">
              <Download className="w-4 h-4 mr-2" />
              Dados de Produtos (Excel)
            </Button>
            <Button variant="outline" className="justify-start">
              <Download className="w-4 h-4 mr-2" />
              Relatório Financeiro (PDF)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
