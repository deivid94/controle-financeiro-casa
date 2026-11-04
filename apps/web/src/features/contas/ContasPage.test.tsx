import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ContasPage } from './ContasPage';

vi.mock('./queries', () => ({
  useContas: () => ({ data: [], isPending: false, error: null }),
}));

describe('ContasPage', () => {
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
