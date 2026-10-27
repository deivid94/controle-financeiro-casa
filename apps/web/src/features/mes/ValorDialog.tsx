import { parseValorBRL } from '@casa/shared';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type Props = {
  titulo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: (valorCentavos: number) => void;
  valorInicial?: string;
};

export function ValorDialog({ titulo, open, onOpenChange, onConfirmar, valorInicial = '' }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ValorForm
          titulo={titulo}
          valorInicial={valorInicial}
          onConfirmar={(v) => {
            onConfirmar(v);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// Formulário separado: monta (e zera o estado) cada vez que o diálogo abre.
function ValorForm({
  titulo,
  valorInicial,
  onConfirmar,
}: {
  titulo: string;
  valorInicial: string;
  onConfirmar: (valorCentavos: number) => void;
}) {
  const [texto, setTexto] = useState(valorInicial);
  const [erro, setErro] = useState(false);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const centavos = parseValorBRL(texto);
    if (centavos === null) {
      setErro(true);
      return;
    }
    onConfirmar(centavos);
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{titulo}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Input
          aria-label="Valor"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          autoFocus
          aria-invalid={erro}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setErro(false);
          }}
        />
        {erro && (
          <p role="alert" className="text-destructive text-sm">
            Valor inválido
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="submit">Confirmar</Button>
      </DialogFooter>
    </form>
  );
}
