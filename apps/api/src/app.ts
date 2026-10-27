import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from '@fastify/type-provider-zod';
import Fastify, { type FastifyInstance } from 'fastify';
import { contasRoutes } from './modules/contas/routes.js';
import { registrarAuth } from './plugins/auth.js';
import { registrarErrorHandler } from './plugins/error-handler.js';

export function buildApp(opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registrarErrorHandler(app);
  registrarAuth(app);

  app.withTypeProvider<ZodTypeProvider>().get('/api/health', () => ({ ok: true }));

  void app.register(contasRoutes);

  return Promise.resolve(app);
}
