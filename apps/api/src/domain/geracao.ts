import { mesesEntre, somarMeses, vencimentoNoMes } from '@casa/shared';
import type { Competencia, Prioridade, TipoConta } from '@casa/shared';

export type ContaParaGeracao = {
  id: string;
  nome: string;
  tipo: TipoConta;
  prioridade: Prioridade;
  diaVencimento: number;
  valorCentavos: number | null;
  totalParcelas: number | null;
  primeiraParcela: Competencia | null;
  inicioCompetencia: Competencia;
  ativa: boolean;
};

export type NovoLancamento = {
  contaId: string;
  nome: string;
  prioridade: Prioridade;
  competencia: Competencia;
  vencimento: string;
  valorCentavos: number | null;
  numeroParcela: number | null;
};

/** Chave usada no conjunto `existentes` de planejarLancamentos. */
export function chaveLancamento(contaId: string, competencia: Competencia): string {
  return `${contaId}|${competencia}`;
}

export function planejarLancamentos(
  contas: ContaParaGeracao[],
  existentes: ReadonlySet<string>,
  ate: Competencia,
): NovoLancamento[] {
  const novos: NovoLancamento[] = [];

  for (const conta of contas) {
    if (!conta.ativa) continue;

    const parcelada = conta.tipo === 'PARCELADA';
    let inicio = conta.inicioCompetencia;
    if (parcelada && conta.primeiraParcela && conta.primeiraParcela > inicio) {
      inicio = conta.primeiraParcela;
    }

    for (let c = inicio; c <= ate; c = somarMeses(c, 1)) {
      let numeroParcela: number | null = null;
      if (parcelada && conta.primeiraParcela) {
        numeroParcela = mesesEntre(conta.primeiraParcela, c) + 1;
        if (conta.totalParcelas !== null && numeroParcela > conta.totalParcelas) break;
      }
      if (existentes.has(chaveLancamento(conta.id, c))) continue;

      novos.push({
        contaId: conta.id,
        nome: conta.nome,
        prioridade: conta.prioridade,
        competencia: c,
        vencimento: vencimentoNoMes(c, conta.diaVencimento),
        valorCentavos: conta.tipo === 'RECORRENTE_VARIAVEL' ? null : conta.valorCentavos,
        numeroParcela,
      });
    }
  }

  return novos;
}
