import type { LancamentoItem } from '@casa/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LancamentoCard } from './LancamentoCard';

const mocks = vi.hoisted(() => ({
  pagar: vi.fn(),
  desfazer: vi.fn(),
  cancelar: vi.fn(),
  editar: vi.fn(),
}));

vi.mock('./queries', async () => {
  const { useState } = await import('react');
  return {
    // Simula isPending: vira true no primeiro mutate e não volta (a API ainda não respondeu).
    usePagar: () => {
      const [isPending, setPending] = useState(false);
      return {
        isPending,
        mutate: (vars: unknown) => {
          mocks.pagar(vars);
          setPending(true);
        },
      };
    },
    useDesfazer: () => ({ isPending: false, mutate: mocks.desfazer }),
    useCancelar: () => ({ isPending: false, mutate: mocks.cancelar }),
    useEditarLancamento: () => ({ isPending: false, mutate: mocks.editar }),
  };
});

function item(parcial: Partial<LancamentoItem> = {}): LancamentoItem {
  return {
    id: 'l1',
    contaId: 'c1',
    tipo: 'RECORRENTE_FIXA',
    nome: 'Aluguel',
    prioridade: 'ESSENCIAL',
    competencia: '2026-10',
    vencimento: '2026-10-05',
    valorCentavos: 150000,
    valorEstimadoCentavos: null,
    status: 'PENDENTE',
    pagoEm: null,
    pagoPor: null,
    parcela: null,
    linkSegundaVia: null,
    codigoPagamento: null,
    observacao: null,
    ...parcial,
  };
}

describe('LancamentoCard', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
  });

  it('paga com um toque quando já há valor, sem abrir diálogo', async () => {
    const user = userEvent.setup();
    render(<LancamentoCard item={item()} />);

    await user.click(screen.getByRole('button', { name: 'Pagar' }));

    expect(mocks.pagar).toHaveBeenCalledTimes(1);
    expect(mocks.pagar).toHaveBeenCalledWith({ id: 'l1', nome: 'Aluguel' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('variável sem valor', () => {
    const semValor = () =>
      item({ id: 'l2', tipo: 'RECORRENTE_VARIAVEL', nome: 'Luz', valorCentavos: null });

    it('abre o diálogo e paga com o valor digitado', async () => {
      const user = userEvent.setup();
      render(<LancamentoCard item={semValor()} />);

      await user.click(screen.getByRole('button', { name: 'Pagar' }));
      expect(mocks.pagar).not.toHaveBeenCalled();
      await user.type(await screen.findByRole('textbox'), '189,90');
      await user.click(screen.getByRole('button', { name: 'Confirmar' }));

      expect(mocks.pagar).toHaveBeenCalledWith({ id: 'l2', nome: 'Luz', valorCentavos: 18990 });
    });

    it('Enter confirma o valor', async () => {
      const user = userEvent.setup();
      render(<LancamentoCard item={semValor()} />);

      await user.click(screen.getByRole('button', { name: 'Pagar' }));
      await user.type(await screen.findByRole('textbox'), '50{Enter}');

      expect(mocks.pagar).toHaveBeenCalledWith({ id: 'l2', nome: 'Luz', valorCentavos: 5000 });
    });

    it('mostra "Valor inválido" e não chama a API com texto inválido', async () => {
      const user = userEvent.setup();
      render(<LancamentoCard item={semValor()} />);

      await user.click(screen.getByRole('button', { name: 'Pagar' }));
      await user.type(await screen.findByRole('textbox'), 'abc');
      await user.click(screen.getByRole('button', { name: 'Confirmar' }));

      expect(screen.getByText('Valor inválido')).toBeInTheDocument();
      expect(mocks.pagar).not.toHaveBeenCalled();
    });
  });

  it('mostra a estimativa do mês passado em itálico', () => {
    render(
      <LancamentoCard
        item={item({
          tipo: 'RECORRENTE_VARIAVEL',
          valorCentavos: null,
          valorEstimadoCentavos: 21000,
        })}
      />,
    );
    expect(screen.getByText('~R$ 210,00 (mês passado)')).toHaveClass('italic');
  });

  it('avisa quando não há valor nem estimativa', () => {
    render(<LancamentoCard item={item({ tipo: 'RECORRENTE_VARIAVEL', valorCentavos: null })} />);
    expect(screen.getByText('valor a informar')).toBeInTheDocument();
  });

  it('mostra a posição da parcela', () => {
    render(
      <LancamentoCard
        item={item({ tipo: 'PARCELADA', parcela: { numero: 9, total: 10, faltam: 2 } })}
      />,
    );
    expect(screen.getByText('Parcela 9 de 10 · faltam 2')).toBeInTheDocument();
  });

  it('mostra vencimento dd/mm, 2ª via e botão de copiar código', () => {
    render(
      <LancamentoCard
        item={item({ linkSegundaVia: 'https://exemplo.com/boleto', codigoPagamento: '123.456' })}
      />,
    );
    expect(screen.getByText('Vence 05/10')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: '2ª via' });
    expect(link).toHaveAttribute('href', 'https://exemplo.com/boleto');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
    expect(screen.getByRole('button', { name: 'Copiar código' })).toBeInTheDocument();
  });

  it('clique duplo rápido em Pagar chama pagar uma única vez', async () => {
    const user = userEvent.setup();
    render(<LancamentoCard item={item()} />);

    await user.dblClick(screen.getByRole('button', { name: 'Pagar' }));

    expect(mocks.pagar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Pagar' })).toBeDisabled();
  });

  it('cancelar pede confirmação antes de chamar a API', async () => {
    const user = userEvent.setup();
    render(<LancamentoCard item={item()} />);

    await user.click(screen.getByRole('button', { name: 'Mais ações' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Cancelar tira esta conta dos totais. Continuar?')).toBeInTheDocument();
    expect(mocks.cancelar).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(mocks.cancelar).toHaveBeenCalledWith({ id: 'l1', nome: 'Aluguel' });
  });

  it('em conta paga mostra quem pagou e permite desfazer', async () => {
    const user = userEvent.setup();
    render(
      <LancamentoCard
        item={item({
          status: 'PAGA',
          pagoEm: '2026-10-06T15:00:00.000Z',
          pagoPor: { id: 'u1', nome: 'Ana' },
        })}
      />,
    );
    expect(screen.getByText('Pago em 06/10 por Ana')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pagar' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mais ações' }));
    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(mocks.desfazer).toHaveBeenCalledWith({ id: 'l1', nome: 'Aluguel' });
  });

  it('sugere a estimativa no diálogo ao pagar variável sem valor', async () => {
    const user = userEvent.setup();
    render(
      <LancamentoCard
        item={item({
          id: 'l3',
          tipo: 'RECORRENTE_VARIAVEL',
          nome: 'Luz',
          valorCentavos: null,
          valorEstimadoCentavos: 21000,
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Pagar' }));
    expect(await screen.findByRole('textbox')).toHaveValue('210,00');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(mocks.pagar).toHaveBeenCalledWith({ id: 'l3', nome: 'Luz', valorCentavos: 21000 });
  });

  it('preenche o valor atual ao editar valor', async () => {
    const user = userEvent.setup();
    render(<LancamentoCard item={item()} />);

    await user.click(screen.getByRole('button', { name: 'Mais ações' }));
    await user.click(screen.getByRole('button', { name: 'Editar valor' }));

    expect(await screen.findByRole('textbox')).toHaveValue('1.500,00');
  });
});
