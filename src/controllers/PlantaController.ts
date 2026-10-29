import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { HttpError } from "../errors/HttpError";
import * as repository from "@repositories/PlantaRepository";
import { validateFilters, validateId, validatePlanta, validateQuantidade } from "../validation/planta";

function respondError(error: unknown, res: Response): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    res.status(404).json({ message: "Planta nao encontrada." });
    return;
  }
  console.error("Erro inesperado na API:", error);
  res.status(500).json({ message: "Erro interno do servidor." });
}

export async function createPlanta(req: Request, res: Response): Promise<void> {
  try {
    const data = validatePlanta(req.body, false);
    const planta = await repository.createPlanta(data);
    res.status(201).json(planta);
  } catch (error) {
    respondError(error, res);
  }
}

export async function listPlantas(req: Request, res: Response): Promise<void> {
  try {
    const filters = validateFilters(req.query);
    res.status(200).json(await repository.findAllPlantas(filters));
  } catch (error) {
    respondError(error, res);
  }
}

export async function listEsgotadas(req: Request, res: Response): Promise<void> {
  try {
    const filters = validateFilters(req.query);
    res.status(200).json(await repository.findAllPlantas(filters, true));
  } catch (error) {
    respondError(error, res);
  }
}

export async function getPlanta(req: Request, res: Response): Promise<void> {
  try {
    const id = validateId(req.params.id);
    const planta = await repository.findPlantaById(id);
    if (planta === null) {
      res.status(404).json({ message: "Planta nao encontrada." });
      return;
    }
    res.status(200).json(planta);
  } catch (error) {
    respondError(error, res);
  }
}

export async function patchPlanta(req: Request, res: Response): Promise<void> {
  try {
    const id = validateId(req.params.id);
    const data = validatePlanta(req.body, true);
    if (await repository.findPlantaById(id) === null) {
      res.status(404).json({ message: "Planta nao encontrada." });
      return;
    }
    res.status(200).json(await repository.updatePlanta(id, data));
  } catch (error) {
    respondError(error, res);
  }
}

export async function removePlanta(req: Request, res: Response): Promise<void> {
  try {
    const id = validateId(req.params.id);
    if (await repository.findPlantaById(id) === null) {
      res.status(404).json({ message: "Planta nao encontrada." });
      return;
    }
    await repository.deletePlanta(id);
    res.status(204).send();
  } catch (error) {
    respondError(error, res);
  }
}

export async function sellPlanta(req: Request, res: Response): Promise<void> {
  try {
    const id = validateId(req.params.id);
    const quantidade = validateQuantidade(req.body);
    res.status(200).json(await repository.sellPlanta(id, quantidade));
  } catch (error) {
    respondError(error, res);
  }
}

export async function getEstoqueValue(_req: Request, res: Response): Promise<void> {
  try {
    const total = await repository.calculateEstoqueValue();
    // Somente inteiros calculados no servidor entram nos literais JSON.
    // Converter BigInt em Number aqui poderia arredondar totais altos.
    res.status(200).type("application/json").send(
      `{"valorTotalEmCentavos":${total.valorTotalEmCentavos},"totalDeVasos":${total.totalDeVasos}}`,
    );
  } catch (error) {
    respondError(error, res);
  }
}
