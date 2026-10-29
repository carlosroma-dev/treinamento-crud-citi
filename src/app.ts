import "dotenv/config";
import express, { ErrorRequestHandler } from "express";
import routes from "./routes";

const app = express();
app.disable("x-powered-by");
app.set("query parser", "simple");
app.use(express.json({ limit: "100kb", strict: false }));
app.use(routes);
app.use((_req, res) => {
  res.status(404).json({ message: "Rota nao encontrada." });
});

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const bodyError = error as { type?: string; status?: number };
  if (bodyError.type === "entity.parse.failed" || error instanceof URIError) {
    res.status(400).json({ message: "JSON ou parametro de URL invalido." });
    return;
  }
  if (bodyError.status === 400 || bodyError.status === 413 || bodyError.status === 415) {
    res.status(400).json({ message: "Corpo ou codificacao invalida; envie JSON de ate 100kb." });
    return;
  }
  console.error("Erro inesperado no processamento HTTP:", error);
  res.status(500).json({ message: "Erro interno do servidor." });
};
app.use(errorHandler);

export { app };
export default app;
