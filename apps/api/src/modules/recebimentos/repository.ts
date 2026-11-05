import { prisma } from '../../lib/prisma.js';

/** Única camada que fala com o Prisma neste módulo. */
export function buscarPorId(id: string) {
  return prisma.recebimento.findUnique({ where: { id } });
}

export function criarAvulso(dados: {
  nome: string;
  competencia: string;
  data: string;
  valorCentavos: number;
}) {
  // receitaId fica null: é uma receita só deste mês.
  return prisma.recebimento.create({ data: dados });
}

export function atualizar(
  id: string,
  dados: { nome?: string; data?: string; competencia?: string; valorCentavos?: number },
) {
  return prisma.recebimento.update({ where: { id }, data: dados });
}

export function excluir(id: string) {
  return prisma.recebimento.delete({ where: { id } });
}
