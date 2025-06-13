import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
  console.log('📋 Variáveis encontradas:');
  console.log(`   VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Definida' : '❌ Não definida'}`);
  console.log(`   VITE_SUPABASE_ANON_KEY: ${supabaseKey ? '✅ Definida' : '❌ Não definida'}`);
  process.exit(1);
}

console.log('🔗 Conectando ao Supabase:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySupabaseTables() {
  console.log('\n🔍 VERIFICANDO TABELAS DO SUPABASE');
  console.log('=====================================');
  
  try {
    // 1. Verificar tabela de usuários
    console.log('\n📋 1. TABELA USUARIOS:');
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*')
      .limit(5);
    
    if (usuariosError) {
      console.error('❌ Erro ao buscar usuários:', usuariosError.message);
    } else {
      console.log(`✅ Encontrados ${usuarios?.length || 0} usuários`);
      usuarios?.forEach((user: any, index: number) => {
        console.log(`   ${index + 1}. ${user.nome} (${user.email}) - Perfil ID: ${user.perfil_id} - Ativo: ${user.ativo}`);
      });
    }

    // 2. Verificar tabela de perfis
    console.log('\n👥 2. TABELA PERFIS:');
    const { data: perfis, error: perfisError } = await supabase
      .from('perfis')
      .select('*');
    
    if (perfisError) {
      console.error('❌ Erro ao buscar perfis:', perfisError.message);
    } else {
      console.log(`✅ Encontrados ${perfis?.length || 0} perfis`);
      perfis?.forEach((perfil: any, index: number) => {
        console.log(`   ${index + 1}. ID: ${perfil.id} - Nome: ${perfil.nome} - Ativo: ${perfil.ativo}`);
        if (perfil.permissoes) {
          console.log(`      Permissões: ${JSON.stringify(perfil.permissoes)}`);
        }
      });
    }

    // 3. Verificar usuários com perfis (JOIN)
    console.log('\n🔗 3. USUARIOS COM PERFIS (JOIN):');
    const { data: usuariosComPerfis, error: joinError } = await supabase
      .from('usuarios')
      .select(`
        id,
        nome,
        email,
        ativo,
        perfil_id,
        perfil:perfis(
          id,
          nome,
          permissoes
        )
      `)
      .limit(5);
    
    if (joinError) {
      console.error('❌ Erro ao buscar usuários com perfis:', joinError.message);
    } else {
      console.log(`✅ Encontrados ${usuariosComPerfis?.length || 0} usuários com perfis`);
      usuariosComPerfis?.forEach((user: any, index: number) => {
        console.log(`   ${index + 1}. ${user.nome} (${user.email})`);
        console.log(`      Perfil ID: ${user.perfil_id}`);
        console.log(`      Perfil Nome: ${user.perfil?.nome || 'N/A'}`);
        console.log(`      Perfil Permissões: ${JSON.stringify(user.perfil?.permissoes || {})}`);
      });
    }

    // 4. Verificar usuário específico "Administrador"
    console.log('\n👑 4. USUÁRIO ADMINISTRADOR:');
    const { data: admin, error: adminError } = await supabase
      .from('usuarios')
      .select(`
        *,
        perfil:perfis(*)
      `)
      .eq('nome', 'Administrador')
      .single();
    
    if (adminError) {
      console.error('❌ Erro ao buscar administrador:', adminError.message);
    } else if (admin) {
      console.log('✅ Administrador encontrado:');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Nome: ${admin.nome}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Ativo: ${admin.ativo}`);
      console.log(`   Status: ${admin.status}`);
      console.log(`   Perfil ID: ${admin.perfil_id}`);
      console.log(`   Perfil Nome: ${(admin.perfil as any)?.nome || 'N/A'}`);
      console.log(`   Perfil Permissões: ${JSON.stringify((admin.perfil as any)?.permissoes || {}, null, 2)}`);
    } else {
      console.log('❌ Usuário Administrador não encontrado');
    }

    // 5. Verificar usuário por email admin@silosystem.com
    console.log('\n🔐 5. TESTE DE AUTENTICAÇÃO (admin@silosystem.com):');
    const { data: authTest, error: authError } = await supabase
      .from('usuarios')
      .select(`
        id,
        nome,
        email,
        ativo,
        status,
        perfil_id,
        perfil:perfis(id, nome, permissoes)
      `)
      .eq('email', 'admin@silosystem.com')
      .single();
    
    if (authError) {
      console.error('❌ Erro no teste de autenticação:', authError.message);
    } else if (authTest) {
      console.log('✅ Teste de autenticação bem-sucedido:');
      console.log(`   ID: ${authTest.id}`);
      console.log(`   Usuário: ${authTest.nome}`);
      console.log(`   Email: ${authTest.email}`);
      console.log(`   Ativo: ${authTest.ativo}`);
      console.log(`   Status: ${authTest.status}`);
      console.log(`   Perfil ID: ${authTest.perfil_id}`);
      console.log(`   Perfil Nome: ${(authTest.perfil as any)?.nome || 'N/A'}`);
      console.log(`   Perfil Permissões: ${JSON.stringify((authTest.perfil as any)?.permissoes || {}, null, 2)}`);
    } else {
      console.log('❌ Usuário admin@silosystem.com não encontrado');
    }

    // 6. Verificar todos os emails de usuários
    console.log('\n📧 6. TODOS OS EMAILS DE USUÁRIOS:');
    const { data: allEmails, error: emailsError } = await supabase
      .from('usuarios')
      .select('id, nome, email, ativo, perfil_id');
    
    if (emailsError) {
      console.error('❌ Erro ao buscar emails:', emailsError.message);
    } else {
      console.log(`✅ Encontrados ${allEmails?.length || 0} usuários:`);
      allEmails?.forEach((user: any, index: number) => {
        console.log(`   ${index + 1}. ${user.nome} - ${user.email} (ID: ${user.id}, Perfil: ${user.perfil_id}, Ativo: ${user.ativo})`);
      });
    }

  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Executar verificação
verifySupabaseTables().then(() => {
  console.log('\n✅ Verificação concluída!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro na verificação:', error);
  process.exit(1);
}); 