import type { LancamentoItem, MesView } from '@casa/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GraficoGastos } from './GraficoGastos';

const lanc = (
  id: string,
  nome: string,
  valorCentavos: number | null,
  status: 'PENDENTE' | 'PAGA',
) =>
  ({
    id,
    contaId: 'c1',
    tipo: 'RECORRENTE_VARIAVEL',
    nome,
    prioridade: 'NORMAL',
    competencia: '2026-10',
    vencimento: '2026-10-10',
    valorCentavos,
    valorEstimadoCentavos: null,
    status,
    pagoEm: null,
    pagoPor: null,
    parcela: null,
    linkSegundaVia: null,
    codigoPagamento: null,
    observacao: null,
  }) as LancamentoItem;

const resumo = (totalPagoCentavos: number): MesView['resumo'] => ({
  totalPagoCentavos,
  totalPendenteCentavos: 0,
  totalMesCentavos: 0,
  semValor: 0,
});

describe('GraficoGastos', () => {
  const scrollOriginal = Element.prototype.scrollIntoView;
  afterEach(() => {
    vi.restoreAllMocks();
    Element.prototype.scrollIntoView = scrollOriginal;
  });

  it('mostra as pagas, o total e a caixa Ainda a pagar', () => {
    const pagas = [lanc('p1', 'Internet', 9900, 'PAGA')];
    const aPagar = [
      lanc('a1', 'Luz', 10000, 'PENDENTE'),
      lanc('a2', 'Água', 9000, 'PENDENTE'),
      lanc('a3', 'Gás', null, 'PENDENTE'),
    ];
    render(<GraficoGastos pagas={pagas} aPagar={aPagar} resumo={resumo(9900)} />);

    expect(screen.getByText('Gastos pagos · R$ 99,00')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName('Gastos pagos: Internet R$ 99,00');
    expect(screen.getByRole('link', { name: '3 contas' })).toHaveAttribute('href', '#a-pagar');
    expect(screen.getByText('R$ 190,00')).toBeInTheDocument();
    expect(screen.getByText('+ 1 sem valor')).toBeInTheDocument();
  });

  it('tocar em N contas rola até a seção A pagar', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const alvo = document.createElement('section');
    alvo.id = 'a-pagar';
    document.body.append(alvo);

    render(
      <GraficoGastos
        pagas={[]}
        aPagar={[lanc('a1', 'Luz', 10000, 'PENDENTE')]}
        resumo={resumo(0)}
      />,
    );
    await userEvent.click(screen.getByRole('link', { name: '1 conta' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(scrollIntoView.mock.contexts[0]).toBe(alvo);
    alvo.remove();
  });

  it('sem pagas mostra Nada pago ainda; sem pendentes mostra Tudo pago', () => {
    render(<GraficoGastos pagas={[]} aPagar={[]} resumo={resumo(0)} />);
    expect(screen.getByText('Nada pago ainda')).toBeInTheDocument();
    expect(screen.getByText('Tudo pago 🎉')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('com mais de 6 pagas a legenda e o rótulo listam todas', () => {
    const pagas = Array.from({ length: 8 }, (_, i) =>
      lanc(`p${i}`, `Conta ${i + 1}`, (8 - i) * 1000, 'PAGA'),
    );
    render(<GraficoGastos pagas={pagas} aPagar={[]} resumo={resumo(36000)} />);

    for (let i = 1; i <= 8; i++) {
      expect(screen.getByText(`Conta ${i}`)).toBeInTheDocument();
      expect(screen.getByRole('img').getAttribute('aria-label')).toContain(`Conta ${i} `);
    }
    expect(screen.queryByText('Outros')).not.toBeInTheDocument();
  });
});
