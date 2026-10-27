import type { EditarLancamentoInput } from '@casa/shared';
import { prisma } from '../../lib/prisma.js';

/** Única camada que fala com o Prisma neste módulo. */
export function buscarPorId(id: string) {
  return prisma.lancamento.findUnique({ where: { id } });
}

export function criarEsporadica(dados: {
  nome: string;
  prioridade: 'ESSENCIAL' | 'IMPORTANTE' | 'NORMAL';
  competencia: string;
  vencimento: string;
  valorCentavos: number;
  codigoPagamento?: string | undefined;
  observacao?: string | undefined;
}) {
  return prisma.lancamento.create({ data: dados });
}

/**
 * Transição condicional PENDENTE → PAGA. O `where` com status é o que resolve a corrida:
 * só uma requisição consegue `count = 1`. Devolve quantas linhas mudaram.
 */
export async function marcarComoPaga(
  id: string,
  dados: { pagoEm: Date; pagoPorId: string; valorCentavos?: number | undefined },
): Promise<number> {
  const { count } = await prisma.lancamento.updateMany({
    where: { id, status: 'PENDENTE' },
    data: {
      status: 'PAGA',
      pagoEm: dados.pagoEm,
      pagoPorId: dados.pagoPorId,
      ...(dados.valorCentavos !== undefined ? { valorCentavos: dados.valorCentavos } : {}),
    },
  });
  return count;
}

/** Transição condicional PENDENTE → CANCELADA. */
export async function marcarComoCancelada(id: string): Promise<number> {
  const { count } = await prisma.lancamento.updateMany({
    where: { id, status: 'PENDENTE' },
    data: { status: 'CANCELADA' },
  });
  return count;
}

/** PAGA/CANCELADA → PENDENTE, limpando quem pagou e quando (o valor fica). */
export function voltarParaPendente(id: string) {
  return prisma.lancamento.update({
    where: { id },
    data: { status: 'PENDENTE', pagoEm: null, pagoPorId: null },
  });
}

export function atualizar(id: string, dados: EditarLancamentoInput) {
  return prisma.lancamento.update({ where: { id }, data: dados });
}
