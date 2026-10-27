import { zodResolver } from '@hookform/resolvers/zod';
import {
  criarContaSchema,
  editarContaSchema,
  parseValorBRL,
  type ContaView,
  type CriarContaInput,
  type TipoConta,
} from '@casa/shared';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { Campo } from '@/components/Campo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { ROTULO_PRIORIDADE, ROTULO_TIPO } from './rotulos';
import { useCriarConta, useEditarConta } from './queries';

type Campos = {
  tipo: TipoConta;
  nome: string;
  prioridade: 'ESSENCIAL' | 'IMPORTANTE' | 'NORMAL';
  diaVencimento: string;
  valor: string;
  totalParcelas: string;
  primeiraParcela: string;
  linkSegundaVia: string;
};

// Campo do schema da API -> campo do formulário e mensagem em pt-BR.
const ERROS: Record<string, { campo: keyof Campos; mensagem: string }> = {
  nome: { campo: 'nome', mensagem: 'Informe o nome' },
  diaVencimento: { campo: 'diaVencimento', mensagem: 'Informe um dia de 1 a 31' },
  valorCentavos: { campo: 'valor', mensagem: 'Valor inválido' },
  totalParcelas: { campo: 'totalParcelas', mensagem: 'Informe o total de parcelas (1 a 120)' },
  primeiraParcela: { campo: 'primeiraParcela', mensagem: 'Informe a primeira parcela' },
  linkSegundaVia: {
    campo: 'linkSegundaVia',
    mensagem: 'Link inválido (use http:// ou https://)',
  },
};

const textoOuUndefined = (s: string) => (s.trim() === '' ? undefined : s.trim());
const numeroOuNaN = (s: string) => (s.trim() === '' ? Number.NaN : Number(s));

/** Corpo da criação, a partir do que foi digitado (campos escondidos por tipo ficam de fora). */
function montarCriacao(v: Campos): unknown {
  const base = {
    tipo: v.tipo,
    nome: v.nome,
    prioridade: v.prioridade,
    diaVencimento: numeroOuNaN(v.diaVencimento),
    linkSegundaVia: textoOuUndefined(v.linkSegundaVia),
  };
  if (v.tipo === 'RECORRENTE_VARIAVEL') return base;
  const comValor = { ...base, valorCentavos: parseValorBRL(v.valor) ?? 0 };
  if (v.tipo === 'RECORRENTE_FIXA') return comValor;
  return {
    ...comValor,
    totalParcelas: numeroOuNaN(v.totalParcelas),
    primeiraParcela: v.primeiraParcela,
  };
}

/** Corpo da edição: tipo, total e primeira parcela não mudam. */
function montarEdicao(v: Campos): unknown {
  return {
    nome: v.nome,
    prioridade: v.prioridade,
    diaVencimento: numeroOuNaN(v.diaVencimento),
    linkSegundaVia: textoOuUndefined(v.linkSegundaVia) ?? null,
    ...(v.tipo === 'RECORRENTE_VARIAVEL' ? {} : { valorCentavos: parseValorBRL(v.valor) ?? 0 }),
  };
}

function criarFormSchema(edicao: boolean) {
  return z
    .object({
      tipo: z.enum(['RECORRENTE_VARIAVEL', 'RECORRENTE_FIXA', 'PARCELADA']),
      nome: z.string(),
      prioridade: z.enum(['ESSENCIAL', 'IMPORTANTE', 'NORMAL']),
      diaVencimento: z.string(),
      valor: z.string(),
      totalParcelas: z.string(),
      primeiraParcela: z.string(),
      linkSegundaVia: z.string(),
    })
    .superRefine((v, ctx) => {
      // A validação de verdade é a do schema compartilhado com a API; aqui só traduzimos os erros.
      const r = edicao
        ? editarContaSchema.safeParse(montarEdicao(v))
        : criarContaSchema.safeParse(montarCriacao(v));
      if (r.success) return;
      const vistos = new Set<string>();
      for (const i of r.error.issues) {
        const erro = ERROS[String(i.path[0])];
        if (!erro || vistos.has(erro.campo)) continue;
        vistos.add(erro.campo);
        ctx.addIssue({ code: 'custom', path: [erro.campo], message: erro.mensagem });
      }
    });
}

