import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContaForm } from './ContaForm';

const criar = vi.hoisted(() => vi.fn());
vi.mock('./queries', () => ({
  useCriarConta: () => ({ isPending: false, mutate: criar }),
  useEditarConta: () => ({ isPending: false, mutate: vi.fn() }),
}));

function montar() {
  render(
    <MemoryRouter>
      <ContaForm />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('ContaForm', () => {
  beforeEach(() => criar.mockReset());

  it('tipo VARIÁVEL não mostra o campo Valor', () => {
    montar();
    expect(screen.queryByLabelText('Valor')).not.toBeInTheDocument();
  });

  it('tipo PARCELADA mostra total de parcelas e primeira parcela', async () => {
    const user = montar();
    await user.selectOptions(screen.getByLabelText('Tipo'), 'PARCELADA');
    expect(screen.getByLabelText('Valor')).toBeInTheDocument();
    expect(screen.getByLabelText('Total de parcelas')).toBeInTheDocument();
    expect(screen.getByLabelText('Primeira parcela')).toBeInTheDocument();
  });

  it('PARCELADA sem total mostra erro e não chama a API', async () => {
    const user = montar();
    await user.selectOptions(screen.getByLabelText('Tipo'), 'PARCELADA');
    await user.type(screen.getByLabelText('Nome'), 'IPTU');
    await user.type(screen.getByLabelText('Dia do vencimento'), '10');
    await user.type(screen.getByLabelText('Valor'), '300,00');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByText('Informe o total de parcelas (1 a 120)')).toBeInTheDocument();
    expect(criar).not.toHaveBeenCalled();
  });

  it('valor 150,00 é enviado como 15000 centavos', async () => {
    const user = montar();
    await user.selectOptions(screen.getByLabelText('Tipo'), 'RECORRENTE_FIXA');
    await user.type(screen.getByLabelText('Nome'), 'Internet');
    await user.type(screen.getByLabelText('Dia do vencimento'), '15');
    await user.type(screen.getByLabelText('Valor'), '150,00');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await vi.waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    expect(criar.mock.calls[0]?.[0]).toEqual({
      tipo: 'RECORRENTE_FIXA',
      nome: 'Internet',
      prioridade: 'NORMAL',
      diaVencimento: 15,
      valorCentavos: 15000,
    });
  });
});
