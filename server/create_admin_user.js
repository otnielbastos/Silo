const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const createAdminUser = async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // ajuste se necessário
    database: 'loja_organizada'
  });

  try {
    // Verificar se o usuário já existe
    const [existingUser] = await connection.execute(
      'SELECT * FROM usuarios WHERE email = ?',
      ['admin@silosystem.com']
    );

    if (existingUser.length > 0) {
      console.log('Usuário administrador já existe!');
      console.log('Dados:', existingUser[0]);
      
      // Verificar senha
      const isValidPassword = await bcrypt.compare('admin123', existingUser[0].senha_hash || existingUser[0].senha);
      console.log('Senha válida:', isValidPassword);
      
      return;
    }

    // Verificar se o perfil existe
    const [perfis] = await connection.execute('SELECT * FROM perfis WHERE id = 1');
    if (perfis.length === 0) {
      console.log('Perfil Administrador não encontrado! Criando...');
      await connection.execute(
        'INSERT INTO perfis (nome, descricao, permissoes) VALUES (?, ?, ?)',
        [
          'Administrador',
          'Acesso total ao sistema',
          '{"usuarios":["create","read","update","delete"],"clientes":["create","read","update","delete"],"pedidos":["create","read","update","delete"],"produtos":["create","read","update","delete"],"financeiro":["create","read","update","delete"],"relatorios":["create","read","update","delete"]}'
        ]
      );
      console.log('Perfil Administrador criado!');
    }

    // Criar hash da senha
    const senhaHash = await bcrypt.hash('admin123', 12);
    console.log('Hash da senha:', senhaHash);

    // Criar usuário
    const [result] = await connection.execute(
      'INSERT INTO usuarios (nome, email, senha_hash, perfil_id, ativo, data_criacao) VALUES (?, ?, ?, ?, ?, NOW())',
      ['Administrador', 'admin@silosystem.com', senhaHash, 1, true]
    );

    console.log('Usuário administrador criado com sucesso!');
    console.log('ID:', result.insertId);

    // Verificar se foi criado
    const [newUser] = await connection.execute(
      'SELECT u.*, p.nome as perfil FROM usuarios u JOIN perfis p ON u.perfil_id = p.id WHERE u.email = ?',
      ['admin@silosystem.com']
    );

    console.log('Usuário criado:', newUser[0]);

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await connection.end();
  }
};

createAdminUser(); 