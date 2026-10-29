import { Conta, Luminosidade, Prisma, PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../src/app";
import originalPrisma from "../src/database";

const prisma = new PrismaClient();
const INT_MAX = 2_147_483_647;

// Dados artificiais de teste; nao representam recomendacoes de cuidado ou seguranca animal.
const fixture = {
  nome: "Planta Alfa",
  especie: "Exemplo A",
  preco: 8990,
  estoque: 12,
  luminosidade: Luminosidade.MEIA_SOMBRA,
  petFriendly: false,
  regaACadaDias: 3
};

function assertDedicatedDatabase(): void {
  const address = process.env.DATABASE_URL;
  if (!address) throw new Error("Defina DATABASE_URL para um banco dedicado chamado folhagem_test.");
  const databaseName = decodeURIComponent(new URL(address).pathname).slice(1);
  if (!databaseName.includes("folhagem_test")) {
    throw new Error("Limpeza recusada: DATABASE_URL precisa apontar para um banco contendo folhagem_test no nome.");
  }
}

function expectError(response: { status: number; body: unknown }, expectedStatus: number): void {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toBeTypeOf("object");
  const body = response.body as Record<string, unknown>;
  expect(body.message).toBeTypeOf("string");
  expect((body.message as string).trim().length).toBeGreaterThan(3);
}

async function insert(overrides: Partial<Prisma.PlantaCreateInput> = {}) {
  return prisma.planta.create({ data: { ...fixture, ...overrides } });
}

beforeAll(async () => {
  assertDedicatedDatabase();
  await prisma.$connect();
});

beforeEach(async () => {
  assertDedicatedDatabase();
  await prisma.planta.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  try {
    assertDedicatedDatabase();
    await prisma.planta.deleteMany();
    await prisma.user.deleteMany();
  } finally {
    await Promise.all([prisma.$disconnect(), originalPrisma.$disconnect()]);
  }
});

describe("cadastro", () => {
  it("persiste todos os campos e devolve id e datas automaticos", async () => {
    const response = await request(app).post("/plantas").send({ ...fixture, petFriendly: true });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ...fixture, petFriendly: true });
    expect(Number.isInteger(response.body.id)).toBe(true);
    expect(response.body.id).toBeGreaterThan(0);
    for (const field of ["createdAt", "updatedAt"]) {
      expect(response.body[field]).toBeTypeOf("string");
      expect(Number.isNaN(Date.parse(response.body[field]))).toBe(false);
    }
    const saved = await prisma.planta.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(saved.preco).toBe(8990);
    expect(saved.petFriendly).toBe(true);
    expect(saved.createdAt.toISOString()).toBe(response.body.createdAt);
  });

  it("aceita estoque zero e booleano false sem tratar como ausentes", async () => {
    const response = await request(app).post("/plantas").send({ ...fixture, estoque: 0, petFriendly: false });
    expect(response.status).toBe(201);
    expect(response.body.estoque).toBe(0);
    expect(response.body.petFriendly).toBe(false);
  });

  it.each(Object.keys(fixture))("recusa a falta do campo %s", async (field) => {
    const body: Record<string, unknown> = { ...fixture };
    delete body[field];
    const response = await request(app).post("/plantas").send(body);
    expectError(response, 400);
    expect(await prisma.planta.count()).toBe(0);
  });

  const invalidFields: Array<[string, Record<string, unknown>]> = [
    ["nome vazio", { nome: "   " }],
    ["nome numerico", { nome: 20 }],
    ["especie vazia", { especie: "" }],
    ["especie nula", { especie: null }],
    ["preco zero", { preco: 0 }],
    ["preco string", { preco: "8990" }],
    ["preco fracionario", { preco: 89.9 }],
    ["preco acima de Int32", { preco: INT_MAX + 1 }],
    ["estoque negativo", { estoque: -1 }],
    ["estoque fracionario", { estoque: 1.5 }],
    ["rega zero", { regaACadaDias: 0 }],
    ["rega string", { regaACadaDias: "3" }],
    ["enum desconhecido", { luminosidade: "LUA" }],
    ["booleano string", { petFriendly: "false" }],
    ["booleano nulo", { petFriendly: null }],
    ["preco nulo", { preco: null }]
  ];

  it.each(invalidFields)("recusa %s sem gravar nada", async (_label, fields) => {
    const response = await request(app).post("/plantas").send({ ...fixture, ...fields });
    expectError(response, 400);
    expect(await prisma.planta.count()).toBe(0);
  });

  it("recusa campos desconhecidos e campos gerados pelo banco", async () => {
    for (const extra of [{ outro: true }, { id: 2 }, { createdAt: "2020-01-01T00:00:00.000Z" }]) {
      expectError(await request(app).post("/plantas").send({ ...fixture, ...extra }), 400);
    }
    expect(await prisma.planta.count()).toBe(0);
  });

  it("recusa corpo ausente, null, array e valores primitivos", async () => {
    expectError(await request(app).post("/plantas"), 400);
    for (const body of ["null", "[]", "42", '"texto"']) {
      const response = await request(app).post("/plantas").set("Content-Type", "application/json").send(body);
      expectError(response, 400);
    }
    expect(await prisma.planta.count()).toBe(0);
  });
});

