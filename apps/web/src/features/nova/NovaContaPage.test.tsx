import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { NovaContaPage } from './NovaContaPage';

vi.mock('@/features/contas/queries', () => ({
  useCriarConta: () => ({ isPending: false, mutate: vi.fn() }),
  useEditarConta: () => ({ isPending: false, mutate: vi.fn() }),
}));

function montar(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <NovaContaPage />
    </MemoryRouter>,
  );
  return screen.getByRole('combobox', { name: 'Tipo' });
}

describe('NovaContaPage', () => {
  it('sem ?tipo começa como variável (o caso mais comum: luz, água)', () => {
    expect(montar('/nova/recorrente')).toHaveValue('RECORRENTE_VARIAVEL');
  });

  it('?tipo=PARCELADA já abre com o tipo parcelada escolhido', () => {
    expect(montar('/nova/recorrente?tipo=PARCELADA')).toHaveValue('PARCELADA');
  });

  it('?tipo inválido é ignorado e cai no padrão', () => {
    expect(montar('/nova/recorrente?tipo=XYZ')).toHaveValue('RECORRENTE_VARIAVEL');
  });
});
