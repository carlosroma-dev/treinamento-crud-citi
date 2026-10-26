# Treinamento de CRUD — CITi

API de exemplo com um **CRUD de usuários** para o treinamento de back-end dos aspirantes.

**Stack:** Node.js · Express · TypeScript · Prisma · PostgreSQL · Docker

---

## ⚙️ Como rodar

Pré-requisitos: [Docker Desktop](https://www.docker.com/products/docker-desktop/), [Node.js 20+](https://nodejs.org) e Yarn (`npm install -g yarn`).

```bash
# 1. Crie o seu .env a partir do modelo
cp .env.example .env

# 2. Instale as dependências na sua máquina (para o editor e para o Prisma CLI)
yarn

# 3. Suba a API e o banco
docker compose up -d --build

# 4. Crie as tabelas no banco (rode na sua máquina, com o docker rodando)
yarn migration
```

Pronto: a API fica em `http://localhost:3001`.

> Se a porta 3001 ou a 5432 já estiver em uso (por exemplo, por um Postgres instalado na sua máquina), troque `SERVER_PORT` ou `DATABASE_PORT` no `.env`.

| Comando | O que faz |
|---|---|
| `docker compose logs -f server` | Mostra os logs da API |
| `docker compose down` | Derruba os containers |
| `yarn migration` | Cria uma migration a partir do `schema.prisma` e aplica no banco |
| `yarn studio` | Abre o Prisma Studio para ver o banco no navegador |
| `yarn typecheck` | Procura erros de tipo no TypeScript |

> Prefere npm? Todos os comandos funcionam com `npm install` e `npm run <comando>`.

---

## 📁 Estrutura

```
prisma/
  schema.prisma          # Models (tabelas) do banco
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

---

## 🔌 Rotas de usuário

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
2. **Migration**: rode `yarn migration` e dê um nome (ex.: `create_planta_model`).
3. **Repository**: crie `src/repositories/<Entidade>Repository.ts` com as funções que acessam o banco.
4. **Controller**: crie `src/controllers/<Entidade>Controller.ts`, que valida os dados e devolve os status certos.
5. **Rotas**: registre as rotas em `src/routes.ts`.
6. **Teste**: chame cada rota no Insomnia, Postman ou Thunder Client, incluindo os casos de erro.
