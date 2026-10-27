import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const signInEmail = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { email: signInEmail } },
}));

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    signInEmail.mockReset();
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
