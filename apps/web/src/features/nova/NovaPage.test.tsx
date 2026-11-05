import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { NovaPage } from './NovaPage';

describe('NovaPage', () => {
  function montar() {
    render(
      <MemoryRouter>
        <NovaPage />
      </MemoryRouter>,
    );
  }

  it('pergunta o que lançar e leva ao formulário certo para cada conta', () => {
    montar();

    expect(screen.getByRole('heading', { name: 'O que você quer lançar?' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Tipo de conta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Só este mês/ })).toHaveAttribute(
      'href',
      '/nova/avulsa',
    );
    expect(screen.getByRole('link', { name: /Todo mês/ })).toHaveAttribute(
      'href',
      '/nova/recorrente',
    );
    expect(screen.getByRole('link', { name: /Parcelada/ })).toHaveAttribute(
      'href',
      '/nova/recorrente?tipo=PARCELADA',
    );
  });

  it('oferece as duas receitas', () => {
    montar();

    expect(screen.getByRole('navigation', { name: 'Tipo de receita' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Receita fixa/ })).toHaveAttribute(
      'href',
      '/nova/receita',
    );
    expect(screen.getByRole('link', { name: /Receita só deste mês/ })).toHaveAttribute(
      'href',
      '/nova/receita-avulsa',
    );
  });
});
