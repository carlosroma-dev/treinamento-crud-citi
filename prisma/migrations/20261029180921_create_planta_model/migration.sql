-- CreateEnum
CREATE TYPE "Luminosidade" AS ENUM ('SOMBRA', 'MEIA_SOMBRA', 'SOL_PLENO');

-- CreateTable
CREATE TABLE "Planta" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "especie" TEXT NOT NULL,
    "preco" INTEGER NOT NULL,
    "estoque" INTEGER NOT NULL,
    "luminosidade" "Luminosidade" NOT NULL,
    "petFriendly" BOOLEAN NOT NULL,
    "regaACadaDias" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Planta_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Planta_preco_positivo" CHECK ("preco" > 0),
    CONSTRAINT "Planta_estoque_nao_negativo" CHECK ("estoque" >= 0),
    CONSTRAINT "Planta_rega_positiva" CHECK ("regaACadaDias" >= 1),
    CONSTRAINT "Planta_nome_nao_vazio" CHECK (length(btrim("nome")) > 0),
    CONSTRAINT "Planta_especie_nao_vazia" CHECK (length(btrim("especie")) > 0)
);
