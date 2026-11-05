import {
  criarRecebimentoAvulsoSchema,
  editarRecebimentoSchema,
  recebimentoItemSchema,
} from '@casa/shared';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as controller from './controller.js';

export function recebimentosRoutes(app: FastifyInstance): void {
  const rotas = app.withTypeProvider<ZodTypeProvider>();
  rotas.addHook('onRequest', app.requireAuth);

  const params = z.object({ id: z.string().min(1) });

  rotas.post(
    '/api/recebimentos',
    { schema: { body: criarRecebimentoAvulsoSchema, response: { 201: recebimentoItemSchema } } },
    controller.criarAvulso,
  );

  rotas.patch(
    '/api/recebimentos/:id',
    {
      schema: {
        params,
        // strict: campos fora da lista viram 400 em vez de serem ignorados.
        body: editarRecebimentoSchema.strict(),
        response: { 200: recebimentoItemSchema },
      },
    },
    controller.editar,
  );

  rotas.delete('/api/recebimentos/:id', { schema: { params } }, controller.excluir);
}
