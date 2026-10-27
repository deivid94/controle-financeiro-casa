import { describe, expect, it } from 'vitest';
import { formatBRL, parseValorBRL } from './money.js';

describe('parseValorBRL', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,5', 123450],
    ['R$ 89,90', 8990],
    ['89', 8900],
    [' 0,99 ', 99],
    ['1234.56', 123456],
    ['1.234', 123400],
  ])('parseValorBRL(%s) = %i', (t, c) => expect(parseValorBRL(t)).toBe(c));

  it.each(['', 'abc', '0', '0,00', '-5', '1,2,3', '12,345', '1.2345', '12.345,678'])(
    'rejeita %s',
    (t) => expect(parseValorBRL(t)).toBeNull(),
  );

  it('respeita o limite do Int do Postgres (2.147.483.647 centavos)', () => {
    expect(parseValorBRL('21.474.836,47')).toBe(2_147_483_647);
    expect(parseValorBRL('21.474.836,48')).toBeNull();
  });
});

describe('formatBRL', () => {
  it('formata em pt-BR', () => expect(formatBRL(123456)).toBe('R$ 1.234,56'));
  it('formata centavos pequenos', () => expect(formatBRL(99)).toBe('R$ 0,99'));
});
