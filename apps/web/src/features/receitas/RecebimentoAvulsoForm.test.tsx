import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hojeSaoPaulo } from '@/lib/formato';
import { RecebimentoAvulsoForm } from './RecebimentoAvulsoForm';

const criar = vi.hoisted(() => vi.fn());
vi.mock('./queries', () => ({
  useCriarRecebimento: () => ({ isPending: false, mutate: criar }),
}));

function MesStub() {
  return <p>mes {useParams().competencia}</p>;
}

function montar() {
  render(
    <MemoryRouter initialEntries={['/nova/receita-avulsa']}>
      <Routes>
        <Route path="/nova/receita-avulsa" element={<RecebimentoAvulsoForm />} />
        <Route path="/mes/:competencia" element={<MesStub />} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('RecebimentoAvulsoForm', () => {
  beforeEach(() => criar.mockReset());

  it('a data padrão é hoje em São Paulo', () => {
    montar();
    expect(screen.getByLabelText('Data')).toHaveValue(hojeSaoPaulo());
  });

  it('enviar vazio mostra os erros', async () => {
    const user = montar();
    await user.click(screen.getByRole('button', { name: 'Lançar' }));

    expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
    expect(screen.getByText('Valor inválido')).toBeInTheDocument();
    expect(criar).not.toHaveBeenCalled();
  });

  it('envio válido chama a mutação e sucesso navega para o mês da data', async () => {
    const user = montar();
    await user.type(screen.getByLabelText('Nome'), 'Venda');
    await user.type(screen.getByLabelText('Valor'), '89,90');
    await user.clear(screen.getByLabelText('Data'));
    await user.type(screen.getByLabelText('Data'), '2026-11-05');
    await user.click(screen.getByRole('button', { name: 'Lançar' }));

    await vi.waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    expect(criar.mock.calls[0]?.[0]).toEqual({
      nome: 'Venda',
      valorCentavos: 8990,
      data: '2026-11-05',
    });
    const opcoes = criar.mock.calls[0]?.[1] as { onSuccess: () => void };
    act(() => opcoes.onSuccess());
    expect(await screen.findByText('mes 2026-11')).toBeInTheDocument();
  });
});
