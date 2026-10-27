import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EsporadicaForm } from './EsporadicaForm';

const criar = vi.hoisted(() => vi.fn());
vi.mock('./queries', () => ({
  useCriarEsporadica: () => ({ isPending: false, mutate: criar }),
}));

function montar() {
  render(
    <MemoryRouter>
      <EsporadicaForm />
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
});
