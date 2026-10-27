import { formatBRL, type MesView } from '@casa/shared';
import { rotuloSemValor } from '@/lib/formato';
import { Card, CardContent } from '@/components/ui/card';

export function ResumoMes({ resumo }: { resumo: MesView['resumo'] }) {
  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted-foreground text-sm">A pagar</p>
            <p className="text-xl font-semibold">{formatBRL(resumo.totalPendenteCentavos)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Pago</p>
            <p className="text-xl font-semibold">{formatBRL(resumo.totalPagoCentavos)}</p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Total do mês: {formatBRL(resumo.totalMesCentavos)}
        </p>
        {resumo.semValor > 0 && <p className="text-sm">{rotuloSemValor(resumo.semValor)}</p>}
      </CardContent>
    </Card>
  );
}
