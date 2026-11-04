import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { BottomNav } from './BottomNav';

function montar(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe('BottomNav', () => {
  it('tem um único ponto de criação: "Nova", que leva a /nova', () => {
    montar('/historico');
    expect(screen.getByRole('link', { name: 'Nova' })).toHaveAttribute('href', '/nova');
    expect(screen.queryByRole('link', { name: 'Lançar' })).not.toBeInTheDocument();
  });

  it('"Nova" fica ativa também dentro dos formulários (/nova/...)', () => {
    montar('/nova/avulsa');
    expect(screen.getByRole('link', { name: 'Nova' })).toHaveAttribute('aria-current', 'page');
  });
});
