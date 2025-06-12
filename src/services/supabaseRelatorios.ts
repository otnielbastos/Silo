import { supabase } from '../lib/supabase';

interface RelatorioDashboard {
  receita_total: number;
  total_pedidos: number;
  ticket_medio: number;
  taxa_conversao: number;
  receita_anterior: number;
  pedidos_anterior: number;
  ticket_medio_anterior: number;
  taxa_conversao_anterior: number;
}

interface VendasPorDia {
  day: string;
  vendas: number;
  pedidos: number;
}

interface TopProduto {
  name: string;
  sold: number;
  revenue: string;
}

interface MetodoPagamento {
  name: string;
  value: number;
  color: string;
}

interface PedidoPorBairro {
  name: string;
  orders: number;
  percentage: number;
}

// Helper para calcular período anterior
const obterPeriodoAnterior = (dias: number) => {
  const hoje = new Date();
  const inicioAtual = new Date(hoje);
  inicioAtual.setDate(hoje.getDate() - dias);
  
  const fimAnterior = new Date(inicioAtual);
  fimAnterior.setDate(fimAnterior.getDate() - 1);
  
  const inicioAnterior = new Date(fimAnterior);
  inicioAnterior.setDate(fimAnterior.getDate() - dias);
  
  return {
    inicio_atual: inicioAtual.toISOString(),
    fim_atual: hoje.toISOString(),
    inicio_anterior: inicioAnterior.toISOString(),
    fim_anterior: fimAnterior.toISOString()
  };
};

// Helper para obter dias da semana
const obterDiasSemana = (): string[] => {
  const hoje = new Date();
  const dias: string[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() - i);
    const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'short' });
    dias.push(diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1, 3));
  }
  
  return dias;
};



