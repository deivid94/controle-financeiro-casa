import { describe, expect, it } from 'vitest';
import type { Competencia } from '@casa/shared';
import { chaveLancamento, planejarLancamentos, type ContaParaGeracao } from './geracao.js';

const base: ContaParaGeracao = {
  id: 'c1',
  nome: 'Conta',
  tipo: 'RECORRENTE_FIXA',
  prioridade: 'NORMAL',
  diaVencimento: 10,
  valorCentavos: 10000,
  totalParcelas: null,
  primeiraParcela: null,
  inicioCompetencia: '2026-10',
  ativa: true,
};
const c = (s: string) => s as Competencia;
const nenhuma = new Set<string>();

describe('planejarLancamentos', () => {
  it('fixa cadastrada em 2026-10 até 2026-11 gera 2 lançamentos com o valor', () => {
    const r = planejarLancamentos([base], nenhuma, c('2026-11'));
    expect(r).toEqual([
      {
        contaId: 'c1',
        nome: 'Conta',
        prioridade: 'NORMAL',
        competencia: '2026-10',
        vencimento: '2026-10-10',
        valorCentavos: 10000,
        numeroParcela: null,
      },
      {
        contaId: 'c1',
        nome: 'Conta',
        prioridade: 'NORMAL',
        competencia: '2026-11',
        vencimento: '2026-11-10',
        valorCentavos: 10000,
        numeroParcela: null,
      },
    ]);
  });

  it('variável gera valorCentavos null', () => {
    const r = planejarLancamentos(
      [{ ...base, tipo: 'RECORRENTE_VARIAVEL', valorCentavos: null }],
      nenhuma,
      c('2026-10'),
    );
    expect(r).toHaveLength(1);
    expect(r[0]?.valorCentavos).toBeNull();
  });

  it('parcelada em andamento: parcelas 9 e 10, nada depois do total', () => {
    const iptu: ContaParaGeracao = {
      ...base,
      tipo: 'PARCELADA',
      totalParcelas: 10,
      primeiraParcela: c('2026-02'),
    };
    const r = planejarLancamentos([iptu], nenhuma, c('2026-12'));
    expect(r.map((l) => [l.competencia, l.numeroParcela])).toEqual([
      ['2026-10', 9],
      ['2026-11', 10],
    ]);
  });

  it('parcelada com primeira parcela futura gera só dezembro, parcela 1', () => {
    const p: ContaParaGeracao = {
      ...base,
      tipo: 'PARCELADA',
      totalParcelas: 3,
      primeiraParcela: c('2026-12'),
    };
    const r = planejarLancamentos([p], nenhuma, c('2026-12'));
    expect(r.map((l) => [l.competencia, l.numeroParcela])).toEqual([['2026-12', 1]]);
  });

  it('mês não aberto: gera os meses faltantes', () => {
    const r = planejarLancamentos(
      [{ ...base, inicioCompetencia: c('2026-09') }],
      new Set([chaveLancamento('c1', c('2026-09'))]),
      c('2026-11'),
    );
    expect(r.map((l) => l.competencia)).toEqual(['2026-10', '2026-11']);
  });

  it('chave existente (qualquer status) não é regenerada', () => {
    const r = planejarLancamentos([base], new Set(['c1|2026-10']), c('2026-11'));
    expect(r.map((l) => l.competencia)).toEqual(['2026-11']);
  });

  it('conta inativa não gera nada', () => {
    expect(planejarLancamentos([{ ...base, ativa: false }], nenhuma, c('2026-12'))).toEqual([]);
  });

  it('diaVencimento 31 em fevereiro de 2027 vira 28', () => {
    const r = planejarLancamentos(
      [{ ...base, diaVencimento: 31, inicioCompetencia: c('2027-02') }],
      nenhuma,
      c('2027-02'),
    );
    expect(r[0]?.vencimento).toBe('2027-02-28');
  });
});
