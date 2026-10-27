import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from '@fastify/type-provider-zod';
import Fastify, { type FastifyInstance } from 'fastify';
import { registrarErrorHandler } from './plugins/error-handler.js';

export function buildApp(opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registrarErrorHandler(app);

  app.withTypeProvider<ZodTypeProvider>().get('/api/health', () => ({ ok: true }));

  return Promise.resolve(app);
}
