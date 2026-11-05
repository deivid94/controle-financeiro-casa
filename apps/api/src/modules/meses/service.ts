import {
  competenciaAtual,
  somarMeses,
  type Competencia,
  type HistoricoItem,
  type LancamentoItem,
  type MesView,
  type RecebimentoItem,
} from '@casa/shared';
import { chaveLancamento, planejarLancamentos } from '../../domain/geracao.js';
import { calcularParcela, compararPendentes } from '../../domain/ordenacao.js';
import { calcularSaldo, planejarRecebimentos } from '../../domain/recebimentos.js';
import { resumirMes } from '../../domain/resumo.js';
import type { Lancamento, Recebimento } from '../../generated/prisma/client.js';
import { AppError } from '../../plugins/error-handler.js';
import * as repository from './repository.js';

/** Gera os lançamentos que faltam até `ate`. Idempotente e seguro sob concorrência. */
export async function garantirLancamentos(ate: Competencia): Promise<void> {
  const [contas, existentes] = await Promise.all([
    repository.listarContas(),
    repository.listarChavesExistentes(ate),
  ]);
  const chaves = new Set(
    existentes.flatMap((e) => (e.contaId ? [chaveLancamento(e.contaId, e.competencia)] : [])),
  );
  const novos = planejarLancamentos(contas, chaves, ate);
  if (novos.length > 0) await repository.criarLancamentos(novos);
}

/** Gera as ocorrências das receitas fixas que faltam até `ate`. Mesma ideia de garantirLancamentos. */
export async function garantirRecebimentos(ate: Competencia): Promise<void> {
  const [receitas, existentes] = await Promise.all([
    repository.listarReceitas(),
    repository.listarChavesRecebimentos(ate),
  ]);
  const chaves = new Set(
    existentes.flatMap((e) => (e.receitaId ? [chaveLancamento(e.receitaId, e.competencia)] : [])),
  );
  const novos = planejarRecebimentos(receitas, chaves, ate);
  if (novos.length > 0) await repository.criarRecebimentos(novos);
}

export function recebimentoParaItem(r: Recebimento): RecebimentoItem {
  return {
    id: r.id,
    receitaId: r.receitaId,
    nome: r.nome,
    competencia: r.competencia,
    data: r.data,
    valorCentavos: r.valorCentavos,
  };
}

/** Monta os itens de vários lançamentos com um número fixo de consultas (sem N+1). */
export async function montarItens(lancamentos: Lancamento[]): Promise<LancamentoItem[]> {
  if (lancamentos.length === 0) return [];

  const contaIds = [...new Set(lancamentos.flatMap((l) => (l.contaId ? [l.contaId] : [])))];
  const usuarioIds = [...new Set(lancamentos.flatMap((l) => (l.pagoPorId ? [l.pagoPorId] : [])))];
  const semValor = lancamentos.filter((l) => l.contaId !== null && l.valorCentavos === null);
  const semValorIds = [...new Set(semValor.map((l) => l.contaId as string))];
  const parceladasIds = [
    ...new Set(
      lancamentos.flatMap((l) => (l.numeroParcela !== null && l.contaId ? [l.contaId] : [])),
    ),
  ];

  const [contas, usuarios, anteriores, pagas, menores] = await Promise.all([
    contaIds.length > 0 ? repository.buscarContas(contaIds) : [],
    usuarioIds.length > 0 ? repository.buscarUsuarios(usuarioIds) : [],
    semValorIds.length > 0
      ? repository.buscarValoresDoMesAnterior(semValorIds, [
          ...new Set(semValor.map((l) => somarMeses(l.competencia, -1))),
        ])
      : [],
    parceladasIds.length > 0 ? repository.contarPagasPorConta(parceladasIds) : [],
    parceladasIds.length > 0 ? repository.menorParcelaPorConta(parceladasIds) : [],
  ]);

  const contaPorId = new Map(contas.map((c) => [c.id, c]));
  const nomePorUsuario = new Map(usuarios.map((u) => [u.id, u.name]));
  const valorAnterior = new Map(
    anteriores.map((a) => [chaveLancamento(a.contaId as string, a.competencia), a.valorCentavos]),
  );
  const pagasPorConta = new Map(pagas.map((p) => [p.contaId, p._count._all]));
  const menorPorConta = new Map(menores.map((m) => [m.contaId, m._min.numeroParcela]));

  return lancamentos.map((l) => {
    const conta = l.contaId ? contaPorId.get(l.contaId) : undefined;
    const nomePagador = l.pagoPorId ? nomePorUsuario.get(l.pagoPorId) : undefined;
    const estimado =
      l.contaId !== null && l.valorCentavos === null
        ? (valorAnterior.get(chaveLancamento(l.contaId, somarMeses(l.competencia, -1))) ?? null)
        : null;

    let parcela: LancamentoItem['parcela'] = null;
    if (l.numeroParcela !== null && l.contaId && conta?.totalParcelas) {
      parcela = calcularParcela({
        numero: l.numeroParcela,
        total: conta.totalParcelas,
        primeiraGerada: menorPorConta.get(l.contaId) ?? l.numeroParcela,
        pagas: pagasPorConta.get(l.contaId) ?? 0,
      });
    }

    return {
      id: l.id,
      contaId: l.contaId,
      tipo: conta?.tipo ?? 'ESPORADICA',
      nome: l.nome,
      prioridade: l.prioridade,
      competencia: l.competencia,
      vencimento: l.vencimento,
      valorCentavos: l.valorCentavos,
      valorEstimadoCentavos: estimado,
      status: l.status,
      pagoEm: l.pagoEm ? l.pagoEm.toISOString() : null,
      pagoPor:
        l.pagoPorId && nomePagador !== undefined ? { id: l.pagoPorId, nome: nomePagador } : null,
      parcela,
      linkSegundaVia: conta?.linkSegundaVia ?? null,
      codigoPagamento: l.codigoPagamento,
      observacao: l.observacao,
    };
  });
}

