import { formatBRL, type ContaView } from '@casa/shared';
import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useContas } from './queries';
import { ROTULO_PRIORIDADE, ROTULO_TIPO_CURTO } from './rotulos';

function ContaLinha({ conta }: { conta: ContaView }) {
  return (
    <Link to={`/contas/${conta.id}`} className={cn('block', !conta.ativa && 'opacity-60')}>
      <Card className="gap-1 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">{conta.nome}</span>
          <span className="text-sm">
            {conta.valorCentavos === null ? 'Valor variável' : formatBRL(conta.valorCentavos)}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          {ROTULO_TIPO_CURTO[conta.tipo]} · {ROTULO_PRIORIDADE[conta.prioridade]} · dia{' '}
          {conta.diaVencimento}
        </p>
      </Card>
    </Link>
  );
}

export function ContasPage() {
  const { data, isPending, error } = useContas();
  const ativas = data?.filter((c) => c.ativa) ?? [];
  const inativas = data?.filter((c) => !c.ativa) ?? [];

  return (
    <div className="grid gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contas</h1>
        <Link to="/contas/nova" className={buttonVariants()}>
          <Plus aria-hidden /> Nova conta
        </Link>
      </header>

      {isPending && <p className="text-muted-foreground">Carregando…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error instanceof ApiError && error.mensagem
            ? error.mensagem
            : 'Não foi possível carregar as contas.'}
        </p>
      )}
      {data && data.length === 0 && (
        <p className="text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
      )}

      {ativas.length > 0 && (
        <section className="grid gap-3" aria-label="Ativas">
          {ativas.map((c) => (
            <ContaLinha key={c.id} conta={c} />
          ))}
        </section>
      )}
      {inativas.length > 0 && (
        <section className="grid gap-3" aria-label="Inativas">
          <h2 className="text-base font-semibold">Inativas</h2>
          {inativas.map((c) => (
            <ContaLinha key={c.id} conta={c} />
          ))}
        </section>
      )}
    </div>
  );
}
