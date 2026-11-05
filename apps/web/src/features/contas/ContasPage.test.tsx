import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ContasPage } from './ContasPage';

vi.mock('./queries', () => ({
  useContas: () => ({ data: [], isPending: false, error: null }),
}));

vi.mock('../receitas/queries', () => ({
  useReceitas: () => ({
    data: [
      {
        id: 'r1',
        nome: 'Salário',
        valorCentavos: 150000,
        diaRecebimento: 5,
        inicioCompetencia: '2026-10',
        ativa: true,
      },
      {
        id: 'r2',
        nome: 'Aluguel recebido',
        valorCentavos: 80000,
        diaRecebimento: 10,
        inicioCompetencia: '2026-10',
        ativa: false,
      },
    ],
    isPending: false,
    error: null,
  }),
}));

describe('ContasPage', () => {
  it('lista as receitas fixas com link para a edição', () => {
    render(
      <MemoryRouter>
        <ContasPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Receitas fixas' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Salário/ });
    expect(link).toHaveAttribute('href', '/receitas/r1');
    expect(link).toHaveTextContent('R$ 1.500,00 · dia 5');
    expect(screen.getByRole('link', { name: /Aluguel recebido/ })).toHaveClass('opacity-60');
    expect(screen.getByText('Contas e receitas que se repetem todo mês.')).toBeInTheDocument();
  });

  it('só lista e edita: criar fica no botão "Nova" da barra', () => {
    render(
      <MemoryRouter>
        <ContasPage />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /Nova conta/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Toque em Nova/)).toBeInTheDocument();
  });
});
