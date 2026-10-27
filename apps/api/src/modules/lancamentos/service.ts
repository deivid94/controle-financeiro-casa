import {
  competenciaAtual,
  competenciaDe,
  somarMeses,
  type CriarEsporadicaInput,
  type EditarLancamentoInput,
  type LancamentoItem,
  type PagarInput,
} from '@casa/shared';
import type { Lancamento } from '../../generated/prisma/client.js';
import { AppError } from '../../plugins/error-handler.js';
import { montarItem } from '../meses/service.js';
import * as repository from './repository.js';

async function obter(id: string): Promise<Lancamento> {
  const lancamento = await repository.buscarPorId(id);
  if (!lancamento) {
    throw new AppError(404, 'LANCAMENTO_NAO_ENCONTRADO', 'Lançamento não encontrado');
  }
  return lancamento;
}

export async function criarEsporadica(dados: CriarEsporadicaInput): Promise<LancamentoItem> {
  const competencia = competenciaDe(dados.vencimento);
  if (competencia > somarMeses(competenciaAtual(), 1)) {
    throw new AppError(400, 'COMPETENCIA_FORA_DO_LIMITE', 'Competência além do próximo mês');
  }
  return montarItem(await repository.criarEsporadica({ ...dados, competencia }));
}

export async function pagar(
  id: string,
  dados: PagarInput,
  usuarioId: string,
): Promise<LancamentoItem> {
  const atual = await obter(id);
  if (atual.status === 'CANCELADA') {
    throw new AppError(409, 'LANCAMENTO_CANCELADO', 'Lançamento cancelado não pode ser pago');
  }
  if (atual.status === 'PAGA') return montarItem(atual);

  if (atual.valorCentavos === null && dados.valorCentavos === undefined) {
    throw new AppError(422, 'VALOR_OBRIGATORIO', 'Informe o valor para pagar');
  }

  const alterou = await repository.marcarComoPaga(id, {
    pagoEm: new Date(),
    pagoPorId: usuarioId,
    valorCentavos: dados.valorCentavos,
  });

  // Reler decide o resultado: se perdemos a corrida, o status atual diz o que responder.
  const depois = await obter(id);
  if (alterou === 0 && depois.status === 'CANCELADA') {
    throw new AppError(409, 'LANCAMENTO_CANCELADO', 'Lançamento cancelado não pode ser pago');
  }
  return montarItem(depois);
}

export async function desfazer(id: string): Promise<LancamentoItem> {
  await obter(id);
  return montarItem(await repository.voltarParaPendente(id));
}

export async function cancelar(id: string): Promise<LancamentoItem> {
  const atual = await obter(id);
  if (atual.status === 'PAGA') {
    throw new AppError(409, 'LANCAMENTO_PAGO', 'Desfaça o pagamento antes de cancelar');
  }
  if (atual.status === 'PENDENTE') {
    const alterou = await repository.marcarComoCancelada(id);
    if (alterou === 0) {
      // Alguém pagou entre a leitura e a escrita.
      const depois = await obter(id);
      if (depois.status === 'PAGA') {
        throw new AppError(409, 'LANCAMENTO_PAGO', 'Desfaça o pagamento antes de cancelar');
      }
    }
  }
  return montarItem(await obter(id));
}

/** Mudar o vencimento não muda a competência: ela é a identidade do lançamento na geração. */
export async function editar(id: string, dados: EditarLancamentoInput): Promise<LancamentoItem> {
  await obter(id);
  return montarItem(await repository.atualizar(id, dados));
}
