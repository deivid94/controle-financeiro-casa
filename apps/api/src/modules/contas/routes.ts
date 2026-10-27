import { contaViewSchema, criarContaSchema, editarContaSchema } from '@casa/shared';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as controller from './controller.js';

export function contasRoutes(app: FastifyInstance): void {
  const rotas = app.withTypeProvider<ZodTypeProvider>();
  // Tudo neste plugin exige login. onRequest roda antes da validação do body (sem sessão = 401, não 400).
  rotas.addHook('onRequest', app.requireAuth);

  rotas.get('/api/contas', { schema: { response: { 200: z.array(contaViewSchema) } } }, () =>
    controller.listar(),
  );

  rotas.post(
    '/api/contas',
    { schema: { body: criarContaSchema, response: { 201: contaViewSchema } } },
    controller.criar,
  );

  rotas.patch(
    '/api/contas/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        // strict: campos fora da lista (ex.: `tipo`) viram 400 em vez de serem ignorados.
        body: editarContaSchema.strict(),
        response: { 200: contaViewSchema },
      },
    },
    controller.editar,
  );
}
