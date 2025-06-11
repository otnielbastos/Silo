# Loja Organizada Pro

Sistema de gestão completo para lojas, com controle de produtos, estoque, vendas e muito mais.

## Requisitos

- Node.js & npm - [instale com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- XAMPP (ou MySQL instalado separadamente)
- Git

## Configuração Inicial

1. Clone o repositório:
```sh
git clone <YOUR_GIT_URL>
cd loja-organizada-pro
```

2. Configure o banco de dados:
- Inicie o MySQL no XAMPP
- Acesse o phpMyAdmin (http://localhost/phpmyadmin)
- Crie um novo banco de dados chamado `loja_organizada`
- Importe o arquivo `server/database.sql` para criar as tabelas

3. Instale as dependências:
```sh
# Instale as dependências do frontend
npm install

# Instale as dependências do backend
cd server
npm install
cd ..
```

## Como Executar o Projeto

É necessário manter dois terminais abertos, um para o frontend e outro para o backend:

### Terminal 1 - Frontend
```sh
# Na pasta raiz do projeto
npm run dev
```
Isso iniciará o servidor de desenvolvimento do frontend na porta 8080.

### Terminal 2 - Backend
```sh
# Na pasta server
cd server
node server.js
```
Isso iniciará o servidor backend na porta 3001.

## Estrutura do Projeto

- `src/` - Código fonte do frontend (React)
- `server/` - Código fonte do backend (Node.js/Express)
  - `config/` - Configurações do banco de dados
  - `controllers/` - Controladores da API
  - `routes/` - Rotas da API

## Tecnologias Utilizadas

Frontend:
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

Backend:
- Node.js
- Express
- MySQL
- CORS

## Importante!

Para o funcionamento correto do sistema, certifique-se de que:

1. O MySQL está rodando no XAMPP
2. O servidor backend está rodando (`node server.js`)
3. O servidor frontend está rodando (`npm run dev`)
4. O banco de dados foi criado e as tabelas foram importadas

Se encontrar o erro "Network Error", verifique se todos os serviços acima estão funcionando corretamente.

## Como Contribuir

1. Crie um branch para sua feature
2. Faça commit das suas alterações
3. Faça push para o branch
4. Crie um Pull Request

## Licença

Este projeto está sob a licença MIT.
