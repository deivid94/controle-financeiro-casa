import {
  competenciaAtual,
  competenciaDe,
  somarMeses,
  type CriarRecebimentoAvulsoInput,
  type EditarRecebimentoInput,
  type RecebimentoItem,
} from '@casa/shared';
import { AppError } from '../../plugins/error-handler.js';
import { recebimentoParaItem } from '../meses/service.js';
import * as repository from './repository.js';

async function buscarOuFalhar(id: string) {
  const recebimento = await repository.buscarPorId(id);
  if (!recebimento) {
    throw new AppError(404, 'RECEBIMENTO_NAO_ENCONTRADO', 'Recebimento não encontrado');
  }
  return recebimento;
}

/** A competência vem da data e não pode passar do mês atual + 1. */
function competenciaDaData(data: string): string {
  const competencia = competenciaDe(data);
  if (competencia > somarMeses(competenciaAtual(), 1)) {
    throw new AppError(400, 'COMPETENCIA_FORA_DO_LIMITE', 'Competência além do próximo mês');
  }
  return competencia;
}

export async function criarAvulso(dados: CriarRecebimentoAvulsoInput): Promise<RecebimentoItem> {
  const competencia = competenciaDaData(dados.data);
  return recebimentoParaItem(await repository.criarAvulso({ ...dados, competencia }));
}

export async function editar(id: string, dados: EditarRecebimentoInput): Promise<RecebimentoItem> {
  const recebimento = await buscarOuFalhar(id);

  if (recebimento.receitaId !== null) {
    // Ocorrência de receita fixa: nome e data vêm do cadastro; só o valor do mês muda.
    if (dados.nome !== undefined || dados.data !== undefined) {
      throw new AppError(
        400,
        'CAMPO_NAO_EDITAVEL',
        'Em receita fixa só o valor pode ser alterado; edite o cadastro da receita',
      );
    }
    return recebimentoParaItem(await repository.atualizar(id, dados));
  }

  // Avulsa: valor 0 não faz sentido (para isso, exclua).
  if (dados.valorCentavos === 0) {
    throw new AppError(400, 'VALOR_INVALIDO', 'Receita avulsa precisa ter valor maior que zero');
  }
  const competencia = dados.data !== undefined ? competenciaDaData(dados.data) : undefined;
  return recebimentoParaItem(
    await repository.atualizar(id, { ...dados, ...(competencia ? { competencia } : {}) }),
  );
}

export async function excluir(id: string): Promise<void> {
  const recebimento = await buscarOuFalhar(id);
  if (recebimento.receitaId !== null) {
    // Se apagasse, a geração recriaria no próximo GET. Para sumir, desative a receita.
    throw new AppError(
      400,
      'RECEBIMENTO_DE_RECEITA_FIXA',
      'Ocorrência de receita fixa não pode ser excluída; desative a receita',
    );
  }
  await repository.excluir(id);
}
