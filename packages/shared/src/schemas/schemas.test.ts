import { describe, expect, it } from 'vitest';
import { criarContaSchema } from './conta.js';
import {
  criarEsporadicaSchema,
  dataSchema,
  editarLancamentoSchema,
  pagarSchema,
} from './lancamento.js';
import { editarContaSchema } from './conta.js';

const base = { nome: 'IPTU', prioridade: 'IMPORTANTE', diaVencimento: 10 } as const;

describe('criarContaSchema', () => {
  it('parcelada exige primeiraParcela e totalParcelas', () => {
    expect(
      criarContaSchema.safeParse({ tipo: 'PARCELADA', ...base, valorCentavos: 15000 }).success,
    ).toBe(false);
  });

  it('parcelada completa é aceita', () => {
    expect(
      criarContaSchema.safeParse({
        tipo: 'PARCELADA',
        ...base,
        valorCentavos: 15000,
        totalParcelas: 10,
        primeiraParcela: '2026-11',
      }).success,
    ).toBe(true);
  });

  it('variável não aceita valorCentavos', () => {
    const r = criarContaSchema.parse({
      tipo: 'RECORRENTE_VARIAVEL',
      nome: 'Luz',
      prioridade: 'ESSENCIAL',
      diaVencimento: 10,
      valorCentavos: 100,
    });
    expect('valorCentavos' in r).toBe(false);
  });

  it('fixa exige valorCentavos positivo inteiro', () => {
    const f = { tipo: 'RECORRENTE_FIXA', ...base };
    expect(criarContaSchema.safeParse(f).success).toBe(false);
    expect(criarContaSchema.safeParse({ ...f, valorCentavos: 0 }).success).toBe(false);
    expect(criarContaSchema.safeParse({ ...f, valorCentavos: 10.5 }).success).toBe(false);
    expect(criarContaSchema.safeParse({ ...f, valorCentavos: 500 }).success).toBe(true);
  });

  it('valida nome, dia e link', () => {
    const v = { tipo: 'RECORRENTE_VARIAVEL', ...base };
    expect(criarContaSchema.safeParse({ ...v, nome: '   ' }).success).toBe(false);
    expect(criarContaSchema.parse({ ...v, nome: '  Luz  ' }).nome).toBe('Luz');
    expect(criarContaSchema.safeParse({ ...v, diaVencimento: 32 }).success).toBe(false);
    expect(criarContaSchema.safeParse({ ...v, diaVencimento: 0 }).success).toBe(false);
    expect(criarContaSchema.safeParse({ ...v, linkSegundaVia: 'nao-url' }).success).toBe(false);
    expect(
      criarContaSchema.safeParse({ ...v, linkSegundaVia: 'https://exemplo.com/2via' }).success,
    ).toBe(true);
  });
});

describe('editarContaSchema', () => {
  it('é parcial, aceita link nulo e ignora tipo', () => {
    expect(editarContaSchema.parse({})).toEqual({});
    expect(editarContaSchema.parse({ linkSegundaVia: null, ativa: false })).toEqual({
      linkSegundaVia: null,
      ativa: false,
    });
    expect('tipo' in editarContaSchema.parse({ tipo: 'PARCELADA', nome: 'x' })).toBe(false);
  });
});

describe('dataSchema', () => {
  it('aceita datas reais e rejeita inexistentes', () => {
    expect(dataSchema.safeParse('2026-02-28').success).toBe(true);
    expect(dataSchema.safeParse('2026-02-30').success).toBe(false);
    expect(dataSchema.safeParse('2026-13-01').success).toBe(false);
    expect(dataSchema.safeParse('26-01-01').success).toBe(false);
  });
});

describe('lançamentos', () => {
  it('criarEsporadicaSchema', () => {
    const ok = {
      nome: 'Dentista',
      valorCentavos: 20000,
      vencimento: '2026-11-05',
      prioridade: 'NORMAL',
    };
    expect(criarEsporadicaSchema.safeParse(ok).success).toBe(true);
    expect(criarEsporadicaSchema.safeParse({ ...ok, vencimento: '2026-11-31' }).success).toBe(
      false,
    );
    expect(criarEsporadicaSchema.safeParse({ ...ok, valorCentavos: undefined }).success).toBe(
      false,
    );
  });

  it('pagarSchema aceita valor opcional', () => {
    expect(pagarSchema.safeParse({}).success).toBe(true);
    expect(pagarSchema.safeParse({ valorCentavos: 100 }).success).toBe(true);
    expect(pagarSchema.safeParse({ valorCentavos: -1 }).success).toBe(false);
  });

  it('editarLancamentoSchema aceita nulos em código e observação', () => {
    expect(
      editarLancamentoSchema.safeParse({ codigoPagamento: null, observacao: null }).success,
    ).toBe(true);
    expect(editarLancamentoSchema.safeParse({ vencimento: 'x' }).success).toBe(false);
  });
});
