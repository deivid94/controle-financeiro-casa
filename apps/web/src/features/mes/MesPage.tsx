import {
  competenciaAtual,
  competenciaSchema,
  formatBRL,
  somarMeses,
  type LancamentoItem,
} from '@casa/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { nomeDoMes, rotuloSemValor } from '@/lib/formato';
import { cn } from '@/lib/utils';
import { LancamentoCard } from './LancamentoCard';
import { useMes } from './queries';
import { GraficoGastos } from './GraficoGastos';
import { GraficoReceitas } from './GraficoReceitas';
import { ResumoMes } from './ResumoMes';
import { SaldoMes } from './SaldoMes';

function Secao({
  id,
  titulo,
  total,
  semValor = 0,
  itens,
  vazio,
}: {
  id?: string;
  titulo: string;
  total?: number;
  semValor?: number;
  itens: LancamentoItem[];
  vazio?: string;
}) {
  return (
    <section id={id} className="grid scroll-mt-4 gap-3" aria-label={titulo}>
      <h2 className="flex items-baseline justify-between text-base font-semibold">
        <span>{titulo}</span>
        {total !== undefined && (
          <span className="flex items-baseline gap-2 text-sm font-normal">
            {semValor > 0 && <span>{rotuloSemValor(semValor)}</span>}
            <span>{formatBRL(total)}</span>
          </span>
        )}
      </h2>
      {itens.length === 0 && vazio && <p className="text-muted-foreground py-2">{vazio}</p>}
      {itens.map((item) => (
        <LancamentoCard key={item.id} item={item} />
      ))}
    </section>
  );
}

export function MesPage() {
  const { competencia } = useParams();
  // Competência malformada na URL (ex.: /mes/abc): volta para o mês atual em vez de quebrar.
  if (!competenciaSchema.safeParse(competencia).success) {
    return <Navigate to={`/mes/${competenciaAtual()}`} replace />;
  }
  return <MesConteudo competencia={competencia as string} />;
}

function MesConteudo({ competencia }: { competencia: string }) {
  const atual = competenciaAtual();
  const { data, isPending, error } = useMes(competencia);

  const setaClasse = buttonVariants({ variant: 'ghost', size: 'icon' });

  return (
    <div className="grid gap-4">
      <header className="flex items-center justify-between">
        <Link
          to={`/mes/${somarMeses(competencia, -1)}`}
          aria-label="Mês anterior"
          className={setaClasse}
        >
          <ChevronLeft aria-hidden />
        </Link>
        <h1 className="text-xl font-semibold">{nomeDoMes(competencia)}</h1>
        {competencia < somarMeses(atual, 1) ? (
          <Link
            to={`/mes/${somarMeses(competencia, 1)}`}
            aria-label="Próximo mês"
            className={setaClasse}
          >
            <ChevronRight aria-hidden />
          </Link>
        ) : (
          <span className={cn(setaClasse, 'invisible')} aria-hidden />
        )}
      </header>

      {isPending && <p className="text-muted-foreground">Carregando…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error instanceof ApiError && error.mensagem
            ? error.mensagem
            : 'Não foi possível carregar este mês.'}
        </p>
      )}

      {data && (
        <>
          <SaldoMes saldo={data.saldo} />
          {/* Task 9 liga onSelecionar ao diálogo de edição do recebimento. */}
          <GraficoReceitas receitas={data.receitas} onSelecionar={() => {}} />
          <GraficoGastos pagas={data.pagas} aPagar={data.aPagar} resumo={data.resumo} />
          <ResumoMes resumo={data.resumo} />
          {data.atrasadas.itens.length > 0 && (
            <Secao
              titulo="Atrasadas"
              total={data.atrasadas.totalCentavos}
              semValor={data.atrasadas.semValor}
              itens={data.atrasadas.itens}
            />
          )}
          <Secao id="a-pagar" titulo="A pagar" itens={data.aPagar} vazio="Tudo pago neste mês 🎉" />
          {data.pagas.length > 0 && <Secao titulo="Pagas" itens={data.pagas} />}
          {data.canceladas.length > 0 && (
            <details className="grid gap-3">
              <summary className="flex min-h-12 cursor-pointer items-center font-semibold">
                Canceladas ({data.canceladas.length})
              </summary>
              <div className="grid gap-3">
                {data.canceladas.map((item) => (
                  <LancamentoCard key={item.id} item={item} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
