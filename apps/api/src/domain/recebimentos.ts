import { somarMeses, vencimentoNoMes } from '@casa/shared';
import type { Competencia, MesView } from '@casa/shared';
import { chaveLancamento } from './geracao.js';

export type ReceitaParaGeracao = {
  id: string;
  nome: string;
  diaRecebimento: number;
  valorCentavos: number;
  inicioCompetencia: Competencia;
  ativa: boolean;
};

export type NovoRecebimento = {
  receitaId: string;
  nome: string;
  competencia: Competencia;
  data: string;
  valorCentavos: number;
};

/** `existentes` usa a chave de chaveLancamento(receitaId, competencia). */
export function planejarRecebimentos(
  receitas: ReceitaParaGeracao[],
  existentes: ReadonlySet<string>,
  ate: Competencia,
): NovoRecebimento[] {
  const novos: NovoRecebimento[] = [];

  for (const receita of receitas) {
    if (!receita.ativa) continue;

    for (let c = receita.inicioCompetencia; c <= ate; c = somarMeses(c, 1)) {
      if (existentes.has(chaveLancamento(receita.id, c))) continue;

      novos.push({
        receitaId: receita.id,
        nome: receita.nome,
        competencia: c,
        // vencimentoNoMes limita o dia ao último do mês (31 em fevereiro vira 28/29).
        data: vencimentoNoMes(c, receita.diaRecebimento),
        valorCentavos: receita.valorCentavos,
      });
    }
  }

  return novos;
}

export function calcularSaldo(
  receitasCentavos: number,
  resumo: { totalPagoCentavos: number; totalPendenteCentavos: number },
): MesView['saldo'] {
  return {
    receitasCentavos,
    pagoCentavos: resumo.totalPagoCentavos,
    saldoCentavos: receitasCentavos - resumo.totalPagoCentavos,
    depoisDeTudoCentavos:
      receitasCentavos - (resumo.totalPagoCentavos + resumo.totalPendenteCentavos),
  };
}
