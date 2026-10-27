import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EsporadicaForm } from './EsporadicaForm';

const criar = vi.hoisted(() => vi.fn());
vi.mock('./queries', () => ({
  useCriarEsporadica: () => ({ isPending: false, mutate: criar }),
}));

function MesStub() {
  return <p>mes {useParams().competencia}</p>;
}

function montar() {
  render(
    <MemoryRouter initialEntries={['/lancar']}>
      <Routes>
        <Route path="/lancar" element={<EsporadicaForm />} />
        <Route path="/mes/:competencia" element={<MesStub />} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('EsporadicaForm', () => {
  beforeEach(() => criar.mockReset());

  it('valor -5 mostra "Valor inválido" e não chama a API', async () => {
    const user = montar();
    await user.type(screen.getByLabelText('Nome'), 'Conserto');
    await user.type(screen.getByLabelText('Valor'), '-5');
    await user.click(screen.getByRole('button', { name: 'Lançar' }));

    expect(await screen.findByText('Valor inválido')).toBeInTheDocument();
    expect(criar).not.toHaveBeenCalled();
  });

  it('envio válido manda valorCentavos em centavos', async () => {
    const user = montar();
    await user.type(screen.getByLabelText('Nome'), 'Conserto');
    await user.type(screen.getByLabelText('Valor'), '89,90');
    await user.click(screen.getByRole('button', { name: 'Lançar' }));

    await vi.waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    expect(criar.mock.calls[0]?.[0]).toMatchObject({
      nome: 'Conserto',
      valorCentavos: 8990,
      prioridade: 'NORMAL',
      vencimento: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('sucesso navega para o mês do vencimento', async () => {
    const user = montar();
    await user.type(screen.getByLabelText('Nome'), 'Conserto');
    await user.type(screen.getByLabelText('Valor'), '10,00');
    await user.clear(screen.getByLabelText('Vencimento'));
    await user.type(screen.getByLabelText('Vencimento'), '2026-11-05');
    await user.click(screen.getByRole('button', { name: 'Lançar' }));

    await vi.waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    const opcoes = criar.mock.calls[0]?.[1] as { onSuccess: () => void };
    act(() => opcoes.onSuccess());

    expect(await screen.findByText('mes 2026-11')).toBeInTheDocument();
  });
});
