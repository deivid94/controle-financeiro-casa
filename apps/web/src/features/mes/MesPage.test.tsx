import { competenciaAtual } from '@casa/shared';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MesPage } from './MesPage';

const useMes = vi.hoisted(() => vi.fn());
vi.mock('./queries', () => ({
  useMes,
  usePagar: () => ({ isPending: false, mutate: vi.fn() }),
  useDesfazer: () => ({ isPending: false, mutate: vi.fn() }),
  useCancelar: () => ({ isPending: false, mutate: vi.fn() }),
  useEditarLancamento: () => ({ isPending: false, mutate: vi.fn() }),
}));

describe('MesPage', () => {
  beforeEach(() => {
    useMes.mockReset();
    useMes.mockReturnValue({ data: undefined, isPending: true, error: null });
  });

  it('competência malformada redireciona para o mês atual, sem consultar a API', () => {
    render(
      <MemoryRouter initialEntries={['/mes/abc']}>
        <Routes>
          <Route path="/mes/:competencia" element={<MesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(useMes).toHaveBeenCalledWith(competenciaAtual());
    expect(useMes).not.toHaveBeenCalledWith('abc');
  });
});
