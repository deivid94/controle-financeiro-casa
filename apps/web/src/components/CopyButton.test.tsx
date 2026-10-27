import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyButton } from './CopyButton';

const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

describe('CopyButton', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    toast.error.mockReset();
  });

  it('copia e mostra "Copiado"', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<CopyButton texto="123" />);

    await user.click(screen.getByRole('button', { name: 'Copiar código' }));

    expect(writeText).toHaveBeenCalledWith('123');
    expect(await screen.findByText('Copiado')).toBeInTheDocument();
  });

  it('avisa quando a área de transferência não está disponível (ex.: http)', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    render(<CopyButton texto="123" />);

    await user.click(screen.getByRole('button', { name: 'Copiar código' }));

    expect(toast.error).toHaveBeenCalledWith('Não foi possível copiar');
  });
});
