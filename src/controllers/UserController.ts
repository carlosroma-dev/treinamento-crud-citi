import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as UserRepository from "@repositories/UserRepository";

// O controller recebe a requisição, valida os dados, chama o repository
// e decide qual status HTTP e qual corpo devolver.

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, cpf, password } = req.body;

    // 400 Bad Request: o cliente mandou dados incompletos
    if (!name || !email || !cpf || !password) {
      return res.status(400).json({
        message: "Preencha nome, e-mail, CPF e senha.",
      });
    }

    // 409 Conflict: e-mail e CPF são únicos no banco
    if (await UserRepository.findUserByEmail(email)) {
      return res.status(409).json({ message: "Esse e-mail já está em uso." });
    }

    if (await UserRepository.findUserByCpf(cpf)) {
      return res.status(409).json({ message: "Esse CPF já está cadastrado." });
    }

    // Nunca salve a senha em texto puro
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await UserRepository.createUser({
      name,
      email,
      cpf,
      password: hashedPassword,
    });

    // 201 Created: algo novo foi criado
    return res.status(201).json(user);
  } catch (error) {
    console.error(error);
    // 500 Internal Server Error: o problema foi nosso, não do cliente
    return res.status(500).json({ message: "Erro ao criar usuário." });
  }
};

export const readAllUsers = async (req: Request, res: Response) => {
  try {
    // findMany sempre devolve um array (vazio, se não tiver ninguém)
    const users = await UserRepository.findAllUsers();

    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar usuários." });
  }
};

export const readUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await UserRepository.findUserById(id);

    // 404 Not Found: o id não existe
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar usuário." });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, cpf, password } = req.body;

    // Antes de editar, garantimos que o usuário existe
    const user = await UserRepository.findUserById(id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // Se mudou o e-mail ou o CPF, ele não pode pertencer a OUTRO usuário
    if (email) {
      const userWithEmail = await UserRepository.findUserByEmail(email);
      if (userWithEmail && userWithEmail.id !== id) {
        return res.status(409).json({ message: "Esse e-mail já está em uso." });
      }
    }

    if (cpf) {
      const userWithCpf = await UserRepository.findUserByCpf(cpf);
      if (userWithCpf && userWithCpf.id !== id) {
        return res.status(409).json({ message: "Esse CPF já está cadastrado." });
      }
    }

    // PATCH = atualização parcial: campos não enviados (undefined) não são alterados
    const updatedUser = await UserRepository.updateUser(id, {
      name,
      email,
      cpf,
      password: password ? await bcrypt.hash(password, 10) : undefined,
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao atualizar usuário." });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await UserRepository.findUserById(id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    await UserRepository.deleteUser(id);

    // 204 No Content: deu certo e não há nada para devolver
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao deletar usuário." });
  }
};
