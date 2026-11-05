import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const signInEmail = vi.hoisted(() => vi.fn());
const refetchSessao = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: { email: signInEmail },
    useSession: () => ({ data: null, isPending: false, refetch: refetchSessao }),
  },
}));

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>Tela inicial</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    signInEmail.mockReset();
    refetchSessao.mockReset();
    refetchSessao.mockResolvedValue(undefined);
  });

  // Bug em produção: o useSession guardava "sem sessão" e o AppLayout devolvia para /login.
  it('recarrega a sessão antes de ir para a tela inicial', async () => {
    signInEmail.mockResolvedValue({ data: { user: {} }, error: null });
    let terminarRefetch!: () => void;
    refetchSessao.mockReturnValue(new Promise<void>((resolve) => (terminarRefetch = resolve)));
    const user = userEvent.setup();
    renderizar();

    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), 'segredo123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(refetchSessao).toHaveBeenCalled());
    // Enquanto a sessão não recarregou, ainda não navega.
    expect(screen.queryByText('Tela inicial')).not.toBeInTheDocument();

    terminarRefetch();
    expect(await screen.findByText('Tela inicial')).toBeInTheDocument();
  });

  it('envia e-mail e senha para authClient.signIn.email', async () => {
    signInEmail.mockResolvedValue({ data: { user: {} }, error: null });
    const user = userEvent.setup();
    renderizar();

    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), 'segredo123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(signInEmail).toHaveBeenCalledWith({
        email: 'ana@exemplo.com',
        password: 'segredo123',
      }),
    );
  });

  it('mostra erro quando as credenciais são inválidas', async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { status: 401, message: 'Invalid email or password' },
    });
    const user = userEvent.setup();
    renderizar();

    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail ou senha inválidos')).toBeInTheDocument();
  });
});
