import { describe, expect, it } from 'vitest';
import { agruparFatias } from './fatias';

const item = (id: string, valorCentavos: number | null) => ({
  id,
  nome: `Item ${id}`,
  valorCentavos,
});

describe('agruparFatias', () => {
  it('remove valor zero e ordena por valor desc', () => {
    const fatias = agruparFatias([item('a', 120), item('b', 250), item('c', 0)]);
    expect(fatias).toEqual([
      { chave: 'b', nome: 'Item b', valorCentavos: 250, cor: 'var(--chart-1)' },
      { chave: 'a', nome: 'Item a', valorCentavos: 120, cor: 'var(--chart-2)' },
    ]);
  });

  it('desempata pelo nome', () => {
    const fatias = agruparFatias([item('z', 100), item('a', 100)]);
    expect(fatias.map((f) => f.chave)).toEqual(['a', 'z']);
  });

  it('com 6 itens devolve 6 fatias, sem Outros', () => {
    const fatias = agruparFatias([1, 2, 3, 4, 5, 6].map((n) => item(`i${n}`, n * 100)));
    expect(fatias).toHaveLength(6);
    expect(fatias.some((f) => f.chave === 'outros')).toBe(false);
    expect(fatias[5]?.cor).toBe('var(--chart-6)');
  });

  it('com 8 itens mantém os 5 maiores e soma o resto em Outros', () => {
    const fatias = agruparFatias([1, 2, 3, 4, 5, 6, 7, 8].map((n) => item(`i${n}`, n * 100)));
    expect(fatias).toHaveLength(6);
    expect(fatias.slice(0, 5).map((f) => f.valorCentavos)).toEqual([800, 700, 600, 500, 400]);
    expect(fatias[5]).toEqual({
      chave: 'outros',
      nome: 'Outros',
      valorCentavos: 300 + 200 + 100,
      cor: 'var(--chart-6)',
    });
  });

  it('com exatamente 7 itens dá 6 fatias: os 5 maiores e Outros com a soma dos 2 menores', () => {
    const fatias = agruparFatias([1, 2, 3, 4, 5, 6, 7].map((n) => item(`i${n}`, n * 100)));
    expect(fatias).toHaveLength(6);
    expect(fatias.slice(0, 5).map((f) => f.valorCentavos)).toEqual([700, 600, 500, 400, 300]);
    expect(fatias[5]).toEqual({
      chave: 'outros',
      nome: 'Outros',
      valorCentavos: 200 + 100,
      cor: 'var(--chart-6)',
    });
  });

  it('ignora valor nulo', () => {
    const fatias = agruparFatias([item('a', null), item('b', 50)]);
    expect(fatias).toHaveLength(1);
    expect(fatias[0]?.chave).toBe('b');
  });
});
