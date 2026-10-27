import { competenciaSchema, historicoItemSchema, mesViewSchema } from '@casa/shared';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as controller from './controller.js';

export function mesesRoutes(app: FastifyInstance): void {
  const rotas = app.withTypeProvider<ZodTypeProvider>();
  rotas.addHook('onRequest', app.requireAuth);

  rotas.get(
    '/api/meses/:competencia',
    {
      schema: {
        params: z.object({ competencia: competenciaSchema }),
        response: { 200: mesViewSchema },
      },
    },
    controller.mes,
  );

  rotas.get('/api/historico', { schema: { response: { 200: z.array(historicoItemSchema) } } }, () =>
    controller.historico(),
  );
}
