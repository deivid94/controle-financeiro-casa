import { formatBRL, type LancamentoItem, type MesView } from '@casa/shared';
import type { MouseEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { agruparFatias } from './fatias';
import { Legenda, Rosca } from './Rosca';

function irParaAPagar(e: MouseEvent) {
  e.preventDefault();
  document.getElementById('a-pagar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function GraficoGastos({
  pagas,
  aPagar,
  resumo,
}: {
  pagas: LancamentoItem[];
  aPagar: LancamentoItem[];
  resumo: MesView['resumo'];
}) {
  const fatias = agruparFatias(
    pagas.map((p) => ({ id: p.id, nome: p.nome, valorCentavos: p.valorCentavos })),
  );
  // Só a competência exibida: `aPagar` já vem sem as atrasadas de meses anteriores.
  const pendentes = aPagar.filter((i) => i.status === 'PENDENTE');
  const totalPendente = pendentes.reduce((soma, i) => soma + (i.valorCentavos ?? 0), 0);
  const semValor = pendentes.filter((i) => i.valorCentavos === null).length;
  const n = pendentes.length;

  const rotulo =
    fatias.length === 0
      ? 'Gastos pagos: nada pago ainda'
      : `Gastos pagos: ${fatias.map((f) => `${f.nome} ${formatBRL(f.valorCentavos)}`).join(', ')}`;

  return (
    <Card>
      <CardContent className="grid gap-3">
        <h2 className="text-base font-semibold">
          Gastos pagos · {formatBRL(resumo.totalPagoCentavos)}
        </h2>
        <div className="flex items-center gap-4">
          <Rosca fatias={fatias} rotulo={rotulo} className="size-28" />
          <div className="bg-muted/50 grid flex-1 gap-0.5 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground">Ainda a pagar</p>
            {n === 0 ? (
              <p className="font-semibold">Tudo pago 🎉</p>
            ) : (
              <>
                <a
                  href="#a-pagar"
                  onClick={irParaAPagar}
                  className="text-primary font-semibold underline"
                >
                  {n === 1 ? '1 conta' : `${n} contas`}
                </a>
                <p className="font-semibold">{formatBRL(totalPendente)}</p>
                {semValor > 0 && <p className="text-muted-foreground">+ {semValor} sem valor</p>}
              </>
            )}
          </div>
        </div>
        {fatias.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nada pago ainda</p>
        ) : (
          <Legenda fatias={fatias} />
        )}
      </CardContent>
    </Card>
  );
}
