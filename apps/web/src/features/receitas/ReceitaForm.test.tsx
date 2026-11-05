import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReceitaForm } from './ReceitaForm';

function montar(props: Partial<Parameters<typeof ReceitaForm>[0]> = {}) {
  const onEnviar = vi.fn();
  render(<ReceitaForm onEnviar={onEnviar} enviando={false} {...props} />);
  return { onEnviar, user: userEvent.setup() };
}

describe('ReceitaForm', () => {
  it('enviar vazio mostra os erros e não chama onEnviar', async () => {
    const { onEnviar, user } = montar();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
    expect(screen.getByText('Valor inválido')).toBeInTheDocument();
    expect(onEnviar).not.toHaveBeenCalled();
  });

  it('envio válido manda valor em centavos e o dia como número', async () => {
    const { onEnviar, user } = montar();
    await user.type(screen.getByLabelText('Nome'), 'Aluguel');
    await user.type(screen.getByLabelText('Valor'), '1.500,00');
    await user.type(screen.getByLabelText('Dia do recebimento'), '5');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await vi.waitFor(() => expect(onEnviar).toHaveBeenCalledTimes(1));
    expect(onEnviar).toHaveBeenCalledWith({
      nome: 'Aluguel',
      valorCentavos: 150000,
      diaRecebimento: 5,
    });
  });

  it('dia 32 mostra erro', async () => {
    const { onEnviar, user } = montar();
    await user.type(screen.getByLabelText('Nome'), 'Aluguel');
    await user.type(screen.getByLabelText('Valor'), '10,00');
    await user.type(screen.getByLabelText('Dia do recebimento'), '32');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Dia inválido (1 a 31)')).toBeInTheDocument();
    expect(onEnviar).not.toHaveBeenCalled();
  });

  it('preenche os campos com os valores iniciais (edição)', () => {
    montar({ inicial: { nome: 'Salário', valorCentavos: 350050, diaRecebimento: 10 } });

    expect(screen.getByLabelText('Nome')).toHaveValue('Salário');
    expect(screen.getByLabelText('Valor')).toHaveValue('3500,50');
    expect(screen.getByLabelText('Dia do recebimento')).toHaveValue('10');
  });
});
