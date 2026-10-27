import { z } from 'zod';
import { competenciaSchema } from '../competencia.js';

/** Máximo do `Int` do Postgres. */
export const VALOR_MAX_CENTAVOS = 2_147_483_647;
export const valorCentavosSchema = z.number().int().positive().max(VALOR_MAX_CENTAVOS);
export const prioridadeSchema = z.enum(['ESSENCIAL', 'IMPORTANTE', 'NORMAL']);
export const tipoContaSchema = z.enum(['RECORRENTE_VARIAVEL', 'RECORRENTE_FIXA', 'PARCELADA']);
export const statusSchema = z.enum(['PENDENTE', 'PAGA', 'CANCELADA']);

export type Prioridade = z.infer<typeof prioridadeSchema>;
export type TipoConta = z.infer<typeof tipoContaSchema>;
export type StatusLancamento = z.infer<typeof statusSchema>;

export const nomeSchema = z.string().trim().min(1).max(80);
const linkSchema = z.url({ protocol: /^https?$/ });
const diaVencimentoSchema = z.number().int().min(1).max(31);

const comum = {
  nome: nomeSchema,
  prioridade: prioridadeSchema,
  diaVencimento: diaVencimentoSchema,
  linkSegundaVia: linkSchema.optional(),
};

export const criarContaSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('RECORRENTE_VARIAVEL'), ...comum }),
  z.object({
    tipo: z.literal('RECORRENTE_FIXA'),
    ...comum,
    valorCentavos: valorCentavosSchema,
  }),
  z.object({
    tipo: z.literal('PARCELADA'),
    ...comum,
    valorCentavos: valorCentavosSchema,
    totalParcelas: z.number().int().min(1).max(120),
    primeiraParcela: competenciaSchema,
  }),
]);
export type CriarContaInput = z.infer<typeof criarContaSchema>;

/** `tipo`, `totalParcelas` e `primeiraParcela` não são editáveis: quebrariam a contagem de parcelas. */
export const editarContaSchema = z
  .object({
    nome: nomeSchema,
    prioridade: prioridadeSchema,
    diaVencimento: diaVencimentoSchema,
    valorCentavos: valorCentavosSchema,
    linkSegundaVia: linkSchema.nullable(),
    ativa: z.boolean(),
  })
  .partial();
export type EditarContaInput = z.infer<typeof editarContaSchema>;
