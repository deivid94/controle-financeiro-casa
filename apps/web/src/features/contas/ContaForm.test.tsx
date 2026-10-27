import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContaView } from '@casa/shared';
import { ContaForm } from './ContaForm';

const criar = vi.hoisted(() => vi.fn());
const editar = vi.hoisted(() => vi.fn());
vi.mock('./queries', () => ({
  useCriarConta: () => ({ isPending: false, mutate: criar }),
  useEditarConta: () => ({ isPending: false, mutate: editar }),
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
  beforeEach(() => {
    criar.mockReset();
    editar.mockReset();
  });

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

  describe('edição', () => {
    const base: ContaView = {
      id: 'c1',
      tipo: 'PARCELADA',
      nome: 'IPTU',
      prioridade: 'IMPORTANTE',
      diaVencimento: 25,
      valorCentavos: 28000,
      linkSegundaVia: null,
      totalParcelas: 10,
      primeiraParcela: '2026-02',
      ativa: true,
      inicioCompetencia: '2026-02',
    };

    function montarEdicao(conta: ContaView) {
      render(
        <MemoryRouter>
          <ContaForm conta={conta} />
        </MemoryRouter>,
      );
      return userEvent.setup();
    }

    it('mostra o tipo só como texto, sem select nem campos de parcelas', () => {
      montarEdicao(base);
      expect(screen.queryByLabelText('Tipo')).not.toBeInTheDocument();
      expect(screen.getByText('Parcelada')).toBeInTheDocument();
      expect(screen.queryByLabelText('Total de parcelas')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Primeira parcela')).not.toBeInTheDocument();
    });

    it('PATCH leva só os campos editáveis (sem tipo, totalParcelas, primeiraParcela)', async () => {
      const user = montarEdicao(base);
      await user.clear(screen.getByLabelText('Nome'));
      await user.type(screen.getByLabelText('Nome'), 'IPTU 2026');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await vi.waitFor(() => expect(editar).toHaveBeenCalledTimes(1));
      expect(editar.mock.calls[0]?.[0]).toStrictEqual({
        id: 'c1',
        nome: 'IPTU 2026',
        prioridade: 'IMPORTANTE',
        diaVencimento: 25,
        linkSegundaVia: null,
        valorCentavos: 28000,
      });
    });

    it('conta variável não envia valorCentavos', async () => {
      const user = montarEdicao({
        ...base,
        tipo: 'RECORRENTE_VARIAVEL',
        valorCentavos: null,
        totalParcelas: null,
        primeiraParcela: null,
      });
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await vi.waitFor(() => expect(editar).toHaveBeenCalledTimes(1));
      expect(editar.mock.calls[0]?.[0]).toStrictEqual({
        id: 'c1',
        nome: 'IPTU',
        prioridade: 'IMPORTANTE',
        diaVencimento: 25,
        linkSegundaVia: null,
      });
    });

    it('Desativar envia ativa: false', async () => {
      const user = montarEdicao(base);
      await user.click(screen.getByRole('button', { name: 'Desativar' }));
      expect(editar.mock.calls[0]?.[0]).toStrictEqual({ id: 'c1', ativa: false });
    });

    it('Reativar envia ativa: true', async () => {
      const user = montarEdicao({ ...base, ativa: false });
      await user.click(screen.getByRole('button', { name: 'Reativar' }));
      expect(editar.mock.calls[0]?.[0]).toStrictEqual({ id: 'c1', ativa: true });
    });
  });
});
