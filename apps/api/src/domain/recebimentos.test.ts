import { describe, expect, it } from 'vitest';
import { chaveLancamento } from './geracao.js';
import { calcularSaldo, planejarRecebimentos } from './recebimentos.js';
import type { ReceitaParaGeracao } from './recebimentos.js';

const salario: ReceitaParaGeracao = {
  id: 'r1',
  nome: 'Salário',
  diaRecebimento: 5,
  valorCentavos: 450000,
  inicioCompetencia: '2026-10',
  ativa: true,
};

describe('planejarRecebimentos', () => {
  it('gera um recebimento por mês até a competência alvo', () => {
    const novos = planejarRecebimentos([salario], new Set(), '2026-11');
    expect(novos).toEqual([
      {
        receitaId: 'r1',
        nome: 'Salário',
        competencia: '2026-10',
        data: '2026-10-05',
        valorCentavos: 450000,
      },
      {
        receitaId: 'r1',
        nome: 'Salário',
        competencia: '2026-11',
        data: '2026-11-05',
        valorCentavos: 450000,
      },
    ]);
  });

  it('ignora receita inativa', () => {
    expect(planejarRecebimentos([{ ...salario, ativa: false }], new Set(), '2026-11')).toEqual([]);
  });

  it('pula competências já existentes', () => {
    const existentes = new Set([chaveLancamento('r1', '2026-10')]);
    const novos = planejarRecebimentos([salario], existentes, '2026-11');
    expect(novos.map((n) => n.competencia)).toEqual(['2026-11']);
  });

  it('ajusta o dia 31 para o último dia do mês', () => {
    const novos = planejarRecebimentos(
      [{ ...salario, diaRecebimento: 31, inicioCompetencia: '2027-02' }],
      new Set(),
      '2027-02',
    );
    expect(novos[0]?.data).toBe('2027-02-28');
  });
});

describe('calcularSaldo', () => {
  it('calcula saldo e depois de tudo', () => {
    expect(
      calcularSaldo(450000, { totalPagoCentavos: 37000, totalPendenteCentavos: 19000 }),
    ).toEqual({
      receitasCentavos: 450000,
      pagoCentavos: 37000,
      saldoCentavos: 413000,
      depoisDeTudoCentavos: 394000,
    });
  });

  it('permite saldo negativo', () => {
    const s = calcularSaldo(0, { totalPagoCentavos: 5000, totalPendenteCentavos: 0 });
    expect(s.saldoCentavos).toBe(-5000);
  });
});