/** Conveniência para um único lançamento (usada pelas ações da Task 10). */
export async function montarItem(lancamento: Lancamento): Promise<LancamentoItem> {
  const [item] = await montarItens([lancamento]);
  return item as LancamentoItem;
}

function porCompetenciaEPendente(a: LancamentoItem, b: LancamentoItem): number {
  if (a.competencia !== b.competencia) return a.competencia < b.competencia ? -1 : 1;
  return compararPendentes(a, b);
}

export async function mesDe(competencia: Competencia): Promise<MesView> {
  const atual = competenciaAtual();
  if (competencia > somarMeses(atual, 1)) {
    throw new AppError(400, 'COMPETENCIA_FORA_DO_LIMITE', 'Competência além do próximo mês');
  }

  const ate = competencia > atual ? competencia : atual;
  await garantirLancamentos(ate);
  await garantirRecebimentos(ate);

  const [doMes, anteriores, recebimentos] = await Promise.all([
    repository.listarDaCompetencia(competencia),
    repository.listarPendentesAnteriores(competencia),
    repository.listarRecebimentosDaCompetencia(competencia),
  ]);
  const itens = await montarItens([...doMes, ...anteriores]);

  const doMesItens = itens.filter((i) => i.competencia === competencia);
  const aPagar = doMesItens.filter((i) => i.status === 'PENDENTE').sort(compararPendentes);
  const pagas = doMesItens
    .filter((i) => i.status === 'PAGA')
    .sort((a, b) => (b.pagoEm ?? '').localeCompare(a.pagoEm ?? ''));
  const canceladas = doMesItens.filter((i) => i.status === 'CANCELADA');
  const atrasadas = itens.filter((i) => i.competencia < competencia).sort(porCompetenciaEPendente);

  const resumo = resumirMes(doMesItens);
  const receitasTotal = recebimentos.reduce((soma, r) => soma + r.valorCentavos, 0);

  return {
    competencia,
    resumo,
    receitas: { itens: recebimentos.map(recebimentoParaItem), totalCentavos: receitasTotal },
    // Tudo por competência: o saldo do mês usa só os lançamentos e receitas deste mês.
    saldo: calcularSaldo(receitasTotal, resumo),
    atrasadas: {
      itens: atrasadas,
      totalCentavos: atrasadas.reduce((soma, i) => soma + (i.valorCentavos ?? 0), 0),
      semValor: atrasadas.filter((i) => i.valorCentavos === null).length,
    },
    aPagar,
    pagas,
    canceladas,
  };
}

export async function historico(): Promise<HistoricoItem[]> {
  const lancamentos = await repository.listarNaoCanceladasAte(competenciaAtual());
  const porMes = new Map<Competencia, typeof lancamentos>();
  for (const l of lancamentos) {
    const lista = porMes.get(l.competencia) ?? [];
    lista.push(l);
    porMes.set(l.competencia, lista);
  }
  return [...porMes.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([competencia, itens]) => {
      const { totalPagoCentavos, totalMesCentavos } = resumirMes(itens);
      return { competencia, totalPagoCentavos, totalMesCentavos };
    });
}
