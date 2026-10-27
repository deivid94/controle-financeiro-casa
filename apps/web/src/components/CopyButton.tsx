import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function CopyButton({
  texto,
  rotulo = 'Copiar código',
}: {
  texto: string;
  rotulo?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  async function copiar() {
    try {
      // Em http (ex.: celular na rede local) navigator.clipboard não existe: cai no catch.
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  }

  return (
    <Button type="button" variant="outline" onClick={() => void copiar()}>
      {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copiado ? 'Copiado' : rotulo}
    </Button>
  );
}
