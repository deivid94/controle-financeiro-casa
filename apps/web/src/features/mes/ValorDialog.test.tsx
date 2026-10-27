import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ValorDialog } from './ValorDialog';

describe('ValorDialog', () => {
  it('não confirma enquanto há envio pendente (botão e Enter bloqueados)', async () => {
    const onConfirmar = vi.fn();
    const user = userEvent.setup();
    render(
      <ValorDialog
        titulo="Valor"
        open
        pendente
        onOpenChange={() => {}}
        onConfirmar={onConfirmar}
        valorInicial="10,00"
      />,
    );

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    await user.type(screen.getByRole('textbox'), '{Enter}');
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
