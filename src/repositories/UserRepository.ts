import { Prisma } from "@prisma/client";
import prisma from "@database";

// O repository é a única camada que conversa com o banco.
// O controller pede os dados por aqui, sem saber como eles são buscados.

export const createUser = async (data: Prisma.UserCreateInput) => {
  return await prisma.user.create({
    data: data,
  });
};

export const findAllUsers = async () => {
  return await prisma.user.findMany();
};

export const findUserById = async (id: number) => {
  return await prisma.user.findUnique({
    where: { id: id },
  });
};

export const updateUser = async (id: number, data: Prisma.UserUpdateInput) => {
  return await prisma.user.update({
    where: { id: id },
    data: data,
  });
};

export const deleteUser = async (id: number) => {
  return await prisma.user.delete({
    where: { id: id },
  });
};
