import { competenciaAtual } from '@casa/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppHeader } from './AppHeader';

const inicio = `/mes/${competenciaAtual()}`;

/** Mostra a URL atual, para o teste saber para onde a navegação foi. */
function Onde() {
  return <p data-testid="onde">{useLocation().pathname}</p>;
}

function montar(entradas: string[]) {
  render(
    <MemoryRouter initialEntries={entradas} initialIndex={entradas.length - 1}>
      <AppHeader />
      <Routes>
        <Route path="*" element={<Onde />} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('AppHeader', () => {
  it('Voltar volta para a tela anterior do app', async () => {
    const user = montar(['/historico', '/contas']);
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByTestId('onde')).toHaveTextContent('/historico');
  });

  it('Voltar sem tela anterior no app vai para o início (não sai do app)', async () => {
    const user = montar(['/contas']);
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByTestId('onde')).toHaveTextContent(inicio);
  });

  it('Início leva ao mês atual', async () => {
    const user = montar(['/nova/avulsa']);
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', inicio);
    await user.click(screen.getByRole('link', { name: 'Início' }));
    expect(screen.getByTestId('onde')).toHaveTextContent(inicio);
  });

  it('na tela de início, esconde os dois botões', () => {
    montar([inicio]);
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Início' })).not.toBeInTheDocument();
  });

  it('em "/" (que redireciona para o início) também esconde, sem piscar a barra', () => {
    montar(['/']);
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument();
  });

  it('em outro mês (não o atual), mostra os botões', () => {
    montar(['/mes/2020-01']);
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Início' })).toBeInTheDocument();
  });
});
