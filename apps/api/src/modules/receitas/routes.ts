import { criarReceitaSchema, editarReceitaSchema, receitaViewSchema } from '@casa/shared';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as controller from './controller.js';

export function receitasRoutes(app: FastifyInstance): void {
  const rotas = app.withTypeProvider<ZodTypeProvider>();
  // Tudo neste plugin exige login. onRequest roda antes da validação do body (sem sessão = 401, não 400).
  rotas.addHook('onRequest', app.requireAuth);

  rotas.get('/api/receitas', { schema: { response: { 200: z.array(receitaViewSchema) } } }, () =>
    controller.listar(),
  );

  rotas.post(
    '/api/receitas',
    { schema: { body: criarReceitaSchema, response: { 201: receitaViewSchema } } },
    controller.criar,
  );

  rotas.patch(
    '/api/receitas/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        // strict: campos fora da lista viram 400 em vez de serem ignorados.
        body: editarReceitaSchema.strict(),
        response: { 200: receitaViewSchema },
      },
    },
    controller.editar,
  );
}
