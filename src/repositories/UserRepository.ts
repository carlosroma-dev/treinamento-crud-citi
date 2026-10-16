import { Prisma } from "@prisma/client";
import prisma from "@database";

// O repository é a única camada que conversa com o banco.
// O controller pede os dados por aqui, sem saber como eles são buscados.

// Campos que podem ser devolvidos na resposta: a senha NUNCA sai da API
const publicFields = {
  id: true,
  name: true,
  email: true,
  cpf: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const createUser = async (data: Prisma.UserCreateInput) => {
  return await prisma.user.create({
    data,
    select: publicFields,
  });
};

export const findAllUsers = async () => {
  return await prisma.user.findMany({
    select: publicFields,
    orderBy: { createdAt: "desc" },
  });
};

export const findUserById = async (id: string) => {
  return await prisma.user.findUnique({
    where: { id },
    select: publicFields,
  });
};

export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email },
    select: publicFields,
  });
};

export const findUserByCpf = async (cpf: string) => {
  return await prisma.user.findUnique({
    where: { cpf },
    select: publicFields,
  });
};

export const updateUser = async (id: string, data: Prisma.UserUpdateInput) => {
  return await prisma.user.update({
    where: { id },
    data,
    select: publicFields,
  });
};

export const deleteUser = async (id: string) => {
  return await prisma.user.delete({
    where: { id },
  });
};
