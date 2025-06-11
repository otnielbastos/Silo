# Deploy na Vercel - Guia Completo

## Pré-requisitos

1. Conta na Vercel (https://vercel.com)
2. Projeto configurado no GitHub, GitLab ou Bitbucket
3. Projeto Supabase configurado (https://supabase.com)

## Passos para Deploy

### 1. Preparação do Projeto

O projeto já está configurado com:
- ✅ `vercel.json` - Configuração para deployment
- ✅ Script `vercel-build` no package.json
- ✅ Estrutura frontend React + Vite + Supabase

### 2. Configuração das Variáveis de Ambiente

Na Vercel Dashboard, configure as seguintes variáveis:

#### Configurações do Supabase
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Como obter essas informações:**
1. Vá para o dashboard do Supabase (https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em Settings → API
4. Copie a `URL` e a `anon key`

### 3. Deploy

1. **Conecte seu repositório à Vercel:**
   - Vá para https://vercel.com/dashboard
   - Clique em "New Project"
   - Importe seu repositório

2. **Configure o projeto:**
   - Framework Preset: Vite
   - Root Directory: deixe em branco (raiz do projeto)
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Adicione as variáveis de ambiente** conforme listado acima

4. **Faça o deploy:**
   - Clique em "Deploy"
   - Aguarde o processo de build e deploy

### 4. Configuração Adicional

#### Banco de Dados
- ✅ Supabase já fornece PostgreSQL integrado
- Configure as tabelas necessárias no Supabase Dashboard
- Use o SQL Editor para executar migrations se necessário
- **Migração do MySQL**: Você pode usar o arquivo `supabase_schema.sql` que já existe no projeto

#### Storage/Uploads
- ✅ Use Supabase Storage para uploads de arquivos
- Configure buckets no Supabase Dashboard
- Atualize o código para usar Supabase Storage API

### 5. Verificação

Após o deploy, teste:
- ✅ Frontend carregando
- ✅ Conexão com Supabase funcionando
- ✅ Autenticação do Supabase funcionando
- ✅ CRUD das tabelas funcionando

## Arquitetura

```
Frontend (React + Vite) → Vercel Edge Network
Backend (Supabase) → PostgreSQL + Auth + Storage + Edge Functions
```

## Comandos Úteis

```bash
# Desenvolvimento local
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint
```

## Problemas Comuns

1. **Erro de conexão Supabase**: Verifique se as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretas
2. **Build falha**: Execute `npm run build` localmente para testar
3. **Autenticação não funciona**: Verifique as configurações de Auth no Supabase Dashboard
4. **CORS Issues**: Configure os domínios permitidos no Supabase → Authentication → URL Configuration

## Otimizações Pós-Deploy

1. Configure domínio customizado
2. Adicione analytics (Vercel Analytics)
3. Configure redirects se necessário
4. Monitore performance e logs 