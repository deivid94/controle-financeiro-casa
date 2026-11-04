import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { HistoricoPage } from './HistoricoPage';

vi.mock('./queries', () => ({
  useHistorico: () => ({
    data: [{ competencia: '2026-11', totalPagoCentavos: 5000, totalMesCentavos: 12990 }],
    isPending: false,
    error: null,
  }),
}));

function montar() {
  render(
    <MemoryRouter>
      <HistoricoPage />
    </MemoryRouter>,
  );
}

// R$ usa espaço não separável (NBSP, U+00A0) no pt-BR; a regex aceita qualquer espaço.
describe('HistoricoPage', () => {
  it('mostra o mês/ano em negrito', () => {
    montar();
    expect(screen.getByText('novembro de 2026')).toHaveClass('font-bold');
  });

  it('destaca o pago numa caixa azul (badge "info")', () => {
    montar();
    const pago = screen.getByText(/^pago R\$\s50,00$/);
    expect(pago).toHaveClass('border-info', 'text-info');
  });

  it('mantém o total do mês como texto normal e o cartão leva ao mês', () => {
    montar();
    expect(screen.getByText(/de R\$\s129,90/)).not.toHaveClass('text-info');
    expect(screen.getByRole('link')).toHaveAttribute('href', '/mes/2026-11');
  });
});
