import { zodResolver } from '@hookform/resolvers/zod';
import { criarReceitaSchema, parseValorBRL, type CriarReceitaInput } from '@casa/shared';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Campo } from '@/components/Campo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Campos = { nome: string; valor: string; dia: string };

/** Campos como o usuário digita (valor e dia são texto); a validação final é do schema da API. */
const formSchema = z
  .object({ nome: z.string(), valor: z.string(), dia: z.string() })
  .superRefine((v, ctx) => {
    if (parseValorBRL(v.valor) === null) {
      ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Valor inválido' });
    }
    const r = criarReceitaSchema.safeParse(montar(v));
    if (r.success) return;
    for (const i of r.error.issues) {
      const campo = i.path[0];
      if (campo === 'nome') {
        ctx.addIssue({ code: 'custom', path: ['nome'], message: 'Informe o nome' });
      } else if (campo === 'diaRecebimento') {
        ctx.addIssue({ code: 'custom', path: ['dia'], message: 'Dia inválido (1 a 31)' });
      }
    }
  });

function montar(v: Campos): unknown {
  return {
    nome: v.nome,
    valorCentavos: parseValorBRL(v.valor) ?? 0,
    // `Number('')` seria 0 e `Number('abc')` NaN: ambos caem no erro do schema.
    diaRecebimento: v.dia.trim() === '' ? Number.NaN : Number(v.dia),
  };
}

/** 350050 -> "3500,50": formato que `parseValorBRL` aceita de volta. */
function centavosParaTexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

type Props = {
  inicial?: CriarReceitaInput;
  onEnviar: (dados: CriarReceitaInput) => void;
  enviando: boolean;
  /** Texto de apoio logo abaixo do campo Valor (usado na edição). */
  avisoValor?: string;
};

/** Formulário de receita fixa, usado na criação e (Task 9) na edição. */
export function ReceitaForm({ inicial, onEnviar, enviando, avisoValor }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Campos>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: inicial?.nome ?? '',
      valor: inicial ? centavosParaTexto(inicial.valorCentavos) : '',
      dia: inicial ? String(inicial.diaRecebimento) : '',
    },
  });

  const enviar = handleSubmit((v) => onEnviar(montar(v) as CriarReceitaInput));

  return (
    <form onSubmit={(e) => void enviar(e)} className="grid gap-4" noValidate>
      <Campo id="nome" rotulo="Nome" erro={errors.nome?.message}>
        <Input id="nome" autoComplete="off" aria-invalid={!!errors.nome} {...register('nome')} />
      </Campo>
      <Campo id="valor" rotulo="Valor" erro={errors.valor?.message}>
        <Input
          id="valor"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          aria-invalid={!!errors.valor}
          {...register('valor')}
        />
        {avisoValor && <p className="text-muted-foreground text-sm">{avisoValor}</p>}
      </Campo>
      <Campo id="dia" rotulo="Dia do recebimento" erro={errors.dia?.message}>
        <Input
          id="dia"
          inputMode="numeric"
          autoComplete="off"
          placeholder="5"
          aria-invalid={!!errors.dia}
          {...register('dia')}
        />
      </Campo>
      <Button type="submit" disabled={enviando}>
        Salvar
      </Button>
    </form>
  );
}
