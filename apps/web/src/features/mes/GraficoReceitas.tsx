import { formatBRL, type MesView, type RecebimentoItem } from '@casa/shared';
import { Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { agruparFatias } from './fatias';
import { Rosca } from './Rosca';

export function GraficoReceitas({
  receitas,
  onSelecionar,
}: {
  receitas: MesView['receitas'];
  onSelecionar: (r: RecebimentoItem) => void;
}) {
  const { itens, totalCentavos } = receitas;
  const fatias = agruparFatias(itens);
  const cores = new Map(fatias.map((f) => [f.chave, f.cor]));
  const resumo = itens.map((i) => `${i.nome} ${formatBRL(i.valorCentavos)}`).join(', ');

  return (
    <Card>
      <CardContent className="grid gap-3">
        <h2 className="text-base font-semibold">Receitas · {formatBRL(totalCentavos)}</h2>
        {itens.length === 0 ? (
          <div className="grid gap-1">
            <p className="text-muted-foreground">Nenhuma receita neste mês</p>
            <Link to="/nova" className="text-primary font-medium underline">
              Cadastrar receita
            </Link>
          </div>
        ) : (
          <>
            <Rosca fatias={fatias} rotulo={`Receitas: ${resumo}`} className="mx-auto size-40" />
            <ul className="grid gap-1">
              {itens.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelecionar(item)}
                    className="flex min-h-12 w-full items-center gap-2 text-left text-sm"
                  >
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: cores.get(item.id) ?? 'var(--chart-6)' }}
                    />
                    <span className="flex-1 truncate">{item.nome}</span>
                    <span>
                      {item.valorCentavos === 0
                        ? `${formatBRL(0)} · não recebido`
                        : formatBRL(item.valorCentavos)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
