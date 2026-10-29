import "dotenv/config";
import { PrismaClient, Luminosidade } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Dados ficticios para demonstracao da API, sem orientacao botanica.
  const exemplos = [
    { nome: "Planta exemplo A", especie: "Exemplo A", preco: 8990, estoque: 2, luminosidade: Luminosidade.MEIA_SOMBRA, petFriendly: false, regaACadaDias: 3 },
    { nome: "Planta exemplo B", especie: "Exemplo B", preco: 2500, estoque: 3, luminosidade: Luminosidade.SOMBRA, petFriendly: true, regaACadaDias: 2 },
    { nome: "Planta exemplo C", especie: "Exemplo C", preco: 1500, estoque: 0, luminosidade: Luminosidade.SOL_PLENO, petFriendly: false, regaACadaDias: 7 }
  ];
  // Nome+especie fixos evitam duplicacao sem sobrescrever registros existentes.
  for (const planta of exemplos) {
    const existente = await prisma.planta.findFirst({ where: { nome: planta.nome, especie: planta.especie } });
    if (!existente) await prisma.planta.create({ data: planta });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
