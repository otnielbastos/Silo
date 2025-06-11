import { useState, useEffect } from "react";
import api from "@/services/api";

export interface Customer {
  id: number;
  nome: string;
  email?: string;
  telefone: string;
  cpf_cnpj?: string;
  tipo_pessoa?: 'fisica' | 'juridica';
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_cep?: string;
  observacoes?: string;
  status: 'ativo' | 'inativo';
  data_cadastro: string;
  total_pedidos: number;
  ultimo_pedido: string;
  total_gasto: number;
  
  // Campos calculados para compatibilidade com frontend atual
  name: string;
  phone: string;
  address: string;
  neighborhood: string;
  orders: number;
  lastOrder: string;
  totalSpent: number;
  notes?: string;
  customerStatus: "VIP" | "Ativo" | "Novo" | "Inativo";
}

// Função para mapear dados do backend para o frontend
const mapCustomerFromBackend = (backendCustomer: any): Customer => {
  // Determinar status baseado em dados
  let customerStatus: "VIP" | "Ativo" | "Novo" | "Inativo" = "Ativo";
  
  // Garantir que os valores sejam números válidos
  const totalGasto = parseFloat(backendCustomer.total_gasto) || 0;
  const totalPedidos = parseInt(backendCustomer.total_pedidos) || 0;
  
  if (backendCustomer.status === 'inativo') {
    customerStatus = "Inativo";
  } else if (totalGasto > 500) {
    customerStatus = "VIP";
  } else if (backendCustomer.data_cadastro && new Date(backendCustomer.data_cadastro) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
    customerStatus = "Novo";
  }

  const address = [
    backendCustomer.endereco_rua,
    backendCustomer.endereco_numero
  ].filter(Boolean).join(', ');

  // Formatar data do último pedido
  let lastOrderFormatted = '';
  if (backendCustomer.ultimo_pedido && backendCustomer.ultimo_pedido !== '') {
    try {
      lastOrderFormatted = new Date(backendCustomer.ultimo_pedido).toISOString().split('T')[0];
    } catch (e) {
      lastOrderFormatted = '';
    }
  }

  return {
    // Campos do backend
    id: backendCustomer.id,
    nome: backendCustomer.nome || '',
    email: backendCustomer.email || '',
    telefone: backendCustomer.telefone || '',
    cpf_cnpj: backendCustomer.cpf_cnpj || '',
    tipo_pessoa: backendCustomer.tipo_pessoa || 'fisica',
    endereco_rua: backendCustomer.endereco_rua || '',
    endereco_numero: backendCustomer.endereco_numero || '',
    endereco_complemento: backendCustomer.endereco_complemento || '',
    endereco_bairro: backendCustomer.endereco_bairro || '',
    endereco_cidade: backendCustomer.endereco_cidade || '',
    endereco_estado: backendCustomer.endereco_estado || '',
    endereco_cep: backendCustomer.endereco_cep || '',
    observacoes: backendCustomer.observacoes || '',
    status: backendCustomer.status || 'ativo',
    data_cadastro: backendCustomer.data_cadastro || '',
    total_pedidos: totalPedidos,
    ultimo_pedido: backendCustomer.ultimo_pedido || '',
    total_gasto: totalGasto,
    
    // Campos mapeados para compatibilidade
    name: backendCustomer.nome || '',
    phone: backendCustomer.telefone || '',
    address: address,
    neighborhood: backendCustomer.endereco_bairro || '',
    orders: totalPedidos,
    lastOrder: lastOrderFormatted,
    totalSpent: totalGasto,
    notes: backendCustomer.observacoes || '',
    customerStatus
  };
};

// Função para mapear dados do frontend para o backend
const mapCustomerToBackend = (customer: Partial<Customer>) => {
  return {
    nome: customer.name || customer.nome,
    email: customer.email,
    telefone: customer.phone || customer.telefone,
    cpf_cnpj: customer.cpf_cnpj,
    tipo_pessoa: customer.tipo_pessoa || 'fisica',
    endereco_rua: customer.endereco_rua,
    endereco_numero: customer.endereco_numero,
    endereco_complemento: customer.endereco_complemento,
    endereco_bairro: customer.neighborhood || customer.endereco_bairro,
    endereco_cidade: customer.endereco_cidade,
    endereco_estado: customer.endereco_estado,
    endereco_cep: customer.endereco_cep,
    observacoes: customer.notes || customer.observacoes
  };
};

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar clientes
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.clientes.listar();
      
      if (response.success) {
        const mappedCustomers = response.data.map(mapCustomerFromBackend);
        setCustomers(mappedCustomers);
        setError(null);
      } else {
        throw new Error('Erro ao carregar clientes');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar clientes');
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar clientes ao montar o componente
  useEffect(() => {
    loadCustomers();
  }, []);

  const addCustomer = async (customer: Omit<Customer, 'id' | 'orders' | 'lastOrder' | 'totalSpent' | 'total_pedidos' | 'ultimo_pedido' | 'total_gasto' | 'data_cadastro' | 'status' | 'customerStatus'>) => {
    try {
      const backendData = mapCustomerToBackend(customer);
      const response = await api.clientes.criar(backendData);
      
      if (response.success) {
        const mappedCustomer = mapCustomerFromBackend(response.data);
        setCustomers(prev => [...prev, mappedCustomer]);
        return mappedCustomer;
      } else {
        throw new Error(response.message || 'Erro ao adicionar cliente');
      }
    } catch (err) {
      console.error('Erro ao adicionar cliente:', err);
      throw err;
    }
  };

  const updateCustomer = async (id: number, customer: Omit<Customer, 'id'>) => {
    try {
      const backendData = mapCustomerToBackend(customer);
      const response = await api.clientes.atualizar(id, backendData);
      
      if (response.success) {
        // Recarregar lista após atualizar
        await loadCustomers();
        return response;
      } else {
        throw new Error('Erro ao atualizar cliente');
      }
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err);
      throw err;
    }
  };

  const deleteCustomer = async (id: number) => {
    try {
      const response = await api.clientes.excluir(id);
      
      if (response.success) {
        setCustomers(prev => prev.filter(c => c.id !== id));
      } else {
        throw new Error(response.message || 'Erro ao deletar cliente');
      }
    } catch (err) {
      console.error('Erro ao deletar cliente:', err);
      throw err;
    }
  };

  const getCustomer = (id: number) => {
    return customers.find(c => c.id === id);
  };

  const searchCustomers = async (termo: string) => {
    try {
      const response = await api.clientes.buscar(termo);
      
      if (response.success) {
        return response.data.map(mapCustomerFromBackend);
      } else {
        throw new Error('Erro ao buscar clientes');
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      throw err;
    }
  };

  const getStatistics = async () => {
    try {
      const response = await api.clientes.estatisticas();
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error('Erro ao buscar estatísticas');
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
      throw err;
    }
  };

  return {
    customers,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomer,
    searchCustomers,
    getStatistics,
    refreshCustomers: loadCustomers,
    reloadCustomers: loadCustomers
  };
}
