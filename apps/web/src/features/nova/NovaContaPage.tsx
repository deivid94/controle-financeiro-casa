import type { TipoConta } from '@casa/shared';
import { useSearchParams } from 'react-router';
import { ContaForm } from '@/features/contas/ContaForm';
import { ROTULO_TIPO } from '@/features/contas/rotulos';

/** Tipo vindo da URL (`?tipo=PARCELADA`). Qualquer coisa fora da lista é ignorada. */
function tipoDaUrl(valor: string | null): TipoConta | undefined {
  return valor !== null && valor in ROTULO_TIPO ? (valor as TipoConta) : undefined;
}

/** Formulário de conta recorrente, já com o tipo escolhido na tela "Com que frequência?". */
export function NovaContaPage() {
  const [params] = useSearchParams();
  return <ContaForm tipoInicial={tipoDaUrl(params.get('tipo'))} />;
}
