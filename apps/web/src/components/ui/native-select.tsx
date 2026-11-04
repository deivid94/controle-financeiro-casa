import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * `<select>` nativo com a mesma aparência do Input: no celular abre o seletor do sistema.
 *
 * A lista aberta é desenhada pelo navegador/sistema, não pelo nosso CSS. Com fundo
 * transparente, as `<option>` herdavam a cor do texto mas não o fundo, e em alguns
 * aparelhos ficava texto claro sobre fundo claro (issue #2). Por isso o select e as
 * opções têm fundo e cor de texto explícitos do tema.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        'h-12 w-full min-w-0 rounded-lg border border-input bg-background text-foreground px-2.5 [&_option]:bg-background [&_option]:text-foreground text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30',
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
