import { Luminosidade } from "@prisma/client";
import { HttpError } from "../errors/HttpError";

const INT_MAX = 2_147_483_647;
const campos = ["nome", "especie", "preco", "estoque", "luminosidade", "petFriendly", "regaACadaDias"] as const;

export interface PlantaInput {
  nome: string;
  especie: string;
  preco: number;
  estoque: number;
  luminosidade: Luminosidade;
  petFriendly: boolean;
  regaACadaDias: number;
}

export interface PlantaFilters {
  luminosidade?: Luminosidade;
  petFriendly?: boolean;
  nome?: string;
  ordem?: "preco" | "nome";
}

function bad(message: string): never {
  throw new HttpError(400, message);
}

export function objectBody(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return bad("O corpo deve ser um objeto JSON.");
  }
  return value as Record<string, unknown>;
}

function allowKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown !== undefined) bad(`Campo desconhecido: ${unknown}.`);
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    return bad(`${field} deve ser um texto nao vazio.`);
  }
  if (value.includes("\u0000")) return bad(`${field} nao pode conter caractere nulo.`);
  return value.trim();
}

function integer(value: unknown, field: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > INT_MAX) {
    return bad(`${field} deve ser inteiro entre ${minimum} e ${INT_MAX}.`);
  }
  return value;
}

function luminosidade(value: unknown): Luminosidade {
  if (typeof value !== "string" || !Object.values(Luminosidade).includes(value as Luminosidade)) {
    return bad("luminosidade deve ser SOMBRA, MEIA_SOMBRA ou SOL_PLENO.");
  }
  return value as Luminosidade;
}

export function validateId(value: string): number {
  // A URL deve representar um inteiro decimal positivo, sem notacao cientifica.
  if (!/^[0-9]+$/.test(value)) return bad("id deve ser um inteiro positivo.");
  return integer(Number(value), "id", 1);
}

export function validatePlanta(value: unknown, partial: false): PlantaInput;
export function validatePlanta(value: unknown, partial: true): Partial<PlantaInput>;
export function validatePlanta(value: unknown, partial: boolean): Partial<PlantaInput> {
  const body = objectBody(value);
  allowKeys(body, campos);
  if (!partial) {
    for (const campo of campos) {
      if (body[campo] === undefined) bad(`Campo obrigatorio: ${campo}.`);
    }
  } else if (Object.keys(body).length === 0) {
    bad("Envie ao menos um campo para editar.");
  }

  const data: Partial<PlantaInput> = {};
  if (body.nome !== undefined) data.nome = text(body.nome, "nome");
  if (body.especie !== undefined) data.especie = text(body.especie, "especie");
  if (body.preco !== undefined) data.preco = integer(body.preco, "preco", 1);
  if (body.estoque !== undefined) data.estoque = integer(body.estoque, "estoque", 0);
  if (body.regaACadaDias !== undefined) data.regaACadaDias = integer(body.regaACadaDias, "regaACadaDias", 1);
  if (body.luminosidade !== undefined) data.luminosidade = luminosidade(body.luminosidade);
  if (body.petFriendly !== undefined) {
    if (typeof body.petFriendly !== "boolean") bad("petFriendly deve ser booleano: true ou false.");
    data.petFriendly = body.petFriendly as boolean;
  }
  return data;
}

export function validateQuantidade(value: unknown): number {
  const body = objectBody(value);
  allowKeys(body, ["quantidade"]);
  return integer(body.quantidade, "quantidade", 1);
}

export function validateFilters(query: Record<string, unknown>): PlantaFilters {
  allowKeys(query, ["luminosidade", "petFriendly", "nome", "ordem"]);
  const filters: PlantaFilters = {};
  if (query.luminosidade !== undefined) filters.luminosidade = luminosidade(query.luminosidade);
  if (query.petFriendly !== undefined) {
    if (query.petFriendly !== "true" && query.petFriendly !== "false") {
      bad("petFriendly no filtro deve ser true ou false.");
    }
    filters.petFriendly = query.petFriendly === "true";
  }
  if (query.nome !== undefined) filters.nome = text(query.nome, "nome");
  if (query.ordem !== undefined) {
    if (query.ordem !== "preco" && query.ordem !== "nome") bad("ordem deve ser preco ou nome.");
    filters.ordem = query.ordem as "preco" | "nome";
  }
  return filters;
}
