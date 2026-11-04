import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NativeSelect } from './native-select';

// O jsdom não desenha CSS, então não dá para medir contraste aqui. O teste
// garante que o select e as <option> tenham fundo e cor de texto explícitos do
// tema: sem isso, a lista aberta (desenhada pelo sistema) pode pintar texto
// claro sobre fundo claro (issue #2).
describe('NativeSelect', () => {
  it('define fundo e cor de texto explícitos no select e nas opções', () => {
    render(
      <NativeSelect aria-label="Prioridade" defaultValue="NORMAL">
        <option value="ESSENCIAL">Essencial</option>
        <option value="NORMAL">Normal</option>
      </NativeSelect>,
    );

    const select = screen.getByRole('combobox', { name: 'Prioridade' });
    expect(select).toHaveClass('bg-background', 'text-foreground');
    expect(select).toHaveClass('[&_option]:bg-background', '[&_option]:text-foreground');
  });

  it('mantém classes extras passadas por quem usa', () => {
    render(<NativeSelect aria-label="x" className="mt-2" />);
    expect(screen.getByRole('combobox', { name: 'x' })).toHaveClass('mt-2');
  });
});
