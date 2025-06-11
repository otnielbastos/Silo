import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

interface LoginData {
  email: string;
  senha?: string;
  password?: string;
}

interface RegisterData {
  nome: string;
  email: string;
  password: string;
  perfil_id: number;
}

interface ChangePasswordData {
  senha_atual: string;
  nova_senha: string;
}

// Função para registrar tentativa de login
const registrarTentativaLogin = async (email: string, ip: string, sucesso: boolean, motivo: string, userAgent?: string) => {
  try {
    await supabase
      .from('tentativas_login')
      .insert({
        email,
        ip_address: ip,
        sucesso,
        motivo,
        user_agent: userAgent
      });
  } catch (error) {
    console.error('Erro ao registrar tentativa de login:', error);
  }
};

// Função para registrar auditoria
const registrarAuditoria = async (
  usuarioId: number,
  acao: string,
  tabela?: string,
  registroId?: number,
  dadosAntigos?: any,
  dadosNovos?: any,
  ip?: string,
  userAgent?: string
) => {
  try {
    await supabase
      .from('auditoria')
      .insert({
        usuario_id: usuarioId,
        acao,
        tabela,
        registro_id: registroId,
        dados_antigos: dadosAntigos,
        dados_novos: dadosNovos,
        ip_address: ip,
        user_agent: userAgent
      });
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
};

// Função para hash da senha
const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Função para verificar senha
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Função para gerar token simples (no servidor original usava JWT)
const generateToken = (userId: number): string => {
  return btoa(`${userId}:${Date.now()}:${Math.random()}`);
};

// Obter IP do cliente (simulado)
const getClientIP = (): string => {
  // Em um ambiente real, isso viria do request
  return '127.0.0.1';
};

// Obter User Agent (simulado)
const getUserAgent = (): string => {
  return navigator.userAgent;
};

export const authService = {
  // Login com todas as validações do servidor original
  async login(data: LoginData) {
    try {
      const { email, senha, password } = data;
      const senhaInput = senha || password;
      
      if (!senhaInput || senhaInput.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
      }

      const ip = getClientIP();
      const userAgent = getUserAgent();

      // Verificar se o usuário existe
      const { data: usuarios, error: userError } = await supabase
        .from('usuarios')
        .select(`
          *,
          perfil:perfis(*)
        `)
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !usuarios) {
        await registrarTentativaLogin(email, ip, false, 'Usuário não encontrado', userAgent);
        throw new Error('Email ou senha incorretos');
      }

      // Verificar se o usuário está ativo
      if (!usuarios.ativo || usuarios.status !== 'ativo') {
        await registrarTentativaLogin(email, ip, false, 'Usuário desativado', userAgent);
        throw new Error('Usuário desativado');
      }

      // Verificar se o usuário não está bloqueado
      if (usuarios.bloqueado_ate && new Date() < new Date(usuarios.bloqueado_ate)) {
        await registrarTentativaLogin(email, ip, false, 'Usuário bloqueado', userAgent);
        throw new Error('Usuário temporariamente bloqueado');
      }

      // Verificar senha
      if (!usuarios.senha_hash) {
        console.error('ERRO: Usuário não possui senha_hash!');
        throw new Error('Erro de configuração do usuário');
      }
      
      const senhaValida = await verifyPassword(senhaInput, usuarios.senha_hash);
      
      if (!senhaValida) {
        // Incrementar tentativas de login
        const novasTentativas = usuarios.tentativas_login + 1;
        
        let updateData: any = {
          tentativas_login: novasTentativas
        };

        // Bloquear usuário após 5 tentativas
        if (novasTentativas >= 5) {
          const bloqueioAte = new Date();
          bloqueioAte.setMinutes(bloqueioAte.getMinutes() + 30); // Bloquear por 30 minutos
          updateData.bloqueado_ate = bloqueioAte.toISOString();
        }

        await supabase
          .from('usuarios')
          .update(updateData)
          .eq('id', usuarios.id);

        await registrarTentativaLogin(email, ip, false, 'Senha incorreta', userAgent);
        throw new Error('Email ou senha incorretos');
      }

      // Reset tentativas de login em caso de sucesso
      await supabase
        .from('usuarios')
        .update({
          tentativas_login: 0,
          bloqueado_ate: null,
          ultimo_acesso: new Date().toISOString()
        })
        .eq('id', usuarios.id);

      // Gerar token
      const token = generateToken(usuarios.id);

      // Criar sessão
      const dataExpiracao = new Date();
      dataExpiracao.setHours(dataExpiracao.getHours() + 8); // 8 horas

      await supabase
        .from('sessoes')
        .insert({
          usuario_id: usuarios.id,
          token,
          ip_address: ip,
          user_agent: userAgent,
          data_expiracao: dataExpiracao.toISOString()
        });

      await registrarTentativaLogin(email, ip, true, 'Login bem-sucedido', userAgent);
      await registrarAuditoria(usuarios.id, 'LOGIN', 'usuarios', usuarios.id, null, { ip, userAgent }, ip, userAgent);

      // Armazenar token e usuário no localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: usuarios.id,
        nome: usuarios.nome,
        email: usuarios.email,
        perfil: usuarios.perfil.nome,
        permissoes: usuarios.perfil.permissoes
      }));

      return {
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token,
          user: {
            id: usuarios.id,
            nome: usuarios.nome,
            email: usuarios.email,
            perfil: usuarios.perfil.nome,
            permissoes: usuarios.perfil.permissoes
          }
        }
      };

    } catch (error: any) {
      console.error('Erro no login:', error);
      throw new Error(error.message || 'Erro interno do servidor');
    }
  },

  // Logout
  async logout() {
    try {
      const token = localStorage.getItem('token');
      const userId = this.getCurrentUserId();
      
      if (token && userId) {
        // Desativar sessão
        await supabase
          .from('sessoes')
          .update({ ativo: false })
          .eq('token', token);

        await registrarAuditoria(userId, 'LOGOUT', 'usuarios', userId, null, null, getClientIP(), getUserAgent());
      }

      // Limpar localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      return {
        success: true,
        message: 'Logout realizado com sucesso'
      };

    } catch (error: any) {
      console.error('Erro no logout:', error);
      throw new Error(error.message || 'Erro interno do servidor');
    }
  },

  // Registro de usuário
  async register(data: RegisterData) {
    try {
      const { nome, email, password, perfil_id } = data;

      // Validações
      if (nome.length < 2) {
        throw new Error('Nome deve ter pelo menos 2 caracteres');
      }
      if (password.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
      }

      // Verificar se email já existe
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        throw new Error('Email já está em uso');
      }

      // Verificar se perfil existe
      const { data: perfil } = await supabase
        .from('perfis')
        .select('id')
        .eq('id', perfil_id)
        .single();

      if (!perfil) {
        throw new Error('Perfil inválido');
      }

      // Hash da senha
      const senhaHash = await hashPassword(password);

      // Criar usuário
      const { data: novoUsuario, error } = await supabase
        .from('usuarios')
        .insert({
          nome,
          email: email.toLowerCase(),
          senha: '', // Campo em branco por segurança
          senha_hash: senhaHash,
          perfil_id,
          ativo: true,
          status: 'ativo'
        })
        .select()
        .single();

      if (error) {
        throw new Error('Erro ao criar usuário');
      }

      await registrarAuditoria(novoUsuario.id, 'CREATE', 'usuarios', novoUsuario.id, null, { nome, email, perfil_id }, getClientIP(), getUserAgent());

      return {
        success: true,
        message: 'Usuário criado com sucesso',
        data: {
          id: novoUsuario.id,
          nome: novoUsuario.nome,
          email: novoUsuario.email
        }
      };

    } catch (error: any) {
      console.error('Erro no registro:', error);
      throw new Error(error.message || 'Erro interno do servidor');
    }
  },

  // Verificar token
  async verifyToken() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token não encontrado');
      }

      // Verificar se sessão existe e está ativa
      const { data: sessao } = await supabase
        .from('sessoes')
        .select(`
          *,
          usuario:usuarios(*)
        `)
        .eq('token', token)
        .eq('ativo', true)
        .single();

      if (!sessao) {
        throw new Error('Sessão inválida');
      }

      // Verificar se sessão não expirou
      if (new Date() > new Date(sessao.data_expiracao)) {
        await supabase
          .from('sessoes')
          .update({ ativo: false })
          .eq('id', sessao.id);
        
        throw new Error('Sessão expirada');
      }

      return {
        success: true,
        data: {
          valid: true,
          user: sessao.usuario
        }
      };

    } catch (error: any) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw new Error(error.message || 'Token inválido');
    }
  },

  // Trocar senha
  async changePassword(data: ChangePasswordData) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const { senha_atual, nova_senha } = data;

      if (nova_senha.length < 6) {
        throw new Error('Nova senha deve ter pelo menos 6 caracteres');
      }

      // Buscar usuário atual
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('senha_hash')
        .eq('id', userId)
        .single();

      if (!usuario) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar senha atual
      const senhaAtualValida = await verifyPassword(senha_atual, usuario.senha_hash);
      if (!senhaAtualValida) {
        throw new Error('Senha atual incorreta');
      }

      // Hash da nova senha
      const novaSenhaHash = await hashPassword(nova_senha);

      // Atualizar senha
      await supabase
        .from('usuarios')
        .update({
          senha_hash: novaSenhaHash,
          data_atualizacao: new Date().toISOString()
        })
        .eq('id', userId);

      await registrarAuditoria(userId, 'CHANGE_PASSWORD', 'usuarios', userId, null, null, getClientIP(), getUserAgent());

      return {
        success: true,
        message: 'Senha alterada com sucesso'
      };

    } catch (error: any) {
      console.error('Erro ao trocar senha:', error);
      throw new Error(error.message || 'Erro interno do servidor');
    }
  },

  // Obter ID do usuário atual
  getCurrentUserId(): number | null {
    const user = localStorage.getItem('user');
    if (user) {
      return JSON.parse(user).id;
    }
    return null;
  },

  // Obter usuário atual
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Verificar se está logado
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}; 