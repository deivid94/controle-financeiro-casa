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

/**
 * Só apaga avulsa (`receitaId: null`). Com `deleteMany` um segundo DELETE concorrente
 * não lança P2025 (como o `delete` faria): devolve `count 0`, que o service trata como 404.
 */
export async function excluirAvulso(id: string): Promise<boolean> {
  const { count } = await prisma.recebimento.deleteMany({ where: { id, receitaId: null } });
  return count > 0;
}
