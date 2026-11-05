import { z } from 'zod';
import { competenciaSchema } from '../competencia.js';
import { nomeSchema, VALOR_MAX_CENTAVOS, valorCentavosSchema } from './conta.js';
import { dataSchema } from './lancamento.js';

export const diaRecebimentoSchema = z.number().int().min(1).max(31);

export const criarReceitaSchema = z.object({
  nome: nomeSchema,
  valorCentavos: valorCentavosSchema,
  diaRecebimento: diaRecebimentoSchema,
});
export type CriarReceitaInput = z.infer<typeof criarReceitaSchema>;

export const editarReceitaSchema = z
  .object({
    nome: nomeSchema,
    valorCentavos: valorCentavosSchema,
    diaRecebimento: diaRecebimentoSchema,
    ativa: z.boolean(),
  })
  .partial();
export type EditarReceitaInput = z.infer<typeof editarReceitaSchema>;

export const criarRecebimentoAvulsoSchema = z.object({
  nome: nomeSchema,
  valorCentavos: valorCentavosSchema,
  data: dataSchema,
});
export type CriarRecebimentoAvulsoInput = z.infer<typeof criarRecebimentoAvulsoSchema>;

// Ao editar um recebimento, o valor pode ser 0 (receita que não veio no mês).
export const valorRecebidoSchema = z.number().int().min(0).max(VALOR_MAX_CENTAVOS);

export const editarRecebimentoSchema = z
  .object({
    nome: nomeSchema,
    valorCentavos: valorRecebidoSchema,
    data: dataSchema,
  })
  .partial();
export type EditarRecebimentoInput = z.infer<typeof editarRecebimentoSchema>;

export const receitaViewSchema = z.object({
  id: z.string(),
  nome: z.string(),
  valorCentavos: z.number().int(),
  diaRecebimento: z.number().int(),
  inicioCompetencia: competenciaSchema,
  ativa: z.boolean(),
});
export type ReceitaView = z.infer<typeof receitaViewSchema>;

export const recebimentoItemSchema = z.object({
  id: z.string(),
  receitaId: z.string().nullable(),
  nome: z.string(),
  competencia: competenciaSchema,
  data: dataSchema,
  valorCentavos: z.number().int(),
});
export type RecebimentoItem = z.infer<typeof recebimentoItemSchema>;
