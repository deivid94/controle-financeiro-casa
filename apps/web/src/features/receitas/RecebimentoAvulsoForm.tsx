import { zodResolver } from '@hookform/resolvers/zod';
import {
  competenciaDe,
  criarRecebimentoAvulsoSchema,
  parseValorBRL,
  type CriarRecebimentoAvulsoInput,
} from '@casa/shared';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { Campo } from '@/components/Campo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { hojeSaoPaulo } from '@/lib/formato';
import { useCriarRecebimento } from './queries';

type Campos = { nome: string; valor: string; data: string };

const formSchema = z
  .object({ nome: z.string(), valor: z.string(), data: z.string() })
  .superRefine((v, ctx) => {
    if (parseValorBRL(v.valor) === null) {
      ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Valor inválido' });
    }
    const r = criarRecebimentoAvulsoSchema.safeParse(montar(v));
    if (r.success) return;
    for (const i of r.error.issues) {
      const campo = i.path[0];
      if (campo === 'nome') {
        ctx.addIssue({ code: 'custom', path: ['nome'], message: 'Informe o nome' });
      } else if (campo === 'data') {
        ctx.addIssue({ code: 'custom', path: ['data'], message: 'Data inválida' });
      }
    }
  });

function montar(v: Campos): unknown {
  return { nome: v.nome, valorCentavos: parseValorBRL(v.valor) ?? 0, data: v.data };
}

export function RecebimentoAvulsoForm() {
  const navigate = useNavigate();
  const criar = useCriarRecebimento();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Campos>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', valor: '', data: hojeSaoPaulo() },
  });

  const enviar = handleSubmit((v) => {
    const corpo = montar(v) as CriarRecebimentoAvulsoInput;
    criar.mutate(corpo, {
      onSuccess: () => void navigate(`/mes/${competenciaDe(corpo.data)}`),
    });
  });

  return (
    <form onSubmit={(e) => void enviar(e)} className="grid gap-4" noValidate>
      <h1 className="text-xl font-semibold">Receita só deste mês</h1>
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
      </Campo>
      <Campo id="data" rotulo="Data" erro={errors.data?.message}>
        <Input id="data" type="date" aria-invalid={!!errors.data} {...register('data')} />
      </Campo>
      <Button type="submit" disabled={criar.isPending}>
        Lançar
      </Button>
    </form>
  );
}
