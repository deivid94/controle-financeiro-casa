import { z } from 'zod';
import { competenciaSchema } from '../competencia.js';

export const valorCentavosSchema = z.number().int().positive();
export const prioridadeSchema = z.enum(['ESSENCIAL', 'IMPORTANTE', 'NORMAL']);
export const tipoContaSchema = z.enum(['RECORRENTE_VARIAVEL', 'RECORRENTE_FIXA', 'PARCELADA']);
export const statusSchema = z.enum(['PENDENTE', 'PAGA', 'CANCELADA']);

export type Prioridade = z.infer<typeof prioridadeSchema>;
export type TipoConta = z.infer<typeof tipoContaSchema>;
export type StatusLancamento = z.infer<typeof statusSchema>;

const nomeSchema = z.string().trim().min(1).max(80);
const diaVencimentoSchema = z.number().int().min(1).max(31);

const comum = {
  nome: nomeSchema,
  prioridade: prioridadeSchema,
  diaVencimento: diaVencimentoSchema,
  linkSegundaVia: z.url().optional(),
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
    linkSegundaVia: z.url().nullable(),
    ativa: z.boolean(),
  })
  .partial();
export type EditarContaInput = z.infer<typeof editarContaSchema>;
