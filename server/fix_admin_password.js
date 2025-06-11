const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const fixAdminPassword = async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // ajuste se necessário
    database: 'loja_organizada'
  });

  try {
    console.log('🔧 Corrigindo senha do administrador...');
    
    // Gerar novo hash da senha "admin123"
    const novaSenha = 'admin123';
    const novoHash = await bcrypt.hash(novaSenha, 12);
    
    console.log('Nova senha:', novaSenha);
    console.log('Novo hash:', novoHash);
    
    // Testar se o hash funciona
    const testeHash = await bcrypt.compare(novaSenha, novoHash);
    console.log('Teste do novo hash:', testeHash);
    
    if (!testeHash) {
      console.error('❌ ERRO: Novo hash não funciona!');
      return;
    }
    
    // Atualizar a senha no banco
    const [result] = await connection.execute(
      'UPDATE usuarios SET senha_hash = ?, senha = NULL WHERE email = ?',
      [novoHash, 'admin@silosystem.com']
    );
    
    console.log('✅ Senha atualizada! Linhas afetadas:', result.affectedRows);
    
    // Verificar se foi atualizada
    const [usuario] = await connection.execute(
      'SELECT nome, email, senha_hash, senha FROM usuarios WHERE email = ?',
      ['admin@silosystem.com']
    );
    
    if (usuario.length > 0) {
      console.log('👤 Usuário atualizado:');
      console.log('  Nome:', usuario[0].nome);
      console.log('  Email:', usuario[0].email);
      console.log('  Senha hash:', usuario[0].senha_hash);
      console.log('  Senha texto plano:', usuario[0].senha || '(removida)');
      
      // Testar a senha final
      const testeFinal = await bcrypt.compare('admin123', usuario[0].senha_hash);
      console.log('🔐 Teste da senha final:', testeFinal ? '✅ SUCESSO' : '❌ FALHOU');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await connection.end();
  }
};

fixAdminPassword(); 