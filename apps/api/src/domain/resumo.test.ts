import { describe, expect, it } from 'vitest';
import { resumirMes } from './resumo.js';

describe('resumirMes', () => {
  it('soma pagos e pendentes, conta pendentes sem valor e ignora canceladas', () => {
    expect(
      resumirMes([
        { status: 'PAGA', valorCentavos: 10000 },
        { status: 'PENDENTE', valorCentavos: 5000 },
        { status: 'PENDENTE', valorCentavos: null },
        { status: 'CANCELADA', valorCentavos: 9999 },
      ]),
    ).toEqual({
      totalPagoCentavos: 10000,
      totalPendenteCentavos: 5000,
      totalMesCentavos: 15000,
      semValor: 1,
    });
  });

  it('mês vazio zera tudo', () => {
    expect(resumirMes([])).toEqual({
      totalPagoCentavos: 0,
      totalPendenteCentavos: 0,
      totalMesCentavos: 0,
      semValor: 0,
    });
  });
});
