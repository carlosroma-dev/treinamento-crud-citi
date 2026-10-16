# 🌿 Desafio: Folhagem & Cia — Loja de Plantas

A **Folhagem & Cia** é uma loja de plantas que vende pela internet e precisa de uma API para gerenciar o catálogo. Hoje o controle é feito numa planilha, e já aconteceu de venderem uma samambaia que não existia mais no estoque. Vocês vão resolver isso!

Usem o CRUD de usuários deste repositório como referência.

---

## 1. A entidade `Planta`

| Campo | Tipo | Exemplo | Observação |
|---|---|---|---|
| `id` | Int (autoincrement) | `1` | |
| `nome` | String | `"Costela-de-adão"` | Nome popular |
| `especie` | String | `"Monstera deliciosa"` | Nome científico |
| `preco` | Int | `8990` | Em **centavos** (`8990` = R$ 89,90) |
| `estoque` | Int | `12` | Quantidade de vasos disponíveis |
| `luminosidade` | Enum | `"MEIA_SOMBRA"` | `SOMBRA`, `MEIA_SOMBRA` ou `SOL_PLENO` |
| `petFriendly` | Boolean | `true` | Se é segura para cães e gatos |
| `regaACadaDias` | Int | `3` | De quantos em quantos dias regar |
| `createdAt` / `updatedAt` | DateTime | | Preenchidos automaticamente |

> 💡 Por que o preço é em centavos? Números decimais (`float`) têm erros de arredondamento: `0.1 + 0.2` dá `0.30000000000000004`. Com dinheiro, isso é um problema.

---

## 2. Requisitos obrigatórios

### CRUD

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/plantas` | Cadastra uma planta |
| `GET` | `/plantas` | Lista todas as plantas |
| `GET` | `/plantas/:id` | Busca uma planta pelo id |
| `PATCH` | `/plantas/:id` | Edita uma planta |
| `DELETE` | `/plantas/:id` | Remove uma planta |

### Regras de negócio

1. Todos os campos são obrigatórios no cadastro.
2. `preco` precisa ser maior que zero.
3. `estoque` não pode ser negativo, mas **pode ser zero** (planta esgotada).
4. `regaACadaDias` precisa ser pelo menos `1`.
5. `luminosidade` só aceita os três valores do enum. Qualquer outro valor deve retornar `400`.
6. Buscar, editar ou deletar um `id` que não existe deve retornar `404`.

### Funcionalidades da loja

7. **Filtros na listagem.** `GET /plantas` aceita filtros opcionais por query string:
   - `GET /plantas?luminosidade=SOL_PLENO`
   - `GET /plantas?petFriendly=true`
   - Os dois juntos: `GET /plantas?luminosidade=SOMBRA&petFriendly=true`

8. **Vender uma planta.** `POST /plantas/:id/venda` com o corpo `{ "quantidade": 2 }`:
   - Diminui o estoque pela quantidade vendida.
   - Se não houver estoque suficiente, retorna `400` com uma mensagem clara e **não altera nada**.
   - `quantidade` precisa ser maior que zero.

9. **Valor total do estoque.** `GET /plantas/estoque/valor-total` retorna quanto vale tudo o que está na loja (a soma de `preco × estoque` de cada planta):
   ```json
   { "valorTotalEmCentavos": 154300, "totalDeVasos": 37 }
   ```

---

## 3. Bônus (opcionais)

- 🔎 Busca por nome sem diferenciar maiúsculas e minúsculas: `GET /plantas?nome=costela`.
- ↕️ Ordenação: `GET /plantas?ordem=preco` ou `?ordem=nome`.
- 🌱 Um script de *seed* que já popula o banco com algumas plantas.
- 🏷️ Rota `GET /plantas/esgotadas` que lista as plantas com estoque zero (atenção à ordem das rotas!).

---

## 4. Como vamos avaliar

| Critério | O que olhamos |
|---|---|
| **Funcionamento** | O CRUD e as funcionalidades 7, 8 e 9 funcionam |
| **Status HTTP** | Cada resposta usa o status certo (`201`, `400`, `404`, `500`…) |
| **Validações** | As regras de negócio são respeitadas e as mensagens de erro são claras |
| **Organização** | Separação entre controller e repository, rotas no padrão `/plantas` |
| **Prisma** | Model e migration corretos, uso adequado de `where` e enum |
| **Código limpo** | Nomes claros, sem código morto, sem `console.log` esquecido |

---

## 5. Entrega

1. Faça um fork ou clone deste repositório.
2. Implemente o desafio numa branch `desafio/<seu-nome>`.
3. Garanta que o projeto sobe com `docker compose up` e `yarn migration`.
4. Envie o link do repositório.

Boa sorte e boas regas! 🪴
