-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('ESSENCIAL', 'IMPORTANTE', 'NORMAL');

-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('RECORRENTE_VARIAVEL', 'RECORRENTE_FIXA', 'PARCELADA');

-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('PENDENTE', 'PAGA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Conta" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoConta" NOT NULL,
    "prioridade" "Prioridade" NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "valorCentavos" INTEGER,
    "totalParcelas" INTEGER,
    "primeiraParcela" TEXT,
    "inicioCompetencia" TEXT NOT NULL,
    "linkSegundaVia" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lancamento" (
    "id" TEXT NOT NULL,
    "contaId" TEXT,
    "nome" TEXT NOT NULL,
    "prioridade" "Prioridade" NOT NULL,
    "competencia" TEXT NOT NULL,
    "vencimento" TEXT NOT NULL,
    "valorCentavos" INTEGER,
    "numeroParcela" INTEGER,
    "status" "StatusLancamento" NOT NULL DEFAULT 'PENDENTE',
    "pagoEm" TIMESTAMP(3),
    "pagoPorId" TEXT,
    "codigoPagamento" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lancamento_competencia_status_idx" ON "Lancamento"("competencia", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Lancamento_contaId_competencia_key" ON "Lancamento"("contaId", "competencia");

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
