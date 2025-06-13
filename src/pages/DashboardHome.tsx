import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserCheck, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Shield,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats, getAtividadesRecentes, DashboardStats, AtividadeRecente } from '@/services/supabaseDashboard';

const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [atividades, setAtividades] = useState<AtividadeRecente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [dadosStats, dadosAtividades] = await Promise.all([
          getDashboardStats(),
          getAtividadesRecentes()
        ]);
        setStats(dadosStats);
        setAtividades(dadosAtividades);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

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

  const getPermissionCount = () => {
    if (!user?.permissoes) return 0;
    return Object.values(user.permissoes).flat().length;
  };

  const statsCards = [
    {
      title: 'Usuários Ativos',
      value: stats?.usuariosAtivos.toString() || '0',
      icon: <Users className="h-4 w-4" />,
      change: `+${stats?.mudancaUsuarios || 0}`,
      changeType: 'positive'
    },
    {
      title: 'Clientes',
      value: stats?.totalClientes.toString() || '0',
      icon: <UserCheck className="h-4 w-4" />,
      change: `+${stats?.mudancaClientes || 0}`,
      changeType: 'positive'
    },
    {
      title: 'Produtos',
      value: stats?.totalProdutos.toString() || '0',
      icon: <Package className="h-4 w-4" />,
      change: `+${stats?.mudancaProdutos || 0}`,
      changeType: 'positive'
    },
    {
      title: 'Pedidos Hoje',
      value: stats?.pedidosHoje.toString() || '0',
      icon: <ShoppingCart className="h-4 w-4" />,
      change: `+${stats?.mudancaPedidos || 0}`,
      changeType: 'positive'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Boas-vindas */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Bem-vindo, {user?.nome}! 👋
            </h1>
            <p className="text-blue-100 mt-1">
              Aqui está o resumo do seu sistema hoje
            </p>
          </div>
          <div className="text-right">
            <Badge className={`${getRoleColor(user?.perfil || '')} border-0`}>
              {user?.perfil}
            </Badge>
            <p className="text-xs text-blue-100 mt-1">
              {getPermissionCount()} permissões ativas
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={`${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>{' '}
                desde ontem
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atividades Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Atividades Recentes</span>
            </CardTitle>
            <CardDescription>
              Últimas ações realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {atividades.map((atividade, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{atividade.usuario}</span>{' '}
                      {atividade.acao}{' '}
                      <span className="font-medium">{atividade.alvo}</span>
                    </p>
                    <p className="text-xs text-gray-500">{atividade.tempo}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Status do Sistema</span>
            </CardTitle>
            <CardDescription>
              Informações sobre segurança e performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Sistema de Segurança</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Ativo
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Autenticação JWT</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Funcionando
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Auditoria</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Ativa
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Rate Limiting</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Configurado
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações de Permissões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Suas Permissões</span>
          </CardTitle>
          <CardDescription>
            Recursos que você tem acesso no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user?.permissoes && Object.entries(user.permissoes).map(([recurso, acoes]) => (
              <div key={recurso} className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm mb-2 capitalize">{recurso}</h4>
                <div className="flex flex-wrap gap-1">
                  {acoes.length > 0 ? (
                    acoes.map((acao) => (
                      <Badge key={acao} variant="outline" className="text-xs">
                        {acao}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Sem acesso
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome; 