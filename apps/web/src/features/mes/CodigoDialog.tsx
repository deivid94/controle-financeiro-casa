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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codigoInicial: string;
  onConfirmar: (codigo: string | null) => void;
};

export function CodigoDialog({ open, onOpenChange, codigoInicial, onConfirmar }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <CodigoForm
          codigoInicial={codigoInicial}
          onConfirmar={(c) => {
            onConfirmar(c);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function CodigoForm({
  codigoInicial,
  onConfirmar,
}: {
  codigoInicial: string;
  onConfirmar: (codigo: string | null) => void;
}) {
  const [texto, setTexto] = useState(codigoInicial);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    onConfirmar(texto.trim() === '' ? null : texto.trim());
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Código de pagamento</DialogTitle>
      </DialogHeader>
      <Input
        aria-label="Código de pagamento"
        autoComplete="off"
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <DialogFooter>
        <Button type="submit">Salvar</Button>
      </DialogFooter>
    </form>
  );
}
