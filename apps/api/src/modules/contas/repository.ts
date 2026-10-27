import type { CriarContaInput, EditarContaInput } from '@casa/shared';
import { prisma } from '../../lib/prisma.js';

/** Única camada que fala com o Prisma. Ativas primeiro, depois por nome. */
export function listar() {
  return prisma.conta.findMany({ orderBy: [{ ativa: 'desc' }, { nome: 'asc' }] });
}

export function criar(dados: CriarContaInput, inicioCompetencia: string) {
  return prisma.conta.create({
    data: {
      nome: dados.nome,
      tipo: dados.tipo,
      prioridade: dados.prioridade,
      diaVencimento: dados.diaVencimento,
      linkSegundaVia: dados.linkSegundaVia,
      valorCentavos: dados.tipo === 'RECORRENTE_VARIAVEL' ? null : dados.valorCentavos,
      totalParcelas: dados.tipo === 'PARCELADA' ? dados.totalParcelas : null,
      primeiraParcela: dados.tipo === 'PARCELADA' ? dados.primeiraParcela : null,
      inicioCompetencia,
    },
  });
}

export function buscarPorId(id: string) {
  return prisma.conta.findUnique({ where: { id } });
}

export function atualizar(id: string, dados: EditarContaInput) {
  return prisma.conta.update({ where: { id }, data: dados });
}
