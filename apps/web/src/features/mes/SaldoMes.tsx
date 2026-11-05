import { formatBRL, type MesView } from '@casa/shared';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function SaldoMes({ saldo }: { saldo: MesView['saldo'] }) {
  return (
    <Card>
      <CardContent className="grid gap-1">
        <p className="text-muted-foreground text-sm">Saldo do mês</p>
        <p className={cn('text-3xl font-semibold', saldo.saldoCentavos < 0 && 'text-destructive')}>
          {formatBRL(saldo.saldoCentavos)}
        </p>
        <p className="text-muted-foreground text-sm">
          Entrou {formatBRL(saldo.receitasCentavos)} − pago {formatBRL(saldo.pagoCentavos)}
        </p>
      </CardContent>
    </Card>
  );
}
