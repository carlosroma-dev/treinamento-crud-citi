# Treinamento de CRUD — CITi

API de exemplo com um **CRUD de usuários** para o treinamento de back-end dos aspirantes.

**Stack:** Node.js · Express · TypeScript · Prisma · PostgreSQL · Docker

> **CRUD** = **C**reate, **R**ead, **U**pdate e **D**elete: as quatro operações básicas de qualquer cadastro (criar, listar/buscar, editar e remover).

| Arquivo | O que tem |
|---|---|
| `README.md` (este) | Como rodar o projeto e como o CRUD de usuários funciona |
| [`DESAFIO.md`](DESAFIO.md) | O enunciado do desafio Folhagem & Cia: o que construir e entregar |

---

## ✅ Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/): roda a API e o banco em containers. **Deixe ele aberto** sempre que for rodar o projeto.
- [Node.js 20+](https://nodejs.org): para rodar os comandos `yarn` na sua máquina.
- Yarn: `npm install -g yarn`
- Um cliente HTTP para testar as rotas: [Thunder Client](https://www.thunderclient.com/) (extensão do VS Code), Insomnia ou Postman.

---

## ⚙️ Como rodar

Com o Docker Desktop aberto, rode na raiz do projeto:

```bash
# 1. Crie o .env a partir do modelo
cp .env.example .env        # no PowerShell ou CMD: copy .env.example .env

# 2. Instale as dependências na sua máquina
#    (sem isso, o yarn migration dá "cross-env não é reconhecido")
yarn

# 3. Suba a API e o banco
docker compose up -d --build

# 4. Crie as tabelas no banco a partir das migrations
yarn migration
```

Para conferir, abra `http://localhost:3001` no navegador. Deve aparecer:

```json
{ "message": "API do treinamento de CRUD do CITi 🚀" }
```

### O `.env`

O `.env` guarda as configurações do projeto e **não vai para o git**. Os valores do `.env.example` já funcionam na sua máquina, então não precisa trocar nada. As únicas variáveis que você pode querer mexer:

| Variável | Quando mexer |
|---|---|
| `SERVER_PORT` | A porta 3001 já está em uso |
| `DATABASE_PORT` | A porta 5432 já está em uso (por exemplo, por um Postgres instalado na máquina) |

> **Por que o host do banco é `treinamento-crud-db`?** A API roda dentro do Docker e enxerga o banco pelo nome do container. Os comandos locais `yarn migration`, `yarn studio` e `yarn seed` usam `127.0.0.1`. A porta continua sendo a `DATABASE_PORT` do `.env`.

### Comandos do dia a dia

| Comando | O que faz |
|---|---|
| `docker compose up -d` | Sobe a API e o banco |
| `docker compose logs -f server` | Mostra os logs da API (é aqui que os erros aparecem) |
| `docker compose down` | Derruba os containers (os dados do banco continuam salvos) |
| `yarn migration` | Cria uma migration a partir do `schema.prisma` e aplica no banco |
| `yarn studio` | Abre o Prisma Studio para ver o banco no navegador |
| `yarn typecheck` | Procura erros de tipo no TypeScript |

A API recarrega sozinha quando você salva um arquivo em `src/`. Só precisa rodar `docker compose up -d --build` de novo se mudar o `package.json` ou o `Dockerfile`.

> Prefere npm? Todos os comandos funcionam com `npm install` e `npm run <comando>`.

---

## 📁 Estrutura

```
prisma/
  schema.prisma          # Models (tabelas) do banco
  migrations/            # Histórico de mudanças no banco, gerado pelo yarn migration
src/
  app.ts                 # Configura o Express, as rotas e os erros HTTP
  server.ts              # Abre a porta HTTP e encerra as conexoes ao sair
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

## 🔌 CRUD de usuários

| Campo | Tipo | Observação |
|---|---|---|
| `id` | número | Gerado pelo banco (1, 2, 3...) |
| `nome` | texto | Obrigatório |
| `conta` | `"CPF"` ou `"CNPJ"` | Obrigatório, em maiúsculas |
| `documento` | texto | Obrigatório e único (não pode repetir) |
| `createdAt` / `updatedAt` | data | Preenchidos pelo banco |

| Método | Rota | O que faz | Sucesso | Erros |
|---|---|---|---|---|
| `POST` | `/users` | Cadastra um usuário | `201` | `400` se faltar campo |
| `GET` | `/users` | Lista todos os usuários | `200` | |
| `GET` | `/users/:id` | Busca um usuário pelo id | `200` | `404` se o id não existir |
| `PATCH` | `/users/:id` | Edita só os campos enviados | `200` | `404` se o id não existir |
| `DELETE` | `/users/:id` | Remove o usuário | `204` | `404` se o id não existir |

Qualquer erro inesperado responde `500`.

Exemplo de corpo para `POST /users`:

```json
{
  "nome": "Maria Silva",
  "conta": "CPF",
  "documento": "12345678900"
}
```

Para o `PATCH`, envie só o que vai mudar: `{ "nome": "Maria S. Silva" }`.

### Testando no Thunder Client

1. Crie uma requisição, escolha o método (`POST`, `GET`...) e use a URL `http://localhost:3001/users`.
2. Para `POST` e `PATCH`, vá em **Body → JSON** e cole o JSON **puro**, sem aspas em volta e sem `\"`.
3. Para as rotas com `:id`, troque pelo número do usuário: `http://localhost:3001/users/1`.

---

## 🆘 Problemas comuns

| Erro | O que fazer |
|---|---|
| `'cross-env' não é reconhecido como um comando` | Faltou instalar as dependências na sua máquina: rode `yarn`. |
| `Environment variable not found: DATABASE_URL` | Falta o `.env` na raiz do projeto: `cp .env.example .env`. |
| `failed to connect to the docker API` | O Docker Desktop está fechado. Abra e espere ele ficar pronto. |
| `port is already allocated` | Troque `SERVER_PORT` ou `DATABASE_PORT` no `.env` e suba de novo. |
| `Can't reach database server` | Os containers não estão de pé: `docker compose up -d`. |
| `Property 'user' does not exist on type 'PrismaClient'` | Rode `yarn migration` e, no VS Code, **Ctrl+Shift+P → Restart TS Server**. |
| A API não responde em `localhost:3001` | Veja o erro em `docker compose logs -f server`. |
| `500` ao criar ou editar depois de mudar o `schema.prisma` | O banco ainda está com as colunas antigas: rode `yarn migration`. |
| `SyntaxError: ... is not valid JSON` ou `req.body` chega `undefined` | O corpo não foi como JSON. Cole o JSON puro em **Body → JSON**. |

> Dica: rode `yarn typecheck` antes de testar. A API não mostra erros de tipo ao rodar, mas o `typecheck` mostra todos de uma vez.

---

## Folhagem & Cia - implementacao do desafio

O trabalho foi feito no fork `carlosroma-dev/treinamento-crud-citi`, a partir de `lucascavalcannti/treinamento-crud-citi`, commit `bd7d2f7`. Os arquivos de Controller e Repository de usuarios, o singleton do banco, o model User, o enum Conta e a migration original foram preservados.

Usei o Codex, da OpenAI, como apoio no desenvolvimento, na revisao da logica, nos testes e na revisao do material. Conferi o codigo e os resultados, avaliei as sugestoes e validei a versao final antes da entrega. Veja o relato e a documentacao completa da API em [RELATORIO.md](RELATORIO.md) ou [RELATORIO.pdf](RELATORIO.pdf).

Aprendi que um sistema profissional vai alem de escrever codigo. A organizacao, as validacoes, os testes e a documentacao fazem parte da entrega, porque outra pessoa precisa conseguir rodar, entender e confiar no que foi feito.

O container espera o banco ficar pronto e gera o Prisma Client antes de iniciar o modo de desenvolvimento. Ao mudar o schema com o ambiente ja rodando, aplique a migration, gere tambem o client do container e reinicie o servidor para carregar o cliente novo:

```powershell
yarn migration
docker compose exec -T server yarn generate
docker compose restart server
```

### Planta e rotas

Cadastro JSON de exemplo (dados ficticios):

```json
{
  "nome": "Planta exemplo A",
  "especie": "Exemplo A",
  "preco": 8990,
  "estoque": 2,
  "luminosidade": "MEIA_SOMBRA",
  "petFriendly": false,
  "regaACadaDias": 3
}
```

| Metodo | Caminho | Sucesso |
| --- | --- | --- |
| POST | /plantas | 201, planta completa |
| GET | /plantas | 200, lista de plantas |
| GET | /plantas/:id | 200, planta completa |
| PATCH | /plantas/:id | 200, planta atualizada |
| DELETE | /plantas/:id | 204, sem corpo |
| POST | /plantas/:id/venda | 200, planta com estoque atualizado |
| GET | /plantas/estoque/valor-total | 200, valorTotalEmCentavos e totalDeVasos |
| GET | /plantas/esgotadas | 200, lista com estoque zero |

Venda recebe `{"quantidade":1}`. PATCH recebe apenas os campos que mudam, por exemplo `{"preco":9500}`. Id e datas sao automaticos. Preco e inteiro positivo em centavos, estoque e inteiro nao negativo, regaACadaDias e inteiro positivo; textos nao podem ficar vazios e petFriendly aceita booleano real. Luminosidade aceita SOMBRA, MEIA_SOMBRA ou SOL_PLENO. Inteiros respeitam Int32.

Filtros opcionais, combinaveis na listagem e nas esgotadas: `?luminosidade=MEIA_SOMBRA&petFriendly=false&nome=exemplo&ordem=preco`. Nome procura trecho literal sem diferenciar maiusculas, inclusive quando contem `%`, `_` ou barra invertida; ordem aceita preco ou nome, em ordem crescente, com id no desempate. Filtro valido sem resultado devolve `[]` com 200.

Erros de plantas usam `{"message":"..."}`. Dados, ids e filtros invalidos retornam 400; id valido inexistente, 404; erro inesperado, 500. Campos extras, PATCH vazio e filtros repetidos tambem sao recusados com 400. A venda usa condicao de saldo e decremento na mesma escrita, dentro de uma transacao: se nao houver estoque, retorna 400 e nao altera o registro.

O total usa BigInt e devolve numeros inteiros JSON exatos. Acima de Number.MAX_SAFE_INTEGER, o cliente precisa preservar a precisao ao ler o JSON: JSON.parse convencional pode arredondar valores muito altos no cliente.

### Seed

```powershell
yarn seed
```

Em banco vazio, cria tres plantas ficticias, cinco vasos e 25480 centavos em estoque. Uma segunda execucao sequencial nao duplica os exemplos nem sobrescreve os existentes. Os dados de cuidado e seguranca animal sao demonstrativos. Se voce editar os exemplos, os totais podem mudar.

### Testes de integracao

Os testes usam Express e PostgreSQL real, sem mocks. Eles limpam as tabelas Planta e User em um banco dedicado. Uma protecao recusa limpeza se o nome do banco nao contiver `folhagem_test`.

No PowerShell, com a configuracao padrao do `.env.example`:

```powershell
docker compose exec -T db createdb -U postgres -p 5432 folhagem_test
$env:DATABASE_URL = 'postgresql://postgres:docker@127.0.0.1:5432/folhagem_test?schema=public'
yarn migration:deploy
yarn test
Remove-Item Env:\DATABASE_URL
yarn typecheck
yarn build
```

Se o banco de testes ja existir, nao repita o createdb. Se mudar porta, usuario ou senha no `.env`, ajuste esses comandos tambem. Nao use o banco principal para testes que limpam dados.

A suite tem 65 testes: 58 de plantas e 7 de regressao dos usuarios, incluindo JSON primitivo recusado com 400 e busca literal por `%`, `_` e barra invertida. A verificacao manual do seed, as migrations em banco novo e as chamadas ao compilado foram feitas separadamente da suite. A subida Docker com volume novo foi conferida na etapa inicial; a revisao final repetiu os testes com PostgreSQL 16 local isolado. Os resultados estao em [VERIFICACAO.json](VERIFICACAO.json), e o relatorio registra as decisoes e as dificuldades reais.
