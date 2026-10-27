import { z } from 'zod';
import { nomeSchema, prioridadeSchema, valorCentavosSchema } from './conta.js';

/** Data `AAAA-MM-DD` que exista no calendário. */
export const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Data inválida');

export const criarEsporadicaSchema = z.object({
  nome: nomeSchema,
  valorCentavos: valorCentavosSchema,
  vencimento: dataSchema,
  prioridade: prioridadeSchema,
  codigoPagamento: z.string().optional(),
  observacao: z.string().optional(),
});
export type CriarEsporadicaInput = z.infer<typeof criarEsporadicaSchema>;

export const pagarSchema = z.object({ valorCentavos: valorCentavosSchema.optional() });
export type PagarInput = z.infer<typeof pagarSchema>;

export const editarLancamentoSchema = z
  .object({
    nome: nomeSchema,
    prioridade: prioridadeSchema,
    valorCentavos: valorCentavosSchema,
    vencimento: dataSchema,
    codigoPagamento: z.string().nullable(),
    observacao: z.string().nullable(),
  })
  .partial();
export type EditarLancamentoInput = z.infer<typeof editarLancamentoSchema>;
