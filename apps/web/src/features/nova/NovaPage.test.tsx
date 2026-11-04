import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { NovaPage } from './NovaPage';

describe('NovaPage', () => {
  it('pergunta a frequência e leva ao formulário certo para cada opção', () => {
    render(
      <MemoryRouter>
        <NovaPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Com que frequência?' })).toBeInTheDocument();
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
});
