import { supabase } from '../lib/supabase';
import { authService } from './supabaseAuth';
import { pedidosService } from './supabasePedidos';
import { estoqueService } from './supabaseEstoque';
import { produtosService } from './supabaseProdutos';
import { clientesService } from './supabaseClientes';
import { usuariosService } from './supabaseUsuarios';

// Interceptor para verificar autenticação
const checkAuth = () => {
    if (!authService.isAuthenticated()) {
        console.warn('❌ Usuário não autenticado, redirecionando para login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Não autenticado');
    }
    console.log('✅ Usuário autenticado');
};

// API compatível com o código existente - TODAS AS REGRAS DE NEGÓCIO IMPLEMENTADAS
const api = {
    // Métodos de autenticação - TODAS as regras implementadas
    auth: {
        login: authService.login.bind(authService),
        logout: authService.logout.bind(authService),
        register: authService.register.bind(authService),
        verifyToken: authService.verifyToken.bind(authService),
        changePassword: authService.changePassword.bind(authService)
    },

    // Métodos de pedidos - TODAS as regras implementadas
    pedidos: {
        listar: pedidosService.listar.bind(pedidosService),
        buscarPorId: pedidosService.buscarPorId.bind(pedidosService),
        criar: pedidosService.criar.bind(pedidosService),
        atualizar: pedidosService.atualizar.bind(pedidosService),
        cancelar: pedidosService.cancelar.bind(pedidosService),
        atualizarPagamento: pedidosService.atualizarPagamento.bind(pedidosService),
        marcarEntregue: pedidosService.marcarEntregue.bind(pedidosService),
        naoEntregues: pedidosService.naoEntregues.bind(pedidosService),
        pagamentosPendentes: pedidosService.pagamentosPendentes.bind(pedidosService),
        estatisticas: pedidosService.estatisticas.bind(pedidosService)
    },

    // Métodos de clientes - TODAS as regras de negócio implementadas
    clientes: {
        listar: () => { checkAuth(); return clientesService.listar(); },
        buscarPorId: (id: number) => { checkAuth(); return clientesService.buscarPorId(id); },
        criar: (clienteData: any) => { checkAuth(); return clientesService.criar(clienteData); },
        atualizar: (id: number, clienteData: any) => { checkAuth(); return clientesService.atualizar(id, clienteData); },
        excluir: (id: number) => { checkAuth(); return clientesService.deletar(id); },
        buscar: (termo: string) => { checkAuth(); return clientesService.buscar(termo); },
        estatisticas: () => { checkAuth(); return clientesService.estatisticas(); },
        reativar: (id: number) => { checkAuth(); return clientesService.reativar(id); }
    },

    // Métodos de produtos - TODAS as regras de negócio implementadas
    produtos: {
        listar: () => { checkAuth(); return produtosService.listarTodos(); },
        listarParaVenda: () => { checkAuth(); return produtosService.listarParaVenda(); },
        buscarPorId: (id: number) => { checkAuth(); return produtosService.buscarPorId(id); },
        criar: (produtoData: any) => { checkAuth(); return produtosService.criar(produtoData); },
        atualizar: (id: number, produtoData: any) => { checkAuth(); return produtosService.atualizar(id, produtoData); },
        excluir: (id: number) => { checkAuth(); return produtosService.deletar(id); },
        uploadImagem: (file: File) => { checkAuth(); return produtosService.uploadImagem(file); },
        buscarPorCategoria: (categoria: string) => { checkAuth(); return produtosService.buscarPorCategoria(categoria); },
        buscarPorTipo: (tipo: string) => { checkAuth(); return produtosService.buscarPorTipo(tipo); }
    },

    // Métodos de estoque - TODAS as regras de negócio implementadas
    estoque: {
        listar: () => { checkAuth(); return estoqueService.relatorioEstoque(); },
        listarMovimentacoes: () => { checkAuth(); return estoqueService.listarMovimentacoes(); },
        buscarMovimentacaoPorId: (id: number) => { checkAuth(); return estoqueService.buscarMovimentacaoPorId(id); },
        movimentar: (movimentacaoData: any) => { checkAuth(); return estoqueService.criarMovimentacao(movimentacaoData); },
        atualizarMovimentacao: (id: number, movimentacaoData: any) => { checkAuth(); return estoqueService.atualizarMovimentacao(id, movimentacaoData); },
        deletarMovimentacao: (id: number) => { checkAuth(); return estoqueService.deletarMovimentacao(id); },
        buscarEstoqueBaixo: () => { checkAuth(); return estoqueService.buscarEstoqueBaixo(); },
        relatorioEstoque: () => { checkAuth(); return estoqueService.relatorioEstoque(); }
    },

    // Métodos de usuários - TODAS as regras de negócio implementadas
    usuarios: {
        listar: (filtros?: any) => { checkAuth(); return usuariosService.listar(filtros); },
        buscarPorId: (id: number) => { checkAuth(); return usuariosService.buscarPorId(id); },
        criar: (usuarioData: any) => { checkAuth(); return usuariosService.criar(usuarioData); },
        atualizar: (id: number, usuarioData: any) => { checkAuth(); return usuariosService.atualizar(id, usuarioData); },
        desativar: (id: number) => { checkAuth(); return usuariosService.desativar(id); },
        reativar: (id: number) => { checkAuth(); return usuariosService.reativar(id); },
        resetarSenha: (id: number, novaSenha?: string) => { checkAuth(); return usuariosService.resetarSenha(id, novaSenha); },
        buscarPerfis: () => { checkAuth(); return usuariosService.buscarPerfis(); },
        estatisticas: () => { checkAuth(); return usuariosService.estatisticas(); }
    }
};

// Função para obter a URL completa de uma imagem (compatibilidade)
export const getImageUrl = (path: string) => {
    if (!path) {
        console.warn('getImageUrl: path vazio');
        return '';
    }
    
    if (path.startsWith('http')) {
        console.log('getImageUrl: URL absoluta detectada:', path);
        return path;
    }
    
    // Obter URL do Supabase das variáveis de ambiente
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // Fallback para desenvolvimento local se não houver variável de ambiente
    const baseUrl = supabaseUrl || 'http://127.0.0.1:54321';
    
    let finalUrl = '';
    
    // Se o path já começa com /uploads (formato: /uploads/produtos/arquivo.jpg)
    if (path.startsWith('/uploads/')) {
        // Remove o /uploads/ inicial e usa diretamente
        finalUrl = `${baseUrl}/storage/v1/object/public/uploads/${path.replace('/uploads/', '')}`;
    } 
    // Se o path é apenas o nome do arquivo ou já está no formato correto
    else if (path.includes('/')) {
        // Já tem algum caminho, assume que está no formato correto
        finalUrl = `${baseUrl}/storage/v1/object/public/uploads/${path}`;
    } 
    // Se é apenas o nome do arquivo, assume que está na pasta produtos
    else {
        finalUrl = `${baseUrl}/storage/v1/object/public/uploads/produtos/${path}`;
    }
    
    // Debug sempre ativo para investigar o problema
    console.log('🖼️ getImageUrl debug:', { 
        path, 
        supabaseUrl: supabaseUrl ? 'Definida' : 'Não definida', 
        baseUrl, 
        finalUrl,
        isDev: import.meta.env.DEV,
        mode: import.meta.env.MODE
    });
    
    return finalUrl;
};

export default api; 