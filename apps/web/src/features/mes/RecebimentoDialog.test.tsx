import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RecebimentoItem } from '@casa/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecebimentoDialog } from './RecebimentoDialog';

// Simula a mutação: no sucesso chama o `onSuccess` de `mutate(vars, { onSuccess })`.
let falhar = false;
const editar = vi.fn((_vars: unknown, opts?: { onSuccess?: () => void }) => {
  if (!falhar) opts?.onSuccess?.();
});
const excluir = vi.fn((_id: unknown, opts?: { onSuccess?: () => void }) => {
  if (!falhar) opts?.onSuccess?.();
});

vi.mock('../receitas/queries', () => ({
  useEditarRecebimento: () => ({ isPending: false, mutate: editar }),
  useExcluirRecebimento: () => ({ isPending: false, mutate: excluir }),
}));

const fixa: RecebimentoItem = {
  id: 'rc1',
  receitaId: 'r1',
  nome: 'Salário',
  competencia: '2026-10',
  data: '2026-10-05',
  valorCentavos: 150000,
};
const avulsa: RecebimentoItem = { ...fixa, id: 'rc2', receitaId: null, nome: 'Bônus' };

function montar(item: RecebimentoItem) {
  const onFechar = vi.fn();
  render(<RecebimentoDialog item={item} aberto onFechar={onFechar} />);
  return { onFechar, user: userEvent.setup() };
}

describe('RecebimentoDialog', () => {
  beforeEach(() => {
    editar.mockClear();
    excluir.mockClear();
    falhar = false;
  });

  it('fixa: só o valor do mês, sem Nome nem Excluir', () => {
    montar(fixa);
    expect(screen.getByLabelText('Valor deste mês')).toHaveValue('1500,00');
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
  });

  it('fixa: salvar 0,00 envia valorCentavos 0 e fecha', async () => {
    const { user, onFechar } = montar(fixa);
    const campo = screen.getByLabelText('Valor deste mês');
    await user.clear(campo);
    await user.type(campo, '0,00');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(editar).toHaveBeenCalledWith(
      { id: 'rc1', dados: { valorCentavos: 0 } },
      expect.anything(),
    );
    expect(onFechar).toHaveBeenCalled();
  });

  it.each([
    ['0', 0],
    ['0,00', 0],
    ['R$ 0,00', 0],
    [' 0 ', 0],
    ['1.234,56', 123456],
  ])('fixa: valor %j vira %i centavos', async (texto, centavos) => {
    const { user } = montar(fixa);
    const campo = screen.getByLabelText('Valor deste mês');
    await user.clear(campo);
    await user.type(campo, texto);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(editar).toHaveBeenCalledWith(
      { id: 'rc1', dados: { valorCentavos: centavos } },
      expect.anything(),
    );
  });

  it.each([['-1'], ['s0'], ['']])('fixa: valor %j é inválido', async (texto) => {
    const { user } = montar(fixa);
    const campo = screen.getByLabelText('Valor deste mês');
    await user.clear(campo);
    if (texto) await user.type(campo, texto);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(editar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('avulsa: edita nome, valor e data', async () => {
    const { user } = montar(avulsa);
    const nome = screen.getByLabelText('Nome');
    await user.clear(nome);
    await user.type(nome, 'Bônus extra');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(editar).toHaveBeenCalledWith(
      { id: 'rc2', dados: { nome: 'Bônus extra', valorCentavos: 150000, data: '2026-10-05' } },
      expect.anything(),
    );
  });

  it('avulsa: valor zero é recusado', async () => {
    const { user } = montar(avulsa);
    const campo = screen.getByLabelText('Valor');
    await user.clear(campo);
    await user.type(campo, '0,00');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(editar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('avulsa: Excluir pede confirmação e depois chama a API com o id', async () => {
    const { user, onFechar } = montar(avulsa);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(excluir).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    expect(excluir).toHaveBeenCalledWith(
      { id: 'rc2', nome: expect.any(String) },
      expect.anything(),
    );
    expect(onFechar).toHaveBeenCalled();
  });

  it('erro ao salvar mantém o diálogo aberto', async () => {
    falhar = true;
    const { user, onFechar } = montar(fixa);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(editar).toHaveBeenCalled();
    expect(onFechar).not.toHaveBeenCalled();
  });

  it('erro ao excluir mantém o diálogo aberto', async () => {
    falhar = true;
    const { user, onFechar } = montar(avulsa);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    expect(excluir).toHaveBeenCalled();
    expect(onFechar).not.toHaveBeenCalled();
  });
});
