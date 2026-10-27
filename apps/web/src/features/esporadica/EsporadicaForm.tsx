import { zodResolver } from '@hookform/resolvers/zod';
import {
  competenciaDe,
  criarEsporadicaSchema,
  parseValorBRL,
  type CriarEsporadicaInput,
} from '@casa/shared';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { Campo } from '@/components/Campo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { hojeSaoPaulo } from '@/lib/formato';
import { useCriarEsporadica } from './queries';

type Campos = {
  nome: string;
  valor: string;
  vencimento: string;
  prioridade: 'ESSENCIAL' | 'IMPORTANTE' | 'NORMAL';
};

/** Campos como o usuário digita (valor é texto); a conversão final é validada pelo schema da API. */
const formSchema = z
  .object({
    nome: z.string(),
    valor: z.string(),
    vencimento: z.string(),
    prioridade: z.enum(['ESSENCIAL', 'IMPORTANTE', 'NORMAL']),
  })
  .superRefine((v, ctx) => {
    if (parseValorBRL(v.valor) === null) {
      ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Valor inválido' });
    }
    const r = criarEsporadicaSchema.safeParse(montar(v));
    if (r.success) return;
    for (const i of r.error.issues) {
      const campo = i.path[0];
      if (campo === 'nome') {
        ctx.addIssue({ code: 'custom', path: ['nome'], message: 'Informe o nome' });
      } else if (campo === 'vencimento') {
        ctx.addIssue({ code: 'custom', path: ['vencimento'], message: 'Data inválida' });
      }
    }
  });

function montar(v: Campos): unknown {
  return {
    nome: v.nome,
    valorCentavos: parseValorBRL(v.valor) ?? 0,
    vencimento: v.vencimento,
    prioridade: v.prioridade,
  };
}

export function EsporadicaForm() {
  const navigate = useNavigate();
  const criar = useCriarEsporadica();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Campos>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', valor: '', vencimento: hojeSaoPaulo(), prioridade: 'NORMAL' },
  });

  const enviar = handleSubmit((v) => {
    const corpo = montar(v) as CriarEsporadicaInput;
    criar.mutate(corpo, {
      onSuccess: () => void navigate(`/mes/${competenciaDe(corpo.vencimento)}`),
    });
  });

  return (
    <form onSubmit={(e) => void enviar(e)} className="grid gap-4" noValidate>
      <h1 className="text-xl font-semibold">Lançar conta avulsa</h1>
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
      <Campo id="vencimento" rotulo="Vencimento" erro={errors.vencimento?.message}>
        <Input
          id="vencimento"
          type="date"
          aria-invalid={!!errors.vencimento}
          {...register('vencimento')}
        />
      </Campo>
      <Campo id="prioridade" rotulo="Prioridade">
        <NativeSelect id="prioridade" {...register('prioridade')}>
          <option value="ESSENCIAL">Essencial</option>
          <option value="IMPORTANTE">Importante</option>
          <option value="NORMAL">Normal</option>
        </NativeSelect>
      </Campo>
      <Button type="submit" disabled={criar.isPending}>
        Lançar
      </Button>
    </form>
  );
}
