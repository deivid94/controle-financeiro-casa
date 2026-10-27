import { formatBRL, type LancamentoItem } from '@casa/shared';
import { ExternalLink, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CodigoDialog } from './CodigoDialog';
import { useCancelar, useDesfazer, useEditarLancamento, usePagar } from './queries';
import { ValorDialog } from './ValorDialog';

const PRIORIDADE = {
  ESSENCIAL: { rotulo: 'Essencial', variante: 'destructive' },
  IMPORTANTE: { rotulo: 'Importante', variante: 'default' },
  NORMAL: { rotulo: 'Normal', variante: 'secondary' },
} as const;

/** `AAAA-MM-DD` → `dd/mm` (só fatia a string: sem Date, sem risco de fuso). */
function diaMes(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

const formatadorPagamento = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

/** `R$ 1.500,00` → `1.500,00` (para preencher o campo). */
function semSimbolo(centavos: number): string {
  return formatBRL(centavos).replace('R$ ', '');
}

function Valor({ item }: { item: LancamentoItem }) {
  if (item.valorCentavos !== null) {
    return <span className="text-lg font-semibold">{formatBRL(item.valorCentavos)}</span>;
  }
  if (item.valorEstimadoCentavos !== null) {
    return (
      <span className="text-lg font-semibold italic">
        {`~${formatBRL(item.valorEstimadoCentavos)} (mês passado)`}
      </span>
    );
  }
  return <span className="text-muted-foreground text-lg italic">valor a informar</span>;
}

export function LancamentoCard({ item }: { item: LancamentoItem }) {
  const pagar = usePagar();
  const desfazer = useDesfazer();
  const cancelar = useCancelar();
  const editar = useEditarLancamento();

  const [menuAberto, setMenuAberto] = useState(false);
  const [pedindoValorParaPagar, setPedindoValorParaPagar] = useState(false);
  const [editandoValor, setEditandoValor] = useState(false);
  const [editandoCodigo, setEditandoCodigo] = useState(false);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);

  const pendente = item.status === 'PENDENTE';
  const prioridade = PRIORIDADE[item.prioridade];

  function pagarComValor(valorCentavos?: number) {
    if (pagar.isPending) return;
    pagar.mutate(
      valorCentavos === undefined
        ? { id: item.id, nome: item.nome }
        : { id: item.id, nome: item.nome, valorCentavos },
    );
  }

  function aoPagar() {
    if (item.valorCentavos === null) setPedindoValorParaPagar(true);
    else pagarComValor();
  }

  const fecharMenu = () => setMenuAberto(false);

  return (
    <Card className={cn(item.status === 'CANCELADA' && 'opacity-70')}>
      <CardContent className="grid gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="grid min-w-0 gap-1">
            <h3 className="truncate font-medium">{item.nome}</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={prioridade.variante}>{prioridade.rotulo}</Badge>
              <span className="text-muted-foreground">Vence {diaMes(item.vencimento)}</span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Mais ações"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </div>

        <Valor item={item} />

        {item.parcela && (
          <p className="text-muted-foreground text-sm">
            {`Parcela ${item.parcela.numero} de ${item.parcela.total} · faltam ${item.parcela.faltam}`}
          </p>
        )}

        {item.status === 'PAGA' && item.pagoEm && (
          <p className="text-muted-foreground text-sm">
            {`Pago em ${formatadorPagamento.format(new Date(item.pagoEm))}${
              item.pagoPor ? ` por ${item.pagoPor.nome}` : ''
            }`}
          </p>
        )}

        {(item.linkSegundaVia || item.codigoPagamento) && (
          <div className="flex flex-wrap gap-2">
            {item.linkSegundaVia && (
              <a
                href={item.linkSegundaVia}
                target="_blank"
                rel="noopener"
                className="border-border hover:bg-muted inline-flex h-12 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
              >
                <ExternalLink className="size-4" aria-hidden />
                2ª via
              </a>
            )}
            {item.codigoPagamento && <CopyButton texto={item.codigoPagamento} />}
          </div>
        )}

        {pendente && (
          <Button type="button" className="w-full" disabled={pagar.isPending} onClick={aoPagar}>
            Pagar
          </Button>
        )}

        {menuAberto && (
          <div className="grid gap-2 border-t pt-3">
            {pendente ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    fecharMenu();
                    setEditandoValor(true);
                  }}
                >
                  Editar valor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    fecharMenu();
                    setEditandoCodigo(true);
                  }}
                >
                  Editar código
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    fecharMenu();
                    setConfirmandoCancelar(true);
                  }}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={desfazer.isPending}
                onClick={() => {
                  fecharMenu();
                  desfazer.mutate({ id: item.id, nome: item.nome });
                }}
              >
                Desfazer
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <ValorDialog
        titulo={`Valor de ${item.nome}`}
        open={pedindoValorParaPagar}
        onOpenChange={setPedindoValorParaPagar}
        onConfirmar={pagarComValor}
        pendente={pagar.isPending}
        valorInicial={
          item.valorEstimadoCentavos === null ? '' : semSimbolo(item.valorEstimadoCentavos)
        }
      />
      <ValorDialog
        titulo={`Editar valor de ${item.nome}`}
        open={editandoValor}
        onOpenChange={setEditandoValor}
        onConfirmar={(valorCentavos) => editar.mutate({ id: item.id, valorCentavos })}
        pendente={editar.isPending}
        valorInicial={item.valorCentavos === null ? '' : semSimbolo(item.valorCentavos)}
      />
      <CodigoDialog
        open={editandoCodigo}
        onOpenChange={setEditandoCodigo}
        codigoInicial={item.codigoPagamento ?? ''}
        onConfirmar={(codigoPagamento) => editar.mutate({ id: item.id, codigoPagamento })}
      />
      <Dialog open={confirmandoCancelar} onOpenChange={setConfirmandoCancelar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar {item.nome}?</DialogTitle>
            <DialogDescription>Cancelar tira esta conta dos totais. Continuar?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmandoCancelar(false)}>
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelar.isPending}
              onClick={() => {
                setConfirmandoCancelar(false);
                cancelar.mutate({ id: item.id, nome: item.nome });
              }}
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
