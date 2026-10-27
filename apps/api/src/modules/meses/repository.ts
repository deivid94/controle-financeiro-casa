import type { Competencia } from '@casa/shared';
import type { NovoLancamento } from '../../domain/geracao.js';
import { prisma } from '../../lib/prisma.js';

/** Única camada que fala com o Prisma. */
export function listarContas() {
  return prisma.conta.findMany();
}

export function listarChavesExistentes(ate: Competencia) {
  return prisma.lancamento.findMany({
    where: { contaId: { not: null }, competencia: { lte: ate } },
    select: { contaId: true, competencia: true },
  });
}

export function criarLancamentos(novos: NovoLancamento[]) {
  // skipDuplicates: a unicidade (contaId, competencia) resolve a corrida entre dois usuários.
  return prisma.lancamento.createMany({ data: novos, skipDuplicates: true });
}

export function listarDaCompetencia(competencia: Competencia) {
  return prisma.lancamento.findMany({ where: { competencia } });
}

export function listarPendentesAnteriores(competencia: Competencia) {
  return prisma.lancamento.findMany({
    where: { status: 'PENDENTE', competencia: { lt: competencia } },
  });
}

export function buscarContas(ids: string[]) {
  return prisma.conta.findMany({
    where: { id: { in: ids } },
    select: { id: true, tipo: true, linkSegundaVia: true, totalParcelas: true },
  });
}

export function buscarUsuarios(ids: string[]) {
  return prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
}

export function buscarValoresDoMesAnterior(contaIds: string[], competencias: Competencia[]) {
  return prisma.lancamento.findMany({
    where: { contaId: { in: contaIds }, competencia: { in: competencias } },
    select: { contaId: true, competencia: true, valorCentavos: true },
  });
}

export function contarPagasPorConta(contaIds: string[]) {
  return prisma.lancamento.groupBy({
    by: ['contaId'],
    where: { contaId: { in: contaIds }, status: 'PAGA' },
    _count: { _all: true },
  });
}

export function menorParcelaPorConta(contaIds: string[]) {
  return prisma.lancamento.groupBy({
    by: ['contaId'],
    where: { contaId: { in: contaIds } },
    _min: { numeroParcela: true },
  });
}

export function listarNaoCanceladasAte(competencia: Competencia) {
  return prisma.lancamento.findMany({
    where: { status: { not: 'CANCELADA' }, competencia: { lte: competencia } },
    select: { competencia: true, status: true, valorCentavos: true },
  });
}
