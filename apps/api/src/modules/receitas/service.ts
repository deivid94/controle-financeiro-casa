import {
  competenciaAtual,
  type CriarReceitaInput,
  type EditarReceitaInput,
  type ReceitaView,
} from '@casa/shared';
import type { Receita } from '../../generated/prisma/client.js';
import { AppError } from '../../plugins/error-handler.js';
import * as repository from './repository.js';

function paraView(receita: Receita): ReceitaView {
  return {
    id: receita.id,
    nome: receita.nome,
    valorCentavos: receita.valorCentavos,
    diaRecebimento: receita.diaRecebimento,
    inicioCompetencia: receita.inicioCompetencia,
    ativa: receita.ativa,
  };
}

export async function listar(): Promise<ReceitaView[]> {
  return (await repository.listar()).map(paraView);
}

export async function criar(dados: CriarReceitaInput): Promise<ReceitaView> {
  return paraView(await repository.criar(dados, competenciaAtual()));
}

/**
 * Editar a receita propaga para as ocorrências do mês atual em diante
 * (meses passados são histórico e não mudam). Aqui o service decide O QUE
 * fazer; o repository executa tudo numa única transação.
 */
export async function editar(id: string, dados: EditarReceitaInput): Promise<ReceitaView> {
  const receita = await repository.buscarPorId(id);
  if (!receita) {
    throw new AppError(404, 'RECEITA_NAO_ENCONTRADA', 'Receita não encontrada');
  }
  const atual = competenciaAtual();

  // Valor só é propagado se mudou de verdade. A troca é feita apenas nas ocorrências
  // que ainda têm o valor ANTIGO do cadastro: quem ajustou um mês na mão (ex.: 0
  // porque a receita não veio) não é sobrescrito.
  const valorMudou =
    dados.valorCentavos !== undefined && dados.valorCentavos !== receita.valorCentavos;
  const reativando = dados.ativa === true && !receita.ativa;

  const atualizada = await repository.atualizarComOcorrencias(id, {
    cadastro: {
      ...dados,
      // Reativar recomeça a contar a partir do mês atual (não gera os meses parados).
      ...(reativando ? { inicioCompetencia: atual } : {}),
    },
    competenciaAtual: atual,
    valorAntigo: receita.valorCentavos,
    novoValor: valorMudou ? dados.valorCentavos : undefined,
    novoNome: dados.nome,
    novoDia: dados.diaRecebimento,
    // Desativar apaga só o futuro; o mês atual fica (pode já ter sido recebido).
    apagarFuturas: dados.ativa === false,
  });
  return paraView(atualizada);
}
