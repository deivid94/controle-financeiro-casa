import { criarRecebimentoAvulsoSchema, parseValorBRL, type RecebimentoItem } from '@casa/shared';
import { useState, type FormEvent } from 'react';
import { Campo } from '@/components/Campo';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useEditarRecebimento, useExcluirRecebimento } from '../receitas/queries';

type Props = {
  item: RecebimentoItem;
  aberto: boolean;
  onFechar: () => void;
};

/** 350050 -> "3500,50": formato que `parseValorBRL` aceita de volta. */
function centavosParaTexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

// `parseValorBRL` recusa zero (vale para contas e avulsas), mas "não recebi nada neste mês"
// é um valor legítimo de ocorrência fixa: reconhecemos o zero aqui.
const ZERO = /^s*(R$s*)?0+([.,]0{1,2})?s*$/i;

function parseValorMes(texto: string): number | null {
  return ZERO.test(texto) ? 0 : parseValorBRL(texto);
}

export function RecebimentoDialog({ item, aberto, onFechar }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent>
        {/* Conteúdo separado: monta (e zera o estado) cada vez que o diálogo abre. */}
        <RecebimentoForm item={item} onFechar={onFechar} />
      </DialogContent>
    </Dialog>
  );
}

function RecebimentoForm({ item, onFechar }: { item: RecebimentoItem; onFechar: () => void }) {
  const editar = useEditarRecebimento();
  const excluir = useExcluirRecebimento();
  const fixa = item.receitaId !== null;
  const [nome, setNome] = useState(item.nome);
  const [valor, setValor] = useState(centavosParaTexto(item.valorCentavos));
  const [data, setData] = useState(item.data);
  const [erros, setErros] = useState<{ nome?: string; valor?: string; data?: string }>({});
  const [confirmando, setConfirmando] = useState(false);
  const pendente = editar.isPending || excluir.isPending;

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (pendente) return;
    const centavos = fixa ? parseValorMes(valor) : parseValorBRL(valor);
    if (fixa) {
      // Ocorrência de receita fixa: só o valor, e "0,00" é permitido (mês sem receber).
      if (centavos === null) {
        setErros({ valor: 'Valor inválido' });
        return;
      }
      editar.mutate({ id: item.id, dados: { valorCentavos: centavos } });
      onFechar();
      return;
    }
    // Avulsa: mesmas regras da criação (nome preenchido, valor > 0, data válida).
    const dados = { nome, valorCentavos: centavos ?? 0, data };
    const r = criarRecebimentoAvulsoSchema.safeParse(dados);
    const novos: typeof erros = {};
    if (centavos === null || centavos <= 0) novos.valor = 'Valor inválido';
    if (!r.success) {
      for (const i of r.error.issues) {
        if (i.path[0] === 'nome') novos.nome = 'Informe o nome';
        if (i.path[0] === 'data') novos.data = 'Data inválida';
      }
    }
    setErros(novos);
    if (Object.keys(novos).length > 0) return;
    editar.mutate({ id: item.id, dados });
    onFechar();
  }

  if (confirmando) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Excluir {item.nome}?</DialogTitle>
          <DialogDescription>Este recebimento sai do saldo do mês. Continuar?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setConfirmando(false)}>
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pendente}
            onClick={() => {
              excluir.mutate(item.id);
              onFechar();
            }}
          >
            Confirmar exclusão
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{item.nome}</DialogTitle>
      </DialogHeader>
      {!fixa && (
        <Campo id="rec-nome" rotulo="Nome" erro={erros.nome}>
          <Input
            id="rec-nome"
            autoComplete="off"
            aria-invalid={!!erros.nome}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </Campo>
      )}
      <Campo id="rec-valor" rotulo={fixa ? 'Valor deste mês' : 'Valor'} erro={erros.valor}>
        <Input
          id="rec-valor"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          aria-invalid={!!erros.valor}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </Campo>
      {!fixa && (
        <Campo id="rec-data" rotulo="Data" erro={erros.data}>
          <Input
            id="rec-data"
            type="date"
            aria-invalid={!!erros.data}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </Campo>
      )}
      <DialogFooter>
        {!fixa && (
          <Button type="button" variant="destructive" onClick={() => setConfirmando(true)}>
            Excluir
          </Button>
        )}
        <Button type="submit" disabled={pendente}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}