function valorInicial(conta?: ContaView): Campos {
  if (!conta) {
    return {
      tipo: 'RECORRENTE_VARIAVEL',
      nome: '',
      prioridade: 'NORMAL',
      diaVencimento: '',
      valor: '',
      totalParcelas: '',
      primeiraParcela: '',
      linkSegundaVia: '',
    };
  }
  return {
    tipo: conta.tipo,
    nome: conta.nome,
    prioridade: conta.prioridade,
    diaVencimento: String(conta.diaVencimento),
    valor:
      conta.valorCentavos === null ? '' : (conta.valorCentavos / 100).toFixed(2).replace('.', ','),
    totalParcelas: conta.totalParcelas === null ? '' : String(conta.totalParcelas),
    primeiraParcela: conta.primeiraParcela ?? '',
    linkSegundaVia: conta.linkSegundaVia ?? '',
  };
}

export function ContaForm({ conta }: { conta?: ContaView }) {
  const edicao = conta !== undefined;
  const navigate = useNavigate();
  const criar = useCriarConta();
  const editar = useEditarConta();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Campos>({
    resolver: zodResolver(criarFormSchema(edicao)),
    defaultValues: valorInicial(conta),
  });
  const tipo = useWatch({ control, name: 'tipo' });
  const pendente = criar.isPending || editar.isPending;

  const enviar = handleSubmit((v) => {
    const aoSucesso = { onSuccess: () => void navigate('/contas') };
    if (conta) {
      editar.mutate({ id: conta.id, ...(montarEdicao(v) as object) }, aoSucesso);
    } else {
      criar.mutate(montarCriacao(v) as CriarContaInput, aoSucesso);
    }
  });

  return (
    <div className="grid gap-4">
      <form onSubmit={(e) => void enviar(e)} className="grid gap-4" noValidate>
        <h1 className="text-xl font-semibold">{edicao ? 'Editar conta' : 'Nova conta'}</h1>

        {edicao ? (
          <p>
            <span className="text-muted-foreground text-sm">Tipo: </span>
            {ROTULO_TIPO[conta.tipo]}
          </p>
        ) : (
          <Campo id="tipo" rotulo="Tipo">
            <NativeSelect id="tipo" {...register('tipo')}>
              {Object.entries(ROTULO_TIPO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </NativeSelect>
          </Campo>
        )}

        <Campo id="nome" rotulo="Nome" erro={errors.nome?.message}>
          <Input id="nome" autoComplete="off" aria-invalid={!!errors.nome} {...register('nome')} />
        </Campo>
        <Campo id="prioridade" rotulo="Prioridade">
          <NativeSelect id="prioridade" {...register('prioridade')}>
            {Object.entries(ROTULO_PRIORIDADE).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </NativeSelect>
        </Campo>
        <Campo id="diaVencimento" rotulo="Dia do vencimento" erro={errors.diaVencimento?.message}>
          <Input
            id="diaVencimento"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            aria-invalid={!!errors.diaVencimento}
            {...register('diaVencimento')}
          />
        </Campo>

        {tipo !== 'RECORRENTE_VARIAVEL' && (
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
        )}

        {tipo === 'PARCELADA' && !edicao && (
          <>
            <Campo
              id="totalParcelas"
              rotulo="Total de parcelas"
              erro={errors.totalParcelas?.message}
            >
              <Input
                id="totalParcelas"
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                aria-invalid={!!errors.totalParcelas}
                {...register('totalParcelas')}
              />
            </Campo>
            <Campo
              id="primeiraParcela"
              rotulo="Primeira parcela"
              erro={errors.primeiraParcela?.message}
            >
              <Input
                id="primeiraParcela"
                type="month"
                aria-invalid={!!errors.primeiraParcela}
                {...register('primeiraParcela')}
              />
            </Campo>
          </>
        )}

        <Campo
          id="linkSegundaVia"
          rotulo="Link da 2ª via (opcional)"
          erro={errors.linkSegundaVia?.message}
        >
          <Input
            id="linkSegundaVia"
            type="url"
            inputMode="url"
            autoComplete="off"
            aria-invalid={!!errors.linkSegundaVia}
            {...register('linkSegundaVia')}
          />
        </Campo>

        <Button type="submit" disabled={pendente}>
          {edicao ? 'Salvar' : 'Cadastrar'}
        </Button>
      </form>

      {conta && (
        <Button
          type="button"
          variant="outline"
          disabled={pendente}
          onClick={() =>
            editar.mutate(
              { id: conta.id, ativa: !conta.ativa },
              { onSuccess: () => void navigate('/contas') },
            )
          }
        >
          {conta.ativa ? 'Desativar' : 'Reativar'}
        </Button>
      )}
    </div>
  );
}
