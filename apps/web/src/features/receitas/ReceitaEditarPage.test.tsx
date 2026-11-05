import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReceitaEditarPage } from './ReceitaEditarPage';

const mutate = vi.fn();
const receita = {
  id: 'r1',
  nome: 'Salário',
  valorCentavos: 150000,
  diaRecebimento: 5,
  inicioCompetencia: '2026-10',
  ativa: true,
};

vi.mock('./queries', () => ({
  useReceitas: () => ({ data: [receita], isPending: false }),
  useEditarReceita: () => ({ isPending: false, mutate }),
}));

function montar(caminho = '/receitas/r1') {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path="/receitas/:id" element={<ReceitaEditarPage />} />
        <Route path="/contas" element={<p>Lista de contas</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('ReceitaEditarPage', () => {
  beforeEach(() => mutate.mockReset());

  it('mostra o formulário preenchido e o aviso do valor', () => {
    montar();
    expect(screen.getByLabelText('Nome')).toHaveValue('Salário');
    expect(screen.getByLabelText('Valor')).toHaveValue('1500,00');
    expect(
      screen.getByText('O novo valor vale a partir deste mês. Meses já ajustados à mão não mudam.'),
    ).toBeInTheDocument();
  });

  it('salva com useEditarReceita', async () => {
    const user = montar();
    const valor = screen.getByLabelText('Valor');
    await user.clear(valor);
    await user.type(valor, '1.600,00');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0]![0]).toEqual({
      id: 'r1',
      dados: { nome: 'Salário', valorCentavos: 160000, diaRecebimento: 5 },
    });
  });

  it('Desativar envia ativa: false', async () => {
    const user = montar();
    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    expect(mutate.mock.calls[0]![0]).toEqual({ id: 'r1', dados: { ativa: false } });
  });

  it('id inexistente mostra aviso', () => {
    montar('/receitas/zzz');
    expect(screen.getByRole('alert')).toHaveTextContent('Receita não encontrada.');
  });
});
