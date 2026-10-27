import {
  competenciaAtual,
  type ContaView,
  type CriarContaInput,
  type EditarContaInput,
} from '@casa/shared';
import type { Conta } from '../../generated/prisma/client.js';
import { AppError } from '../../plugins/error-handler.js';
import * as repository from './repository.js';

function paraView(conta: Conta): ContaView {
  return {
    id: conta.id,
    tipo: conta.tipo,
    nome: conta.nome,
    prioridade: conta.prioridade,
    diaVencimento: conta.diaVencimento,
    valorCentavos: conta.valorCentavos,
    linkSegundaVia: conta.linkSegundaVia,
    totalParcelas: conta.totalParcelas,
    primeiraParcela: conta.primeiraParcela,
    ativa: conta.ativa,
    inicioCompetencia: conta.inicioCompetencia,
  };
}

export async function listar(): Promise<ContaView[]> {
  return (await repository.listar()).map(paraView);
}

export async function criar(dados: CriarContaInput): Promise<ContaView> {
  return paraView(await repository.criar(dados, competenciaAtual()));
}

/**
 * Editar valor/nome/etc. só afeta lançamentos futuros: os já gerados
 * guardam sua própria cópia (a conta não é relida para lançamentos existentes).
 */
export async function editar(id: string, dados: EditarContaInput): Promise<ContaView> {
  if (!(await repository.buscarPorId(id))) {
    throw new AppError(404, 'CONTA_NAO_ENCONTRADA', 'Conta não encontrada');
  }
  return paraView(await repository.atualizar(id, dados));
}
