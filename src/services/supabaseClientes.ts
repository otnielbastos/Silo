import { supabase } from '../lib/supabase';
import { authService } from './supabaseAuth';

interface ClienteData {
  nome: string;
  email?: string;
  telefone?: string;
  cpf_cnpj?: string;
  tipo_pessoa: 'fisica' | 'juridica';
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_cep?: string;
  observacoes?: string;
}

export const clientesService = {
  // Listar todos os clientes com estatísticas
  async listar() {
    try {
      const { data: clientes, error } = await supabase
        .from('clientes')
        .select(`
          *,
          pedidos(id, data_pedido, valor_total)
        `)
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw new Error('Erro ao buscar clientes');

      // REGRA DE NEGÓCIO: Calcular estatísticas para cada cliente
      const clientesComEstatisticas = clientes.map(cliente => {
        const pedidos = cliente.pedidos || [];
        const totalPedidos = pedidos.length;
        const ultimoPedido = totalPedidos > 0 
          ? pedidos.sort((a, b) => new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime())[0].data_pedido
          : '';
        const totalGasto = pedidos.reduce((acc, pedido) => acc + (pedido.valor_total || 0), 0);

        return {
          ...cliente,
          total_pedidos: totalPedidos,
          ultimo_pedido: ultimoPedido,
          total_gasto: totalGasto,
          pedidos: undefined // Remover pedidos do retorno para economizar dados
        };
      });

      return {
        success: true,
        data: clientesComEstatisticas
      };

    } catch (error: any) {
      console.error('Erro ao listar clientes:', error);
      throw new Error(error.message || 'Erro interno do servidor');
    }
  },

  // Buscar cliente por ID com estatísticas
  async buscarPorId(id: number) {
    try {
      const { data: cliente, error } = await supabase
        .from('clientes')
        .select(`
          *,
          pedidos(id, data_pedido, valor_total, status)
        `)
        .eq('id', id)
        .single();

      if (error) throw new Error('Cliente não encontrado');

      // REGRA DE NEGÓCIO: Calcular estatísticas do cliente
      const pedidos = cliente.pedidos || [];
      const totalPedidos = pedidos.length;
      const ultimoPedido = totalPedidos > 0 
        ? pedidos.sort((a, b) => new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime())[0].data_pedido
        : '';
      const totalGasto = pedidos.reduce((acc, pedido) => acc + (pedido.valor_total || 0), 0);

      return {
        success: true,
        data: {
          ...cliente,
          total_pedidos: totalPedidos,
          ultimo_pedido: ultimoPedido,
          total_gasto: totalGasto
        }
      };

    } catch (error: any) {
      console.error('Erro ao buscar cliente:', error);
      throw new Error(error.message || 'Erro interno do servidor');
    }
  },

  // Criar novo cliente
  async criar(data: ClienteData) {
    try {
      const {
        nome,
        email,
        telefone,
        cpf_cnpj,
        tipo_pessoa,
        endereco_rua,
        endereco_numero,
        endereco_complemento,
        endereco_bairro,
        endereco_cidade,
        endereco_estado,
        endereco_cep,
        observacoes
      } = data;

      console.log('Criando cliente com dados:', data);

      // REGRA DE NEGÓCIO: Validações obrigatórias
      if (!nome || nome.trim() === '') {
        throw new Error('Nome do cliente é obrigatório');
      }

      if (!tipo_pessoa || !['fisica', 'juridica'].includes(tipo_pessoa)) {
        throw new Error('Tipo de pessoa inválido');
      }

      // REGRA DE NEGÓCIO: Converter campos vazios para null para evitar problemas com UNIQUE constraints
      const emailTratado = email && email.trim() !== '' ? email.trim().toLowerCase() : null;
      const cpfCnpjTratado = cpf_cnpj && cpf_cnpj.trim() !== '' ? cpf_cnpj.trim().replace(/\D/g, '') : null;
      const telefoneTratado = telefone && telefone.trim() !== '' ? telefone.trim() : null;

      // REGRA DE NEGÓCIO: Verificar se já existe cliente com mesmo email
      if (emailTratado) {
        const { data: emailExistente } = await supabase
          .from('clientes')
          .select('id')
          .eq('email', emailTratado)
          .eq('status', 'ativo')
          .single();

        if (emailExistente) {
          throw new Error('Já existe um cliente com este email');
        }
      }

      // REGRA DE NEGÓCIO: Verificar se já existe cliente com mesmo CPF/CNPJ
      if (cpfCnpjTratado) {
        const { data: cpfExistente } = await supabase
          .from('clientes')
          .select('id')
          .eq('cpf_cnpj', cpfCnpjTratado)
          .eq('status', 'ativo')
          .single();

        if (cpfExistente) {
          throw new Error('Já existe um cliente com este CPF/CNPJ');
        }
      }

      // REGRA DE NEGÓCIO: Validações específicas por tipo de pessoa
      if (tipo_pessoa === 'fisica' && cpfCnpjTratado && cpfCnpjTratado.length !== 11) {
        throw new Error('CPF deve ter 11 dígitos');
      }

      if (tipo_pessoa === 'juridica' && cpfCnpjTratado && cpfCnpjTratado.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos');
      }

      const { data: cliente, error } = await supabase
        .from('clientes')
        .insert({
          nome: nome.trim(),
          email: emailTratado,
          telefone: telefoneTratado,
          cpf_cnpj: cpfCnpjTratado,
          tipo_pessoa,
          endereco_rua: endereco_rua?.trim() || null,
          endereco_numero: endereco_numero?.trim() || null,
          endereco_complemento: endereco_complemento?.trim() || null,
          endereco_bairro: endereco_bairro?.trim() || null,
          endereco_cidade: endereco_cidade?.trim() || null,
          endereco_estado: endereco_estado?.trim() || null,
          endereco_cep: endereco_cep?.trim() || null,
          observacoes: observacoes?.trim() || null,
          status: 'ativo',
          criado_por: authService.getCurrentUserId()
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Email ou CPF/CNPJ já cadastrado');
        }
        throw new Error('Erro ao criar cliente');
      }

      console.log('Cliente criado com ID:', cliente.id);

      return {
        success: true,
        message: 'Cliente criado com sucesso',
        data: {
          ...cliente,
          total_pedidos: 0,
          ultimo_pedido: '',
          total_gasto: 0
        }
      };

    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      throw new Error(error.message || 'Erro interno do servidor');
    }
  },

  // Atualizar cliente
  async atualizar(id: number, data: Partial<ClienteData>) {
    try {
      const {
        nome,
        email,
        telefone,
        cpf_cnpj,
        tipo_pessoa,
        endereco_rua,
        endereco_numero,
        endereco_complemento,
        endereco_bairro,
        endereco_cidade,
        endereco_estado,
        endereco_cep,
        observacoes
      } = data;

      // REGRA DE NEGÓCIO: Verificar se cliente existe
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id, email, cpf_cnpj')
        .eq('id', id)
        .eq('status', 'ativo')
        .single();

      if (!clienteExistente) {
        throw new Error('Cliente não encontrado');
      }

      // REGRA DE NEGÓCIO: Converter campos vazios para null
      const emailTratado = email && email.trim() !== '' ? email.trim().toLowerCase() : null;
      const cpfCnpjTratado = cpf_cnpj && cpf_cnpj.trim() !== '' ? cpf_cnpj.trim().replace(/\D/g, '') : null;
      const telefoneTratado = telefone && telefone.trim() !== '' ? telefone.trim() : null;

      // REGRA DE NEGÓCIO: Verificar duplicatas (exceto o próprio cliente)
      if (emailTratado && emailTratado !== clienteExistente.email) {
        const { data: emailExistente } = await supabase
          .from('clientes')
          .select('id')
          .eq('email', emailTratado)
          .neq('id', id)
          .eq('status', 'ativo')
          .single();

        if (emailExistente) {
          throw new Error('Já existe um cliente com este email');
        }
      }

      if (cpfCnpjTratado && cpfCnpjTratado !== clienteExistente.cpf_cnpj) {
        const { data: cpfExistente } = await supabase
          .from('clientes')
          .select('id')
          .eq('cpf_cnpj', cpfCnpjTratado)
          .neq('id', id)
          .eq('status', 'ativo')
          .single();

        if (cpfExistente) {
          throw new Error('Já existe um cliente com este CPF/CNPJ');
        }
      }

      // REGRA DE NEGÓCIO: Validações específicas por tipo de pessoa
      if (tipo_pessoa === 'fisica' && cpfCnpjTratado && cpfCnpjTratado.length !== 11) {
        throw new Error('CPF deve ter 11 dígitos');
      }

      if (tipo_pessoa === 'juridica' && cpfCnpjTratado && cpfCnpjTratado.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos');
      }

      const updateData: any = {};
      if (nome !== undefined) updateData.nome = nome.trim();
      if (email !== undefined) updateData.email = emailTratado;
      if (telefone !== undefined) updateData.telefone = telefoneTratado;
      if (cpf_cnpj !== undefined) updateData.cpf_cnpj = cpfCnpjTratado;
      if (tipo_pessoa !== undefined) updateData.tipo_pessoa = tipo_pessoa;
      if (endereco_rua !== undefined) updateData.endereco_rua = endereco_rua?.trim() || null;
      if (endereco_numero !== undefined) updateData.endereco_numero = endereco_numero?.trim() || null;
      if (endereco_complemento !== undefined) updateData.endereco_complemento = endereco_complemento?.trim() || null;
      if (endereco_bairro !== undefined) updateData.endereco_bairro = endereco_bairro?.trim() || null;
      if (endereco_cidade !== undefined) updateData.endereco_cidade = endereco_cidade?.trim() || null;
      if (endereco_estado !== undefined) updateData.endereco_estado = endereco_estado?.trim() || null;
      if (endereco_cep !== undefined) updateData.endereco_cep = endereco_cep?.trim() || null;
      if (observacoes !== undefined) updateData.observacoes = observacoes?.trim() || null;

      const { error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', id);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Email ou CPF/CNPJ já cadastrado');
        }
        throw new Error('Erro ao atualizar cliente');
      }

      return {
        success: true,
        message: 'Cliente atualizado com sucesso'
      };

    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      throw new Error(error.message || 'Erro interno do servidor');
    }
  },

  // REGRA DE NEGÓCIO: Deletar cliente (soft delete)
  async deletar(id: number) {
    try {
      // Verificar se cliente existe
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('id', id)
        .eq('status', 'ativo')
        .single();

      if (!clienteExistente) {
        throw new Error('Cliente não encontrado');
      }

      // REGRA DE NEGÓCIO: Verificar se cliente tem pedidos
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id')
        .eq('cliente_id', id)
        .limit(1);

      if (pedidos && pedidos.length > 0) {
        throw new Error('Não é possível excluir cliente que possui pedidos. Use a inativação.');
      }

      // REGRA DE NEGÓCIO: Soft delete - marcar como inativo ao invés de excluir
      const { error } = await supabase
        .from('clientes')
        .update({ status: 'inativo' })
        .eq('id', id);

      if (error) {
        throw new Error('Erro ao excluir cliente');
      }

      return {
        success: true,
        message: 'Cliente excluído com sucesso'
      };

    } catch (error: any) {
      console.error('Erro ao deletar cliente:', error);
      throw new Error(error.message || 'Erro interno do servidor');
    }
  },

  // Buscar clientes por texto
  async buscar(termo: string) {
    try {
      if (!termo || termo.trim() === '') {
        return await this.listar();
      }

      const termoBusca = `%${termo.trim()}%`;

      const { data: clientes, error } = await supabase
        .from('clientes')
        .select(`
          *,
          pedidos(id, data_pedido, valor_total)
        `)
        .eq('status', 'ativo')
        .or(`nome.ilike.${termoBusca},email.ilike.${termoBusca},telefone.ilike.${termoBusca},cpf_cnpj.ilike.${termoBusca}`)
        .order('nome');

      if (error) throw new Error('Erro ao buscar clientes');

      // Calcular estatísticas para cada cliente
      const clientesComEstatisticas = clientes.map(cliente => {
        const pedidos = cliente.pedidos || [];
        const totalPedidos = pedidos.length;
        const ultimoPedido = totalPedidos > 0 
          ? pedidos.sort((a, b) => new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime())[0].data_pedido
          : '';
        const totalGasto = pedidos.reduce((acc, pedido) => acc + (pedido.valor_total || 0), 0);

        return {
          ...cliente,
          total_pedidos: totalPedidos,
          ultimo_pedido: ultimoPedido,
          total_gasto: totalGasto,
          pedidos: undefined
        };
      });

      return {
        success: true,
        data: clientesComEstatisticas
      };

    } catch (error: any) {
      console.error('Erro ao buscar clientes:', error);
      throw new Error(error.message || 'Erro interno do servidor');
    }
  },

  // Estatísticas dos clientes
  async estatisticas() {
    try {
      // Total de clientes ativos
      const { count: totalClientes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');

      // Clientes que fizeram pedidos
      const { data: clientesComPedidos } = await supabase
        .from('clientes')
        .select('id')
        .eq('status', 'ativo')
        .not('pedidos', 'is', null);

      // Novos clientes no mês
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { count: novosClientesMes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo')
        .gte('data_cadastro', inicioMes.toISOString());

      // Top clientes por valor gasto
      const { data: topClientes } = await supabase
        .from('clientes')
        .select(`
          id,
          nome,
          pedidos(valor_total)
        `)
        .eq('status', 'ativo')
        .limit(10);

      const topClientesFormatados = topClientes?.map(cliente => {
        const totalGasto = cliente.pedidos?.reduce((acc, pedido) => acc + (pedido.valor_total || 0), 0) || 0;
        return {
          id: cliente.id,
          nome: cliente.nome,
          total_gasto: totalGasto
        };
      }).sort((a, b) => b.total_gasto - a.total_gasto).slice(0, 5) || [];

      return {
        success: true,
        data: {
          total_clientes: totalClientes || 0,
          clientes_com_pedidos: clientesComPedidos?.length || 0,
          novos_clientes_mes: novosClientesMes || 0,
          top_clientes: topClientesFormatados
        }
      };

    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', error);
      throw new Error(error.message || 'Erro interno do servidor');
    }
  },

  // Reativar cliente
  async reativar(id: number) {
    try {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('id', id)
        .single();

      if (!cliente) {
        throw new Error('Cliente não encontrado');
      }

      const { error } = await supabase
        .from('clientes')
        .update({ status: 'ativo' })
        .eq('id', id);

      if (error) {
        throw new Error('Erro ao reativar cliente');
      }

      return {
        success: true,
        message: 'Cliente reativado com sucesso'
      };

    } catch (error: any) {
      console.error('Erro ao reativar cliente:', error);
      throw new Error(error.message || 'Erro interno do servidor');
    }
  }
}; 