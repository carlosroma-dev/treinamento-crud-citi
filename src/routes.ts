import express from "express";
import * as UserController from "@controllers/UserController";
import * as PlantaController from "@controllers/PlantaController";

const routes = express.Router();

routes.get("/", (req, res) => {
  res.status(200).json({ message: "API do treinamento de CRUD do CITi 🚀" });
});

// CRUD de usuários
routes.post("/users", UserController.createUser);
routes.get("/users", UserController.readAllUsers);
routes.get("/users/:id", UserController.readUserById);
routes.patch("/users/:id", UserController.updateUser);
routes.delete("/users/:id", UserController.deleteUser);

// Rotas fixas antes de :id.
routes.post("/plantas", PlantaController.createPlanta);
routes.get("/plantas", PlantaController.listPlantas);
routes.get("/plantas/estoque/valor-total", PlantaController.getEstoqueValue);
routes.get("/plantas/esgotadas", PlantaController.listEsgotadas);
routes.post("/plantas/:id/venda", PlantaController.sellPlanta);
routes.get("/plantas/:id", PlantaController.getPlanta);
routes.patch("/plantas/:id", PlantaController.patchPlanta);
routes.delete("/plantas/:id", PlantaController.removePlanta);

export default routes;