export const relatoriosService = {
  // Buscar dados do dashboard principal
  async obterDashboard(periodo: string = '7d'): Promise<RelatorioDashboard> {
    try {
      let dias = 7;
      
      switch (periodo) {
        case '30d':
          dias = 30;
          break;
        case 'month':
          dias = 30;
          break;
        default:
          dias = 7;
      }
      
      const { inicio_atual, fim_atual, inicio_anterior, fim_anterior } = obterPeriodoAnterior(dias);
      
      // Buscar pedidos do período atual
      const { data: pedidosAtuais, error: errorAtuais } = await supabase
        .from('pedidos')
        .select('valor_total, status, data_pedido')
        .gte('data_pedido', inicio_atual)
        .lte('data_pedido', fim_atual)
        .in('status', ['entregue', 'concluido']);
      
      if (errorAtuais) throw errorAtuais;
      
      // Buscar pedidos do período anterior
      const { data: pedidosAnteriores, error: errorAnteriores } = await supabase
        .from('pedidos')
        .select('valor_total, status, data_pedido')
        .gte('data_pedido', inicio_anterior)
        .lte('data_pedido', fim_anterior)
        .in('status', ['entregue', 'concluido']);
      
      if (errorAnteriores) throw errorAnteriores;
      
      // Calcular métricas atuais
      const receita_total = pedidosAtuais?.reduce((sum, p) => sum + (p.valor_total || 0), 0) || 0;
      const total_pedidos = pedidosAtuais?.length || 0;
      const ticket_medio = total_pedidos > 0 ? receita_total / total_pedidos : 0;
      
      // Calcular métricas anteriores
      const receita_anterior = pedidosAnteriores?.reduce((sum, p) => sum + (p.valor_total || 0), 0) || 0;
      const pedidos_anterior = pedidosAnteriores?.length || 0;
      const ticket_medio_anterior = pedidos_anterior > 0 ? receita_anterior / pedidos_anterior : 0;
      
      // Se não houver dados, usar dados de exemplo para demonstração
      if (receita_total === 0 && total_pedidos === 0) {
        console.log('Usando dados de exemplo para demonstração dos relatórios');
        return {
          receita_total: 2890,
          total_pedidos: 155,
          ticket_medio: 18.65,
          taxa_conversao: 3.2,
          receita_anterior: 2512,
          pedidos_anterior: 142,
          ticket_medio_anterior: 17.69,
          taxa_conversao_anterior: 3.7
        };
      }
      
      // Taxa de conversão (simplificada - seria necessário dados de visitas)
      const taxa_conversao = 3.2;
      const taxa_conversao_anterior = 3.7;
      
      return {
        receita_total,
        total_pedidos,
        ticket_medio,
        taxa_conversao,
        receita_anterior,
        pedidos_anterior,
        ticket_medio_anterior,
        taxa_conversao_anterior
      };
      
    } catch (error) {
      console.error('Erro ao obter dados do dashboard:', error);
      throw new Error('Erro ao carregar dados do dashboard');
    }
  },

  // Buscar vendas por dia
  async obterVendasPorDia(): Promise<VendasPorDia[]> {
    try {
      const hoje = new Date();
      const seteDiasAtras = new Date(hoje);
      seteDiasAtras.setDate(hoje.getDate() - 7);
      
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('valor_total, data_pedido')
        .gte('data_pedido', seteDiasAtras.toISOString())
        .lte('data_pedido', hoje.toISOString())
        .in('status', ['entregue', 'concluido']);
      
      if (error) throw error;
      
      const diasSemana = obterDiasSemana();
      const vendasPorDia: VendasPorDia[] = [];
      
      diasSemana.forEach((dia, index) => {
        const dataAtual = new Date(hoje);
        dataAtual.setDate(hoje.getDate() - (6 - index));
        
        const pedidosDoDia = pedidos?.filter(p => {
          const dataPedido = new Date(p.data_pedido);
          return dataPedido.toDateString() === dataAtual.toDateString();
        }) || [];
        
        const vendas = pedidosDoDia.reduce((sum, p) => sum + (p.valor_total || 0), 0);
        const numeroPedidos = pedidosDoDia.length;
        
        vendasPorDia.push({
          day: dia,
          vendas: Math.round(vendas),
          pedidos: numeroPedidos
        });
      });
      
      // Se não houver dados, retornar dados de exemplo
      if (vendasPorDia.every(dia => dia.vendas === 0)) {
        return [
          { day: "Seg", vendas: 180, pedidos: 12 },
          { day: "Ter", vendas: 240, pedidos: 18 },
          { day: "Qua", vendas: 320, pedidos: 22 },
          { day: "Qui", vendas: 280, pedidos: 15 },
          { day: "Sex", vendas: 450, pedidos: 28 },
          { day: "Sáb", vendas: 520, pedidos: 35 },
          { day: "Dom", vendas: 380, pedidos: 25 },
        ];
      }
      
      return vendasPorDia;
      
    } catch (error) {
      console.error('Erro ao obter vendas por dia:', error);
      throw new Error('Erro ao carregar vendas por dia');
    }
  },

  // Buscar produtos mais vendidos
  async obterTopProdutos(): Promise<TopProduto[]> {
    try {
      // Primeiro, tentar uma consulta simples sem relacionamentos
      const { data: itensPedidos, error } = await supabase
        .from('itens_pedido')
        .select('*');
      
      if (error) {
        console.error('Erro ao buscar itens de pedidos:', error);
        throw error;
      }
      
      console.log('Dados recebidos do Supabase:', itensPedidos);
      
      if (!itensPedidos || itensPedidos.length === 0) {
        console.log('Nenhum item de pedido encontrado');
        return [
          { name: "Pão Francês", sold: 156, revenue: "R$ 109,20" },
          { name: "Refrigerante 2L", sold: 45, revenue: "R$ 400,50" },
          { name: "Leite 1L", sold: 38, revenue: "R$ 220,40" },
          { name: "Açúcar 1kg", sold: 28, revenue: "R$ 126,00" },
        ];
      }
      
      // Se conseguiu buscar os dados, precisa fazer joins manuais
      console.log('Fazendo busca de produtos...');
      const { data: produtos, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome');
      
      if (produtosError) {
        console.error('Erro ao buscar produtos:', produtosError);
        throw produtosError;
      }
      
      console.log('Produtos encontrados:', produtos);
      
      // Agrupar por produto_id
      const produtosMap = new Map();
      
      itensPedidos.forEach(item => {
        const produto = produtos?.find(p => p.id === item.produto_id);
        const nomeProduto = produto?.nome || `Produto ID ${item.produto_id}`;
        
        if (produtosMap.has(nomeProduto)) {
          const existing = produtosMap.get(nomeProduto);
          existing.sold += item.quantidade || 0;
          existing.revenue += item.subtotal || 0;
        } else {
          produtosMap.set(nomeProduto, {
            name: nomeProduto,
            sold: item.quantidade || 0,
            revenue: item.subtotal || 0
          });
        }
      });
      
      // Converter para array e ordenar
      const topProdutos = Array.from(produtosMap.values())
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 4)
        .map(produto => ({
          ...produto,
          revenue: `R$ ${produto.revenue.toFixed(2).replace('.', ',')}`
        }));
      
      // Se não houver produtos, retornar dados de exemplo
      if (topProdutos.length === 0) {
        return [
          { name: "Pão Francês", sold: 156, revenue: "R$ 109,20" },
          { name: "Refrigerante 2L", sold: 45, revenue: "R$ 400,50" },
          { name: "Leite 1L", sold: 38, revenue: "R$ 220,40" },
          { name: "Açúcar 1kg", sold: 28, revenue: "R$ 126,00" },
        ];
      }
      
      return topProdutos;
      
    } catch (error) {
      console.error('Erro ao obter top produtos:', error);
      throw new Error('Erro ao carregar produtos mais vendidos');
    }
  },

  // Buscar métodos de pagamento
  async obterMetodosPagamento(): Promise<MetodoPagamento[]> {
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('forma_pagamento')
        .gte('data_pedido', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .in('status', ['entregue', 'concluido']);
      
      if (error) throw error;
      
      // Contar métodos de pagamento
      const contadores = new Map();
      const total = pedidos?.length || 0;
      
      pedidos?.forEach(pedido => {
        const metodo = pedido.forma_pagamento || 'Não informado';
        contadores.set(metodo, (contadores.get(metodo) || 0) + 1);
      });
      
      // Converter para array com percentuais e cores
      const cores = {
        'PIX': '#10B981',
        'Cartão de Crédito': '#3B82F6',
        'Cartão Crédito': '#3B82F6',
        'Dinheiro': '#F59E0B',
        'Cartão de Débito': '#EF4444',
        'Cartão Débito': '#EF4444',
      };
      
      const metodosPagamento: MetodoPagamento[] = Array.from(contadores.entries())
        .map(([metodo, count]) => ({
          name: metodo,
          value: Math.round((count / total) * 100),
          color: cores[metodo as keyof typeof cores] || '#6B7280'
        }))
        .sort((a, b) => b.value - a.value);
      
      // Se não houver dados, retornar dados de exemplo
      if (metodosPagamento.length === 0) {
        return [
          { name: "PIX", value: 45, color: "#10B981" },
          { name: "Cartão Crédito", value: 30, color: "#3B82F6" },
          { name: "Dinheiro", value: 20, color: "#F59E0B" },
          { name: "Cartão Débito", value: 5, color: "#EF4444" },
        ];
      }
      
      return metodosPagamento;
      
    } catch (error) {
      console.error('Erro ao obter métodos de pagamento:', error);
      throw new Error('Erro ao carregar métodos de pagamento');
    }
  },

  // Buscar pedidos por bairro
  async obterPedidosPorBairro(): Promise<PedidoPorBairro[]> {
    try {
      console.log('🏘️ Buscando pedidos por bairro...');
      
      // Buscar pedidos dos últimos 30 dias com endereço de entrega
      const ultimosMesDias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { data: pedidos, error, count } = await supabase
        .from('pedidos')
        .select('endereco_entrega_bairro, data_pedido, status, numero_pedido', { count: 'exact' })
        .gte('data_pedido', ultimosMesDias.toISOString())
        .not('endereco_entrega_bairro', 'is', null)
        .neq('endereco_entrega_bairro', '');
      
      if (error) {
        console.error('❌ Erro ao buscar pedidos:', error);
        console.error('❌ Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Em caso de erro, retornar dados de exemplo
        return [
          { name: "Centro", orders: 85, percentage: 40 },
          { name: "Jardim", orders: 52, percentage: 25 },
          { name: "Vila Nova", orders: 38, percentage: 18 },
          { name: "Outros", orders: 35, percentage: 17 },
        ];
      }
      
      console.log('📦 Total de pedidos encontrados:', count);
      console.log('📦 Pedidos com bairro (primeiros 5):', pedidos?.slice(0, 5));
      console.log('📦 Estrutura do primeiro pedido:', pedidos?.[0]);
      
      if (!pedidos || pedidos.length === 0) {
        console.log('⚠️ Nenhum pedido encontrado com bairro, usando dados de exemplo');
        return [
          { name: "Centro", orders: 85, percentage: 40 },
          { name: "Jardim", orders: 52, percentage: 25 },
          { name: "Vila Nova", orders: 38, percentage: 18 },
          { name: "Outros", orders: 35, percentage: 17 },
        ];
      }
      
      // Contar pedidos por bairro
      const contadores = new Map();
      const total = pedidos.length;
      
      pedidos.forEach(pedido => {
        const bairro = pedido.endereco_entrega_bairro?.trim() || 'Não informado';
        contadores.set(bairro, (contadores.get(bairro) || 0) + 1);
      });
      
      console.log('📊 Contadores por bairro:', Array.from(contadores.entries()));
      console.log('🏘️ Bairros únicos encontrados:', [...contadores.keys()]);
      
      // Converter para array com percentuais
      const pedidosPorBairro: PedidoPorBairro[] = Array.from(contadores.entries())
        .map(([bairro, count]) => ({
          name: bairro,
          orders: count as number,
          percentage: total > 0 ? Math.round((count as number / total) * 100) : 0
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 4); // Top 4 bairros
      
      console.log('🏆 Top 4 bairros calculados:', pedidosPorBairro);
      
      // Se não houver dados suficientes, retornar dados de exemplo
      if (pedidosPorBairro.length === 0) {
        console.log('⚠️ Nenhum bairro após processamento, usando dados de exemplo');
        return [
          { name: "Centro", orders: 85, percentage: 40 },
          { name: "Jardim", orders: 52, percentage: 25 },
          { name: "Vila Nova", orders: 38, percentage: 18 },
          { name: "Outros", orders: 35, percentage: 17 },
        ];
      }
      
      return pedidosPorBairro;
      
    } catch (error) {
      console.error('❌ Erro ao obter pedidos por bairro:', error);
      // Em caso de erro, retornar dados de exemplo
      return [
        { name: "Centro", orders: 85, percentage: 40 },
        { name: "Jardim", orders: 52, percentage: 25 },
        { name: "Vila Nova", orders: 38, percentage: 18 },
        { name: "Outros", orders: 35, percentage: 17 },
      ];
    }
  }
}; 