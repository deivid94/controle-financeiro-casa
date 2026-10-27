import { describe, expect, it } from 'vitest';
import { calcularParcela, compararPendentes } from './ordenacao.js';
import type { ItemOrdenavel } from './ordenacao.js';

const item = (p: Partial<ItemOrdenavel>): ItemOrdenavel => ({
  prioridade: 'NORMAL',
  valorCentavos: null,
  valorEstimadoCentavos: null,
  vencimento: '2026-11-10',
  ...p,
});

const ordenar = (itens: Record<string, ItemOrdenavel>) =>
  Object.entries(itens)
    .sort(([, a], [, b]) => compararPendentes(a, b))
    .map(([nome]) => nome);

describe('compararPendentes', () => {
  it('prioridade vence valor: luz (ESSENCIAL) antes de internet (NORMAL)', () => {
    const r = ordenar({
      internet: item({ prioridade: 'NORMAL', valorCentavos: 10000, vencimento: '2026-11-07' }),
      luz: item({ prioridade: 'ESSENCIAL', valorCentavos: 30000, vencimento: '2026-11-10' }),
    });
    expect(r).toEqual(['luz', 'internet']);
  });

  it('ordena ESSENCIAL < IMPORTANTE < NORMAL', () => {
    const r = ordenar({
      n: item({ prioridade: 'NORMAL', valorCentavos: 900 }),
      i: item({ prioridade: 'IMPORTANTE', valorCentavos: 500 }),
      e: item({ prioridade: 'ESSENCIAL', valorCentavos: 100 }),
    });
    expect(r).toEqual(['e', 'i', 'n']);
  });

  it('mesma prioridade: maior valor primeiro', () => {
    const r = ordenar({
      baixo: item({ valorCentavos: 10000 }),
      alto: item({ valorCentavos: 30000 }),
    });
    expect(r).toEqual(['alto', 'baixo']);
  });

  it('mesmo valor: vencimento mais cedo primeiro', () => {
    const r = ordenar({
      tarde: item({ valorCentavos: 10000, vencimento: '2026-11-20' }),
      cedo: item({ valorCentavos: 10000, vencimento: '2026-11-05' }),
    });
    expect(r).toEqual(['cedo', 'tarde']);
  });

  it('usa a estimativa quando não há valor', () => {
    const r = ordenar({
      baixo: item({ valorCentavos: 10000 }),
      estimado: item({ valorEstimadoCentavos: 25000 }),
      alto: item({ valorCentavos: 30000 }),
    });
    expect(r).toEqual(['alto', 'estimado', 'baixo']);
  });

  it('sem valor nem estimativa fica por último no grupo, antes do grupo seguinte', () => {
    const r = ordenar({
      normal: item({ prioridade: 'NORMAL', valorCentavos: 99999 }),
      semValor: item({ prioridade: 'IMPORTANTE' }),
      comValor: item({ prioridade: 'IMPORTANTE', valorCentavos: 100 }),
    });
    expect(r).toEqual(['comValor', 'semValor', 'normal']);
  });
});

describe('calcularParcela', () => {
  it('parcela 9 de 10, primeira gerada 9, nenhuma paga: faltam 2', () => {
    expect(calcularParcela({ numero: 9, total: 10, primeiraGerada: 9, pagas: 0 })).toEqual({
      numero: 9,
      total: 10,
      faltam: 2,
    });
  });

  it('depois de pagar a 9: faltam 1', () => {
    expect(calcularParcela({ numero: 9, total: 10, primeiraGerada: 9, pagas: 1 }).faltam).toBe(1);
  });

  it('parcelas anteriores ao cadastro não contam como faltando', () => {
    expect(calcularParcela({ numero: 1, total: 10, primeiraGerada: 1, pagas: 0 }).faltam).toBe(10);
  });
});
