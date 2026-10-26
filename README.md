# Treinamento de CRUD — CITi

API de exemplo com um **CRUD de usuários** para o treinamento de back-end dos aspirantes.

**Stack:** Node.js · Express · TypeScript · Prisma · PostgreSQL · Docker

> **CRUD** = **C**reate, **R**ead, **U**pdate e **D**elete: as quatro operações básicas de qualquer cadastro (criar, listar/buscar, editar e remover).

---

## ✅ Pré-requisitos

Instale antes da aula:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/): roda a API e o banco em containers. **Deixe ele aberto** sempre que for rodar o projeto.
- [Node.js 20+](https://nodejs.org): para rodar os comandos `yarn` na sua máquina.
- Yarn: `npm install -g yarn`
- Um cliente HTTP para testar as rotas: [Thunder Client](https://www.thunderclient.com/) (extensão do VS Code), Insomnia ou Postman.

---

## 🔐 Configurando o `.env`

O `.env` guarda as configurações do projeto (porta da API, usuário e senha do banco etc.). Ele **não vai para o git** (está no `.gitignore`), então cada pessoa cria o seu a partir do modelo `.env.example`.

Crie um arquivo chamado `.env` na **raiz do projeto** (mesma pasta do `package.json`) e cole exatamente isto:

```env
# ###### GENERAL SETTINGS #######
PROJECT_NAME=treinamento-crud
SERVER_PORT=3001

# ###### DATABASE SETTINGS #######
DATABASE_TYPE=postgres
DATABASE_HOST=${PROJECT_NAME}-db
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=docker
DATABASE_DB=${PROJECT_NAME}

DATABASE_URL=${DATABASE_TYPE}://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_DB}
```

Ou copie o modelo pelo terminal:

```bash
cp .env.example .env        # Git Bash, macOS ou Linux
copy .env.example .env      # PowerShell ou CMD (Windows)
```

O que cada variável significa:

| Variável | Para que serve |
|---|---|
| `PROJECT_NAME` | Nome base dos containers e do banco (`treinamento-crud-server`, `treinamento-crud-db`) |
| `SERVER_PORT` | Porta da API: ela fica em `http://localhost:3001` |
| `DATABASE_TYPE` | Tipo do banco (PostgreSQL) |
| `DATABASE_HOST` | Endereço do banco. `treinamento-crud-db` é o nome do container dentro do Docker |
| `DATABASE_PORT` | Porta do banco |
| `DATABASE_USER` / `DATABASE_PASSWORD` | Usuário e senha que o Docker cria para o banco |
| `DATABASE_DB` | Nome do banco de dados |
| `DATABASE_URL` | Endereço completo que o Prisma usa, montado a partir das variáveis acima. **Não precisa mexer** |

> **Não precisa trocar nada** para rodar na sua máquina: esses valores servem só para o banco local do Docker.
>
> **Por que o host é `treinamento-crud-db` e não `localhost`?** A API roda *dentro* do Docker e enxerga o banco pelo nome do container. Já os comandos que você roda na sua máquina (`yarn migration` e `yarn studio`) trocam o host para `localhost` sozinhos, então o `.env` funciona nos dois casos.

---

## ⚙️ Como rodar

Com o Docker Desktop aberto, rode na raiz do projeto:

```bash
# 1. Crie o .env (veja a seção acima)
copy .env.example .env

# 2. Instale as dependências na sua máquina
#    (sem isso, o yarn migration dá "cross-env não é reconhecido")
yarn

# 3. Suba a API e o banco
docker compose up -d --build

# 4. Crie as tabelas no banco a partir do schema.prisma
yarn migration
```

Para conferir se deu certo, abra `http://localhost:3001` no navegador. Deve aparecer:

```json
{ "message": "API do treinamento de CRUD do CITi 🚀" }
```

> Se a porta 3001 ou a 5432 já estiver em uso (por exemplo, por um Postgres instalado na sua máquina), troque `SERVER_PORT` ou `DATABASE_PORT` no `.env` e suba de novo.

### Comandos do dia a dia

| Comando | O que faz |
|---|---|
| `docker compose up -d` | Sobe a API e o banco |
| `docker compose logs -f server` | Mostra os logs da API (é aqui que os erros aparecem) |
| `docker compose down` | Derruba os containers |
| `yarn migration` | Cria uma migration a partir do `schema.prisma` e aplica no banco |
| `yarn studio` | Abre o Prisma Studio para ver o banco no navegador |
| `yarn typecheck` | Procura erros de tipo no TypeScript |

> Prefere npm? Todos os comandos funcionam com `npm install` e `npm run <comando>`.

> A API recarrega sozinha quando você salva um arquivo em `src/`. Só precisa rodar `docker compose up -d --build` de novo se mudar o `package.json` ou o `Dockerfile`.

---

## 📁 Estrutura

```
prisma/
  schema.prisma          # Models (tabelas) do banco
  migrations/            # Histórico de mudanças no banco, gerado pelo yarn migration
src/
  server.ts              # Cria o app Express e sobe o servidor
  routes.ts              # Liga cada rota HTTP a uma função do controller
  database/index.ts      # Conexão com o banco (Prisma Client)
  controllers/           # Recebe a requisição, valida e responde
  repositories/          # Única camada que conversa com o banco
```

O caminho de uma requisição:

```
Requisição → routes.ts → Controller → Repository → Banco
                              ↓
Resposta  ←───────────────────┘  (status HTTP + JSON)
```

- **Rota** (`routes.ts`): diz qual função responde a cada método + caminho, por exemplo `POST /users`.
- **Controller**: lê o que veio na requisição (`req.body`, `req.params`), valida e escolhe o status HTTP da resposta.
- **Repository**: faz a consulta no banco com o Prisma. O controller nunca fala com o banco direto.

---

## 🔌 Rotas de usuário

O usuário tem estes campos:

| Campo | Tipo | Observação |
|---|---|---|
| `id` | número | Gerado pelo banco |
| `nome` | texto | Obrigatório |
| `conta` | `"CPF"` ou `"CNPJ"` | Obrigatório, em maiúsculas |
| `documento` | texto | Obrigatório e único (não pode repetir) |
| `createdAt` / `updatedAt` | data | Preenchidos pelo banco |

Rotas:

| Método | Rota | O que faz | Sucesso |
|---|---|---|---|
| `POST` | `/users` | Cadastra um usuário | `201` |
| `GET` | `/users` | Lista todos os usuários | `200` |
| `GET` | `/users/:id` | Busca um usuário pelo id | `200` |
| `PATCH` | `/users/:id` | Edita um ou mais campos do usuário | `200` |
| `DELETE` | `/users/:id` | Remove o usuário | `204` |

Exemplo de corpo para `POST /users`:

```json
{
  "nome": "Maria Silva",
  "conta": "CPF",
  "documento": "12345678900"
}
```

Para o `PATCH`, envie só o que vai mudar:

```json
{ "nome": "Maria S. Silva" }
```

### Testando no Thunder Client

1. Crie uma requisição, escolha o método (`POST`, `GET`...) e use a URL `http://localhost:3001/users`.
2. Para `POST` e `PATCH`, vá em **Body → JSON** e cole o JSON **puro**, sem aspas em volta e sem `\"`.
3. Para as rotas com `:id`, troque pelo número do usuário: `http://localhost:3001/users/1`.

---

## 🚦 Status HTTP usados

| Status | Quando usar |
|---|---|
| `200 OK` | Deu certo e tem algo para devolver |
| `201 Created` | Algo novo foi criado |
| `204 No Content` | Deu certo e não há corpo (ex.: delete) |
| `400 Bad Request` | O cliente mandou dados faltando ou inválidos |
| `404 Not Found` | O recurso (id) não existe |
| `500 Internal Server Error` | Erro inesperado do nosso lado |

---

## 🧭 Passo a passo para criar um CRUD novo

Use o usuário como referência e siga a mesma ordem:

1. **Model**: adicione o model em `prisma/schema.prisma`.
2. **Migration**: rode `yarn migration` e dê um nome (ex.: `create_planta_model`). Sempre que mudar o `schema.prisma` (criar, renomear ou apagar campo), rode de novo.
3. **Repository**: crie `src/repositories/<Entidade>Repository.ts` com as funções que acessam o banco.
4. **Controller**: crie `src/controllers/<Entidade>Controller.ts`, que valida os dados e devolve os status certos.
5. **Rotas**: importe o controller e registre as rotas em `src/routes.ts`.
6. **Teste**: chame cada rota no Thunder Client, Insomnia ou Postman, incluindo os casos de erro.

---

## 🆘 Problemas comuns

| Erro | O que fazer |
|---|---|
| `'cross-env' não é reconhecido como um comando` | Faltou instalar as dependências na sua máquina: rode `yarn`. |
| `Environment variable not found: DATABASE_URL` | Falta o `.env` na raiz do projeto. Veja [Configurando o `.env`](#-configurando-o-env). |
| `Can't reach database server` | O Docker não está rodando. Abra o Docker Desktop e rode `docker compose up -d`. |
| A API não responde em `localhost:3001` | Veja o erro em `docker compose logs -f server`. |
| `Cannot find module '@controllers/...'` | O nome no `import` não bate com o nome do arquivo (atenção a letras e ao `s` no final). |
| `ReferenceError: UserController is not defined` | Faltou importar o controller no `routes.ts`. |
| `500` ao criar ou editar depois de mudar o `schema.prisma` | O banco ainda está com as colunas antigas: rode `yarn migration`. |
| `SyntaxError: ... is not valid JSON` | O corpo da requisição não é um JSON válido. Cole o JSON puro em **Body → JSON**. |

> Dica: rode `yarn typecheck` antes de testar. A API não mostra erros de tipo ao rodar, mas o `typecheck` mostra todos de uma vez.
