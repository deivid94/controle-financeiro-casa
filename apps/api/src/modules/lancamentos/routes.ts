import {
  criarEsporadicaSchema,
  editarLancamentoSchema,
  lancamentoItemSchema,
  pagarSchema,
} from '@casa/shared';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as controller from './controller.js';

export function lancamentosRoutes(app: FastifyInstance): void {
  const rotas = app.withTypeProvider<ZodTypeProvider>();
  rotas.addHook('onRequest', app.requireAuth);

  const params = z.object({ id: z.string().min(1) });
  const resposta = { 200: lancamentoItemSchema };

  rotas.post(
    '/api/lancamentos',
    { schema: { body: criarEsporadicaSchema, response: { 201: lancamentoItemSchema } } },
    controller.criarEsporadica,
  );

  rotas.post(
    '/api/lancamentos/:id/pagar',
    { schema: { params, body: pagarSchema.strict(), response: resposta } },
    controller.pagar,
  );

  rotas.post(
    '/api/lancamentos/:id/desfazer',
    { schema: { params, response: resposta } },
    controller.desfazer,
  );

  rotas.post(
    '/api/lancamentos/:id/cancelar',
    { schema: { params, response: resposta } },
    controller.cancelar,
  );

  rotas.patch(
    '/api/lancamentos/:id',
    {
      schema: {
        params,
        // strict: campos fora da lista (ex.: `status`) viram 400 em vez de serem ignorados.
        body: editarLancamentoSchema.strict(),
        response: resposta,
      },
    },
    controller.editar,
  );
}
