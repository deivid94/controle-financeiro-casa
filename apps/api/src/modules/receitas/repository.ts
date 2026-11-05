import { vencimentoNoMes, type CriarReceitaInput } from '@casa/shared';
import { prisma } from '../../lib/prisma.js';

/** Única camada que fala com o Prisma. Ativas primeiro, depois por nome. */
export function listar() {
  return prisma.receita.findMany({ orderBy: [{ ativa: 'desc' }, { nome: 'asc' }] });
}

export function criar(dados: CriarReceitaInput, inicioCompetencia: string) {
  return prisma.receita.create({
    data: {
      nome: dados.nome,
      valorCentavos: dados.valorCentavos,
      diaRecebimento: dados.diaRecebimento,
      inicioCompetencia,
    },
  });
}

export function buscarPorId(id: string) {
  return prisma.receita.findUnique({ where: { id } });
}

export interface PlanoDeEdicao {
  cadastro: {
    nome?: string;
    valorCentavos?: number;
    diaRecebimento?: number;
    ativa?: boolean;
    inicioCompetencia?: string;
  };
  competenciaAtual: string;
  valorAntigo: number;
  novoValor?: number;
  novoNome?: string;
  novoDia?: number;
  apagarFuturas: boolean;
}

/** Atualiza o cadastro e as ocorrências juntos: ou tudo muda, ou nada. */
export function atualizarComOcorrencias(id: string, plano: PlanoDeEdicao) {
  const aPartirDeAgora = { receitaId: id, competencia: { gte: plano.competenciaAtual } };

  return prisma.$transaction(async (tx) => {
    const receita = await tx.receita.update({ where: { id }, data: plano.cadastro });

    if (plano.novoValor !== undefined) {
      await tx.recebimento.updateMany({
        where: { ...aPartirDeAgora, valorCentavos: plano.valorAntigo },
        data: { valorCentavos: plano.novoValor },
      });
    }
    if (plano.novoNome !== undefined) {
      await tx.recebimento.updateMany({ where: aPartirDeAgora, data: { nome: plano.novoNome } });
    }
    if (plano.novoDia !== undefined) {
      // A data depende da competência de cada linha, então atualiza uma a uma.
      const ocorrencias = await tx.recebimento.findMany({ where: aPartirDeAgora });
      for (const o of ocorrencias) {
        await tx.recebimento.update({
          where: { id: o.id },
          data: { data: vencimentoNoMes(o.competencia, plano.novoDia) },
        });
      }
    }
    if (plano.apagarFuturas) {
      await tx.recebimento.deleteMany({
        where: { receitaId: id, competencia: { gt: plano.competenciaAtual } },
      });
    }
    return receita;
  });
}
