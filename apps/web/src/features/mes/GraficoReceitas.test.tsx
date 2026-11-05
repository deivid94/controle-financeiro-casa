import type { RecebimentoItem } from '@casa/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { GraficoReceitas } from './GraficoReceitas';

const item = (id: string, nome: string, valorCentavos: number): RecebimentoItem => ({
  id,
  receitaId: null,
  nome,
  competencia: '2026-10',
  data: '2026-10-05',
  valorCentavos,
});

function renderizar(itens: RecebimentoItem[], onSelecionar = vi.fn()) {
  const totalCentavos = itens.reduce((s, i) => s + i.valorCentavos, 0);
  render(
    <MemoryRouter>
      <GraficoReceitas receitas={{ itens, totalCentavos }} onSelecionar={onSelecionar} />
    </MemoryRouter>,
  );
  return onSelecionar;
}

describe('GraficoReceitas', () => {
  it('lista as receitas e chama onSelecionar ao tocar na linha', async () => {
    const aluguel = item('r1', 'Aluguel da inquilina', 150000);
    const onSelecionar = renderizar([aluguel, item('r2', 'Salário', 300000)]);

    expect(screen.getByText('Receitas · R$ 4.500,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Receitas: Aluguel da inquilina R$ 1.500,00, Salário R$ 3.000,00',
    );

    await userEvent.click(screen.getByRole('button', { name: /Aluguel da inquilina/ }));
    expect(onSelecionar).toHaveBeenCalledWith(aluguel);
  });

  it('valor zero aparece como não recebido', () => {
    renderizar([item('r1', 'Aluguel', 0)]);
    expect(screen.getByText('R$ 0,00 · não recebido')).toBeInTheDocument();
  });

  it('sem receitas mostra o estado vazio com link para cadastrar', () => {
    renderizar([]);
    expect(screen.getByText('Nenhuma receita neste mês')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar receita' })).toHaveAttribute(
      'href',
      '/nova',
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
