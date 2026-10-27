import { competenciaAtual } from '@casa/shared';
import type { LancamentoItem, MesView } from '@casa/shared';
import { render, screen, within } from '@testing-library/react';
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

  describe('Atrasadas', () => {
    const atrasada: LancamentoItem = {
      id: 'a1',
      contaId: 'c1',
      tipo: 'RECORRENTE_VARIAVEL',
      nome: 'Luz',
      prioridade: 'IMPORTANTE',
      competencia: '2026-09',
      vencimento: '2026-09-10',
      valorCentavos: null,
      valorEstimadoCentavos: null,
      status: 'PENDENTE',
      pagoEm: null,
      pagoPor: null,
      parcela: null,
      linkSegundaVia: null,
      codigoPagamento: null,
      observacao: null,
    };
    const mes = (semValor: number): MesView => ({
      competencia: '2026-10',
      resumo: { totalPagoCentavos: 0, totalPendenteCentavos: 0, totalMesCentavos: 0, semValor: 0 },
      atrasadas: { itens: [atrasada], totalCentavos: 0, semValor },
      aPagar: [],
      pagas: [],
      canceladas: [],
    });

    function renderizar(semValor: number) {
      useMes.mockReturnValue({ data: mes(semValor), isPending: false, error: null });
      render(
        <MemoryRouter initialEntries={['/mes/2026-10']}>
          <Routes>
            <Route path="/mes/:competencia" element={<MesPage />} />
          </Routes>
        </MemoryRouter>,
      );
      return within(screen.getByRole('region', { name: 'Atrasadas' }));
    }

    it('mostra quantas atrasadas estão sem valor', () => {
      expect(renderizar(2).getByText('2 contas sem valor')).toBeInTheDocument();
    });

    it('usa o singular para uma', () => {
      expect(renderizar(1).getByText('1 conta sem valor')).toBeInTheDocument();
    });

    it('não mostra quando todas têm valor', () => {
      expect(renderizar(0).queryByText(/sem valor/)).not.toBeInTheDocument();
    });
  });
});
