import { describe, expect, it } from 'vitest';
import {
  competenciaAtual,
  competenciaDe,
  competenciaSchema,
  mesesEntre,
  somarMeses,
  vencimentoNoMes,
} from './competencia.js';

describe('competencia', () => {
  it('usa o fuso de São Paulo na virada do mês', () => {
    expect(competenciaAtual(new Date('2026-11-01T01:30:00Z'))).toBe('2026-10');
    expect(competenciaAtual(new Date('2026-11-01T03:30:00Z'))).toBe('2026-11');
  });
  it('soma meses atravessando o ano', () => {
    expect(somarMeses('2026-11', 3)).toBe('2027-02');
    expect(somarMeses('2026-01', -1)).toBe('2025-12');
  });
  it('conta meses entre competências', () => {
    expect(mesesEntre('2026-02', '2026-10')).toBe(8);
    expect(mesesEntre('2026-10', '2026-02')).toBe(-8);
  });
  it('limita o dia ao fim do mês', () => {
    expect(vencimentoNoMes('2027-02', 31)).toBe('2027-02-28');
    expect(vencimentoNoMes('2028-02', 31)).toBe('2028-02-29');
    expect(vencimentoNoMes('2026-10', 6)).toBe('2026-10-06');
  });
  it('rejeita competência inválida', () => {
    expect(competenciaSchema.safeParse('2026-13').success).toBe(false);
  });
  it('aceita competência válida', () => {
    expect(competenciaSchema.safeParse('2026-12').success).toBe(true);
  });
  it('extrai a competência de uma data AAAA-MM-DD', () => {
    expect(competenciaDe('2026-10-06')).toBe('2026-10');
  });
});
