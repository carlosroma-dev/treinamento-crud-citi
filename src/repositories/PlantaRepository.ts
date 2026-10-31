import { Prisma } from "@prisma/client";
import prisma from "@database";
import { HttpError } from "../errors/HttpError";
import { PlantaFilters, PlantaInput } from "../validation/planta";

export function createPlanta(data: PlantaInput) {
  return prisma.planta.create({ data });
}

export function findAllPlantas(filters: PlantaFilters, esgotadas = false) {
  // A busca e literal: estes caracteres nao devem virar curingas do ILIKE.
  const nome = filters.nome?.replace(/[\\%_]/g, "\\$&");
  const where: Prisma.PlantaWhereInput = {
    luminosidade: filters.luminosidade,
    petFriendly: filters.petFriendly,
    estoque: esgotadas ? 0 : undefined,
    nome: nome === undefined ? undefined : { contains: nome, mode: "insensitive" },
  };
  const orderBy: Prisma.PlantaOrderByWithRelationInput[] = filters.ordem
    ? [{ [filters.ordem]: "asc" }, { id: "asc" }]
    : [{ id: "asc" }];
  return prisma.planta.findMany({ where, orderBy });
}

export function findPlantaById(id: number) {
  return prisma.planta.findUnique({ where: { id } });
}

export function updatePlanta(id: number, data: Partial<PlantaInput>) {
  return prisma.planta.update({ where: { id }, data });
}

export function deletePlanta(id: number) {
  return prisma.planta.delete({ where: { id } });
}

export function sellPlanta(id: number, quantidade: number) {
  return prisma.$transaction(async (tx) => {
    // Condicao e decremento fazem parte da mesma escrita: duas vendas nao
    // conseguem usar o mesmo saldo de estoque.
    const changed = await tx.planta.updateMany({
      where: { id, estoque: { gte: quantidade } },
      data: { estoque: { decrement: quantidade } },
    });
    if (changed.count === 0) {
      const planta = await tx.planta.findUnique({ where: { id } });
      if (planta === null) throw new HttpError(404, "Planta nao encontrada.");
      throw new HttpError(400, `Estoque insuficiente. Temos ${planta.estoque} vasos.`);
    }
    return tx.planta.findUniqueOrThrow({ where: { id } });
  });
}

export async function calculateEstoqueValue() {
  const plantas = await prisma.planta.findMany({ select: { preco: true, estoque: true } });
  let valor = 0n;
  let vasos = 0n;
  for (const planta of plantas) {
    valor += BigInt(planta.preco) * BigInt(planta.estoque);
    vasos += BigInt(planta.estoque);
  }
  return { valorTotalEmCentavos: valor, totalDeVasos: vasos };
}