describe("busca por id", () => {
  it("devolve a planta existente com os mesmos dados persistidos", async () => {
    const saved = await insert();
    const response = await request(app).get(`/plantas/${saved.id}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: saved.id, ...fixture });
    expect(response.body.createdAt).toBe(saved.createdAt.toISOString());
  });

  it("devolve 404 para id valido inexistente", async () => {
    expectError(await request(app).get(`/plantas/${INT_MAX}`), 404);
  });

  it("recusa ids invalidos tambem na edicao, exclusao e venda", async () => {
    for (const id of ["abc", "0", "-1", "1.5", "1e2", String(INT_MAX + 1)]) {
      expectError(await request(app).get(`/plantas/${id}`), 400);
      expectError(await request(app).patch(`/plantas/${id}`).send({ preco: 1500 }), 400);
      expectError(await request(app).delete(`/plantas/${id}`), 400);
      expectError(await request(app).post(`/plantas/${id}/venda`).send({ quantidade: 1 }), 400);
    }
  });
});

describe("edicao parcial", () => {
  it("edita apenas o preco, preserva os outros campos e atualiza updatedAt", async () => {
    const oldDate = new Date("2020-01-01T00:00:00.000Z");
    const saved = await insert({ createdAt: oldDate, updatedAt: oldDate });
    const response = await request(app).patch(`/plantas/${saved.id}`).send({ preco: 4500 });
    expect(response.status).toBe(200);
    const after = await prisma.planta.findUniqueOrThrow({ where: { id: saved.id } });
    expect(after).toEqual({ ...saved, preco: 4500, updatedAt: after.updatedAt });
    expect(after.updatedAt.getTime()).toBeGreaterThan(saved.updatedAt.getTime());
    expect(response.body.updatedAt).toBe(after.updatedAt.toISOString());
    expect(response.body.createdAt).toBe(oldDate.toISOString());
  });

  it("permite zerar o estoque e mudar petFriendly de true para false", async () => {
    const saved = await insert({ petFriendly: true });
    const response = await request(app).patch(`/plantas/${saved.id}`).send({ estoque: 0, petFriendly: false });
    expect(response.status).toBe(200);
    expect(response.body.estoque).toBe(0);
    expect(response.body.petFriendly).toBe(false);
    const after = await prisma.planta.findUniqueOrThrow({ where: { id: saved.id } });
    expect(after.estoque).toBe(0);
    expect(after.petFriendly).toBe(false);
  });

  it("aplica as regras do cadastro aos campos enviados e nao altera o registro na recusa", async () => {
    const saved = await insert();
    const invalidPatches = [
      { preco: 0 }, { preco: "4500" }, { preco: 4.5 }, { preco: INT_MAX + 1 },
      { estoque: -1 }, { estoque: "0" }, { estoque: INT_MAX + 1 },
      { regaACadaDias: 0 }, { regaACadaDias: INT_MAX + 1 },
      { nome: " " }, { especie: null }, { petFriendly: "true" }, { luminosidade: "LUA" }
    ];
    for (const body of invalidPatches) {
      expectError(await request(app).patch(`/plantas/${saved.id}`).send(body), 400);
      expect(await prisma.planta.findUniqueOrThrow({ where: { id: saved.id } })).toEqual(saved);
    }
  });

  it("recusa campo desconhecido sem aplicar os demais campos validos", async () => {
    const saved = await insert();
    expectError(await request(app).patch(`/plantas/${saved.id}`).send({ preco: 2000, id: 7 }), 400);
    expect(await prisma.planta.findUniqueOrThrow({ where: { id: saved.id } })).toEqual(saved);
  });

  it("recusa PATCH vazio e corpos que nao sao objetos", async () => {
    const saved = await insert();
    for (const body of ["{}", "null", "[]"]) {
      expectError(await request(app).patch(`/plantas/${saved.id}`).set("Content-Type", "application/json").send(body), 400);
    }
    expect(await prisma.planta.findUniqueOrThrow({ where: { id: saved.id } })).toEqual(saved);
  });

  it("devolve 404 ao editar id inexistente com dados validos", async () => {
    expectError(await request(app).patch(`/plantas/${INT_MAX}`).send({ preco: 1000 }), 404);
  });
});

describe("listagem e filtros", () => {
  async function insertFilterExamples() {
    const a = await insert({ nome: "Alfa", luminosidade: Luminosidade.SOMBRA, petFriendly: false });
    const b = await insert({ nome: "Beta", luminosidade: Luminosidade.SOMBRA, petFriendly: true });
    const c = await insert({ nome: "Gama", luminosidade: Luminosidade.SOL_PLENO, petFriendly: true });
    return { a, b, c };
  }

  it("sem filtros inclui tanto true quanto false", async () => {
    const { a, b, c } = await insertFilterExamples();
    const response = await request(app).get("/plantas");
    expect(response.status).toBe(200);
    expect(response.body.map((p: { id: number }) => p.id).sort((x: number, y: number) => x - y)).toEqual([a.id, b.id, c.id]);
  });

  it("aplica luminosidade e petFriendly isolados e juntos, incluindo false", async () => {
    const { a, b, c } = await insertFilterExamples();
    const cases: Array<[Record<string, string>, number[]]> = [
      [{ luminosidade: "SOMBRA" }, [a.id, b.id]],
      [{ petFriendly: "true" }, [b.id, c.id]],
      [{ petFriendly: "false" }, [a.id]],
      [{ luminosidade: "SOMBRA", petFriendly: "true" }, [b.id]]
    ];
    for (const [query, ids] of cases) {
      const response = await request(app).get("/plantas").query(query);
      expect(response.status).toBe(200);
      expect(response.body.map((p: { id: number }) => p.id).sort((x: number, y: number) => x - y)).toEqual(ids);
    }
  });

  it("recusa valores, parametros desconhecidos, arrays e queries repetidas", async () => {
    const queries = [
      "luminosidade=LUA", "luminosidade=sombra", "petFriendly=1", "petFriendly=False",
      "petFriendly=", "nome=", "ordem=estoque", "outro=1",
      "petFriendly=true&petFriendly=false", "luminosidade=SOMBRA&luminosidade=SOL_PLENO",
      "petFriendly[]=true", "nome[x]=Alfa", "ordem=nome&ordem=preco"
    ];
    for (const query of queries) expectError(await request(app).get(`/plantas?${query}`), 400);
  });

  it("filtro valido sem resultado retorna 200 e lista vazia", async () => {
    await insert({ luminosidade: Luminosidade.SOMBRA });
    const response = await request(app).get("/plantas?luminosidade=SOL_PLENO");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe("exclusao", () => {
  it("remove com 204 sem corpo e retorna 404 na busca e na segunda exclusao", async () => {
    const saved = await insert();
    const response = await request(app).delete(`/plantas/${saved.id}`);
    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(await prisma.planta.findUnique({ where: { id: saved.id } })).toBeNull();
    expectError(await request(app).get(`/plantas/${saved.id}`), 404);
    expectError(await request(app).delete(`/plantas/${saved.id}`), 404);
  });
});

describe("vendas", () => {
  it("decrementa a quantidade certa e permite vender todo o saldo", async () => {
    const saved = await insert({ estoque: 3 });
    const response = await request(app).post(`/plantas/${saved.id}/venda`).send({ quantidade: 2 });
    expect(response.status).toBe(200);
    expect(response.body.estoque).toBe(1);
    expect(response.body.preco).toBe(saved.preco);
    expect(response.body.id).toBe(saved.id);
    expect((await prisma.planta.findUniqueOrThrow({ where: { id: saved.id } })).estoque).toBe(1);
    const last = await request(app).post(`/plantas/${saved.id}/venda`).send({ quantidade: 1 });
    expect(last.status).toBe(200);
    expect(last.body.estoque).toBe(0);
  });

  it("recusa quantidade maior que o saldo e planta esgotada sem alterar nada", async () => {
    const saved = await insert({ estoque: 2 });
    expectError(await request(app).post(`/plantas/${saved.id}/venda`).send({ quantidade: 3 }), 400);
    expect(await prisma.planta.findUniqueOrThrow({ where: { id: saved.id } })).toEqual(saved);
    const empty = await insert({ estoque: 0 });
    expectError(await request(app).post(`/plantas/${empty.id}/venda`).send({ quantidade: 1 }), 400);
    expect(await prisma.planta.findUniqueOrThrow({ where: { id: empty.id } })).toEqual(empty);
  });

  it("recusa quantidade ausente, zero, negativa, fracionaria, string, null e overflow", async () => {
    const saved = await insert();
    for (const body of [{}, { quantidade: 0 }, { quantidade: -1 }, { quantidade: 1.5 },
      { quantidade: "2" }, { quantidade: null }, { quantidade: true }, { quantidade: INT_MAX + 1 }]) {
      expectError(await request(app).post(`/plantas/${saved.id}/venda`).send(body), 400);
      expect(await prisma.planta.findUniqueOrThrow({ where: { id: saved.id } })).toEqual(saved);
    }
  });

  it("retorna 404 para venda de id inexistente com quantidade valida", async () => {
    expectError(await request(app).post(`/plantas/${INT_MAX}/venda`).send({ quantidade: 1 }), 404);
  });

  it("recusa campos extras e corpo array na venda", async () => {
    const saved = await insert();
    expectError(await request(app).post(`/plantas/${saved.id}/venda`).send({ quantidade: 1, estoque: 0 }), 400);
    expectError(await request(app).post(`/plantas/${saved.id}/venda`).send([1]), 400);
    expect(await prisma.planta.findUniqueOrThrow({ where: { id: saved.id } })).toEqual(saved);
  });

  it("duas compras concorrentes do ultimo vaso resultam em uma venda e uma recusa", async () => {
    const saved = await insert({ estoque: 1 });
    const responses = await Promise.all([
      request(app).post(`/plantas/${saved.id}/venda`).send({ quantidade: 1 }),
      request(app).post(`/plantas/${saved.id}/venda`).send({ quantidade: 1 })
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    expect(responses.find((response) => response.status === 200)?.body.estoque).toBe(0);
    expect((await prisma.planta.findUniqueOrThrow({ where: { id: saved.id } })).estoque).toBe(0);
  });

  it("dez compras concorrentes respeitam saldo de tres vasos sem estoque negativo", async () => {
    const saved = await insert({ estoque: 3 });
    const responses = await Promise.all(Array.from({ length: 10 }, () =>
      request(app).post(`/plantas/${saved.id}/venda`).send({ quantidade: 1 })
    ));
    expect(responses.filter((response) => response.status === 200)).toHaveLength(3);
    expect(responses.filter((response) => response.status === 400)).toHaveLength(7);
    for (const response of responses.filter((response) => response.status === 200)) {
      expect(response.body.estoque).toBeGreaterThanOrEqual(0);
    }
    expect((await prisma.planta.findUniqueOrThrow({ where: { id: saved.id } })).estoque).toBe(0);
  });
});

describe("valor total do estoque", () => {
  it("retorna zeros quando a loja esta vazia", async () => {
    const response = await request(app).get("/plantas/estoque/valor-total");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ valorTotalEmCentavos: 0, totalDeVasos: 0 });
  });

  it("confere conta independente, inclui esgotadas e reflete uma venda", async () => {
    const a = await insert({ preco: 8990, estoque: 2 });
    await insert({ preco: 2500, estoque: 3 });
    await insert({ preco: 10000, estoque: 0 });
    const before = await request(app).get("/plantas/estoque/valor-total");
    expect(before.status).toBe(200);
    // Conta externa ao algoritmo da API: 8990*2 + 2500*3 + 10000*0 = 25480; 2+3+0 = 5.
    expect(before.body).toEqual({ valorTotalEmCentavos: 25480, totalDeVasos: 5 });
    expect((await request(app).post(`/plantas/${a.id}/venda`).send({ quantidade: 1 })).status).toBe(200);
    const after = await request(app).get("/plantas/estoque/valor-total");
    expect(after.status).toBe(200);
    expect(after.body).toEqual({ valorTotalEmCentavos: 16490, totalDeVasos: 4 });
  });

  it("devolve 200 com token JSON inteiro exato mesmo acima do limite seguro de JS", async () => {
    await insert({ preco: INT_MAX, estoque: INT_MAX });
    const response = await request(app).get("/plantas/estoque/valor-total");
    const exactTotal = (2147483647n * 2147483647n).toString();
    expect(response.status).toBe(200);
    expect(response.type).toBe("application/json");
    // JSON.parse usa Number e arredonda este valor: conferir o token bruto recebido por HTTP.
    expect(response.text).toMatch(new RegExp(`"valorTotalEmCentavos"\\s*:\\s*${exactTotal}(?=\\s*[,}])`));
    expect(response.text).toMatch(/"totalDeVasos"\s*:\s*2147483647(?=\s*[,}])/);
  });
});

describe("bonus", () => {
  it("busca trecho do nome sem diferenciar maiusculas e combina filtros", async () => {
    const a = await insert({ nome: "Folha Alfa", petFriendly: true });
    await insert({ nome: "Outra folha", petFriendly: false });
    await insert({ nome: "Beta", petFriendly: true });
    const response = await request(app).get("/plantas").query({ nome: "fOLhA", petFriendly: "true" });
    expect(response.status).toBe(200);
    expect(response.body.map((p: { id: number }) => p.id)).toEqual([a.id]);
  });

  it("ordena por preco e nome em ordem crescente", async () => {
    const beta = await insert({ nome: "Beta", preco: 1000 });
    const alfa = await insert({ nome: "Alfa", preco: 2000 });
    const cases: Array<[string, number[]]> = [["preco", [beta.id, alfa.id]], ["nome", [alfa.id, beta.id]]];
    for (const [ordem, ids] of cases) {
      const response = await request(app).get("/plantas").query({ ordem });
      expect(response.status).toBe(200);
      expect(response.body.map((p: { id: number }) => p.id)).toEqual(ids);
    }
  });

  it("rota fixa de esgotadas funciona antes de :id e lista apenas estoque zero", async () => {
    const empty = await insert({ estoque: 0 });
    await insert({ estoque: 1 });
    const response = await request(app).get("/plantas/esgotadas");
    expect(response.status).toBe(200);
    expect(response.body.map((p: { id: number }) => p.id)).toEqual([empty.id]);
  });
});

describe("processamento HTTP", () => {
  it("JSON malformado retorna 400 com mensagem e nao cria registros", async () => {
    const response = await request(app).post("/plantas").set("Content-Type", "application/json").send('{"preco":');
    expectError(response, 400);
    expect(await prisma.planta.count()).toBe(0);
  });
});

describe("regressao do CRUD original de usuarios", () => {
  const userFixture = { nome: "Usuario de teste", conta: Conta.CPF, documento: "teste-cpf-001" };

  it("POST /users continua cadastrando CPF com id, datas e persistencia", async () => {
    const response = await request(app).post("/users").send(userFixture);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject(userFixture);
    expect(Number.isInteger(response.body.id)).toBe(true);
    expect(response.body.id).toBeGreaterThan(0);
    for (const field of ["createdAt", "updatedAt"]) {
      expect(Number.isNaN(Date.parse(response.body[field]))).toBe(false);
    }
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(saved).toMatchObject(userFixture);
    expect(saved.createdAt.toISOString()).toBe(response.body.createdAt);
  });

  it("POST aceita CNPJ e GET /users continua listando os dois tipos de conta", async () => {
    const cpf = await prisma.user.create({ data: userFixture });
    const cnpjInput = { nome: "Empresa de teste", conta: Conta.CNPJ, documento: "teste-cnpj-002" };
    const created = await request(app).post("/users").send(cnpjInput);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject(cnpjInput);
    const response = await request(app).get("/users");
    expect(response.status).toBe(200);
    expect(response.body.map((user: { id: number }) => user.id).sort((a: number, b: number) => a - b)).toEqual([cpf.id, created.body.id]);
  });

  it("GET /users/:id continua retornando usuario existente e 404 para inexistente", async () => {
    const saved = await prisma.user.create({ data: userFixture });
    const response = await request(app).get(`/users/${saved.id}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: saved.id, ...userFixture });
    expectError(await request(app).get(`/users/${INT_MAX}`), 404);
  });

  it("PATCH /users/:id continua parcial e preserva documento e tipo de conta", async () => {
    const oldDate = new Date("2020-01-01T00:00:00.000Z");
    const saved = await prisma.user.create({ data: { ...userFixture, createdAt: oldDate, updatedAt: oldDate } });
    const response = await request(app).patch(`/users/${saved.id}`).send({ nome: "Nome editado" });
    expect(response.status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: saved.id } });
    expect(after).toEqual({ ...saved, nome: "Nome editado", updatedAt: after.updatedAt });
    expect(after.updatedAt.getTime()).toBeGreaterThan(saved.updatedAt.getTime());
    expect(response.body).toMatchObject({ nome: "Nome editado", conta: saved.conta, documento: saved.documento });
    expect(response.body.createdAt).toBe(oldDate.toISOString());
    expectError(await request(app).patch(`/users/${INT_MAX}`).send({ nome: "Teste" }), 404);
  });

  it("DELETE /users/:id continua respondendo 204 sem corpo e 404 depois da exclusao", async () => {
    const saved = await prisma.user.create({ data: userFixture });
    const response = await request(app).delete(`/users/${saved.id}`);
    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(await prisma.user.findUnique({ where: { id: saved.id } })).toBeNull();
    expectError(await request(app).get(`/users/${saved.id}`), 404);
    expectError(await request(app).delete(`/users/${saved.id}`), 404);
  });

  it("POST /users continua recusando cadastro incompleto com 400", async () => {
    const response = await request(app).post("/users").send({ nome: "Usuario de teste", conta: "CPF" });
    expectError(response, 400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("POST /users preserva 400 do parser original para JSON null, numero e string", async () => {
    for (const body of ["null", "42", '"texto"']) {
      const response = await request(app).post("/users").set("Content-Type", "application/json").send(body);
      expectError(response, 400);
      expect(await prisma.user.count()).toBe(0);
    }
  });
});
