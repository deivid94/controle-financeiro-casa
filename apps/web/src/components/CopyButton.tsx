import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CopyButton({
  texto,
  rotulo = 'Copiar código',
}: {
  texto: string;
  rotulo?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o usuário pode copiar à mão no "Editar código".
    }
  }

  return (
    <Button type="button" variant="outline" onClick={() => void copiar()}>
      {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copiado ? 'Copiado' : rotulo}
    </Button>
  );
}
