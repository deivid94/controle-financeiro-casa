-- CreateTable
CREATE TABLE "Receita" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "diaRecebimento" INTEGER NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "inicioCompetencia" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recebimento" (
    "id" TEXT NOT NULL,
    "receitaId" TEXT,
    "nome" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recebimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recebimento_competencia_idx" ON "Recebimento"("competencia");

-- CreateIndex
CREATE UNIQUE INDEX "Recebimento_receitaId_competencia_key" ON "Recebimento"("receitaId", "competencia");

-- AddForeignKey
ALTER TABLE "Recebimento" ADD CONSTRAINT "Recebimento_receitaId_fkey" FOREIGN KEY ("receitaId") REFERENCES "Receita"("id") ON DELETE SET NULL ON UPDATE CASCADE;
