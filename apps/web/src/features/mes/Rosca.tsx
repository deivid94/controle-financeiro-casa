import { formatBRL } from '@casa/shared';
import { Pie, PieChart } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import type { Fatia } from './fatias';

// Rosca decorativa: o texto (legenda e aria-label) é a leitura principal, então não há tooltip.
// Sem fatias, desenha um círculo cinza vazio.
export function Rosca({
  fatias,
  rotulo,
  className,
}: {
  fatias: Fatia[];
  rotulo: string;
  className?: string;
}) {
  const config: ChartConfig = {};
  for (const f of fatias) config[f.chave] = { label: f.nome, color: f.cor };

  return (
    <div role="img" aria-label={rotulo} className={cn('shrink-0', className)}>
      {fatias.length === 0 ? (
        <div className="bg-muted size-full rounded-full [mask:radial-gradient(circle_closest-side,transparent_60%,#000_61%)]" />
      ) : (
        <ChartContainer config={config} className="aspect-square size-full">
          {/* Sem camada de acessibilidade: ela deixaria o SVG focável (Tab "vazio") dentro do
              role="img"; a legenda em texto é a leitura acessível. */}
          <PieChart accessibilityLayer={false}>
            <Pie
              data={fatias.map((f) => ({ ...f, fill: f.cor }))}
              dataKey="valorCentavos"
              nameKey="nome"
              innerRadius="60%"
              outerRadius="100%"
              // Linha entre as fatias na cor do card (funciona nos dois temas). O ChartContainer
              // deixa transparente o "#fff" padrão do recharts, por isso a cor explícita.
              // Com uma fatia só não há o que separar: o traço viraria um risco na emenda.
              stroke={fatias.length > 1 ? 'var(--card)' : 'transparent'}
              strokeWidth={2}
              isAnimationActive={false}
              // O <g> do Pie entra no Tab por padrão (rootTabIndex 0) mesmo sem accessibilityLayer.
              rootTabIndex={-1}
            />
          </PieChart>
        </ChartContainer>
      )}
    </div>
  );
}

export function Legenda({ fatias }: { fatias: Fatia[] }) {
  return (
    // grid-cols-1 = minmax(0, 1fr): sem isso a coluna "auto" cresce até o nome inteiro
    // (o truncate usa nowrap) e empurra os valores para fora do card.
    <ul className="grid grid-cols-1 gap-1">
      {fatias.map((f) => (
        <li key={f.chave} className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-sm"
            style={{ backgroundColor: f.cor }}
          />
          <span className="flex-1 truncate">{f.nome}</span>
          <span>{formatBRL(f.valorCentavos)}</span>
        </li>
      ))}
    </ul>
  );
}
