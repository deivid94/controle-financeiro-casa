import { formatBRL } from '@casa/shared';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api';
import { nomeDoMes } from '@/lib/formato';
import { useHistorico } from './queries';

export function HistoricoPage() {
  const { data, isPending, error } = useHistorico();

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Histórico</h1>
      {isPending && <p className="text-muted-foreground">Carregando…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error instanceof ApiError && error.mensagem
            ? error.mensagem
            : 'Não foi possível carregar o histórico.'}
        </p>
      )}
      {data && data.length === 0 && <p className="text-muted-foreground">Nada por aqui ainda.</p>}
      {data?.map((m) => (
        <Link key={m.competencia} to={`/mes/${m.competencia}`} className="block">
          <Card className="min-h-12 flex-row flex-wrap items-center gap-2 p-4">
            <span className="font-bold">{nomeDoMes(m.competencia)}</span>
            {/* O badge padrão é pequeno (h-5, text-xs); aqui ele é o destaque, então cresce. */}
            <Badge variant="info" className="h-auto px-2.5 py-0.5 text-sm">
              pago {formatBRL(m.totalPagoCentavos)}
            </Badge>
            <span>de {formatBRL(m.totalMesCentavos)}</span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
