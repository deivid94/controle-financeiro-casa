import { z } from 'zod';
import { competenciaSchema } from '../competencia.js';
import { prioridadeSchema, statusSchema, tipoContaSchema } from './conta.js';
import { dataSchema } from './lancamento.js';

export const lancamentoItemSchema = z.object({
  id: z.string(),
  contaId: z.string().nullable(),
  tipo: z.union([tipoContaSchema, z.literal('ESPORADICA')]),
  nome: z.string(),
  prioridade: prioridadeSchema,
  competencia: competenciaSchema,
  vencimento: dataSchema,
  valorCentavos: z.number().int().nullable(),
  valorEstimadoCentavos: z.number().int().nullable(),
  status: statusSchema,
  pagoEm: z.string().nullable(),
  pagoPor: z.object({ id: z.string(), nome: z.string() }).nullable(),
  parcela: z
    .object({ numero: z.number().int(), total: z.number().int(), faltam: z.number().int() })
    .nullable(),
  linkSegundaVia: z.string().nullable(),
  codigoPagamento: z.string().nullable(),
  observacao: z.string().nullable(),
});
export type LancamentoItem = z.infer<typeof lancamentoItemSchema>;

const listaComTotalSchema = z.object({
  itens: z.array(lancamentoItemSchema),
  totalCentavos: z.number().int(),
});

export const mesViewSchema = z.object({
  competencia: competenciaSchema,
  resumo: z.object({
    totalPagoCentavos: z.number().int(),
    totalPendenteCentavos: z.number().int(),
    totalMesCentavos: z.number().int(),
    semValor: z.number().int(),
  }),
  atrasadas: listaComTotalSchema,
  aPagar: z.array(lancamentoItemSchema),
  pagas: z.array(lancamentoItemSchema),
  canceladas: z.array(lancamentoItemSchema),
});
export type MesView = z.infer<typeof mesViewSchema>;

export const historicoItemSchema = z.object({
  competencia: competenciaSchema,
  totalPagoCentavos: z.number().int(),
  totalMesCentavos: z.number().int(),
});
export type HistoricoItem = z.infer<typeof historicoItemSchema>;

export const contaViewSchema = z.object({
  id: z.string(),
  tipo: tipoContaSchema,
  nome: z.string(),
  prioridade: prioridadeSchema,
  diaVencimento: z.number().int(),
  valorCentavos: z.number().int().nullable(),
  linkSegundaVia: z.string().nullable(),
  totalParcelas: z.number().int().nullable(),
  primeiraParcela: competenciaSchema.nullable(),
  ativa: z.boolean(),
  inicioCompetencia: competenciaSchema,
});
export type ContaView = z.infer<typeof contaViewSchema>;
