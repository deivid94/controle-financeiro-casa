import type { Prioridade } from '@casa/shared';

export type ItemOrdenavel = {
  prioridade: Prioridade;
  valorCentavos: number | null;
  valorEstimadoCentavos: number | null;
  vencimento: string;
};

const RANK: Record<Prioridade, number> = { ESSENCIAL: 0, IMPORTANTE: 1, NORMAL: 2 };

/** prioridade -> valor (desc, sem valor por último no grupo) -> vencimento (asc) */
export function compararPendentes(a: ItemOrdenavel, b: ItemOrdenavel): number {
  const porPrioridade = RANK[a.prioridade] - RANK[b.prioridade];
  if (porPrioridade !== 0) return porPrioridade;

  const va = a.valorCentavos ?? a.valorEstimadoCentavos;
  const vb = b.valorCentavos ?? b.valorEstimadoCentavos;
  if (va !== vb) {
    if (va === null) return 1;
    if (vb === null) return -1;
    return vb - va;
  }

  if (a.vencimento === b.vencimento) return 0;
  return a.vencimento < b.vencimento ? -1 : 1;
}

/**
 * `primeiraGerada`: número da primeira parcela gerada no app (anteriores ao
 * cadastro não contam). `pagas`: parcelas PAGA da conta. Cancelada continua faltando.
 */
export function calcularParcela(args: {
  numero: number;
  total: number;
  primeiraGerada: number;
  pagas: number;
}): { numero: number; total: number; faltam: number } {
  const { numero, total, primeiraGerada, pagas } = args;
  return { numero, total, faltam: total - primeiraGerada + 1 - pagas };
}
