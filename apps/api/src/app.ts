import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from '@fastify/type-provider-zod';
import Fastify, { type FastifyInstance } from 'fastify';
import { env } from './env.js';
import { registrarErrorHandler } from './plugins/error-handler.js';

export async function buildApp(opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registrarErrorHandler(app);

  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });

  app.withTypeProvider<ZodTypeProvider>().get('/api/health', () => ({ ok: true }));

  return app;
}
