import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../env.js';
import { auth } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: UsuarioAutenticado;
  }
}

/**
 * Encaminha /api/auth/* ao Better Auth e expõe `requireAuth`.
 * Chamado direto (sem app.register) para que o decorator fique visível em todo o app.
 */
export function registrarAuth(app: FastifyInstance): void {
  app.decorateRequest('user');

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      const url = new URL(request.url, env.BETTER_AUTH_URL);
      const headers = fromNodeHeaders(request.headers);
      // O corpo já foi lido pelo Fastify e é reserializado abaixo: o content-length original não vale mais.
      headers.delete('content-length');
      const temCorpo = request.method !== 'GET' && request.body !== undefined;
      const resposta = await auth.handler(
        new Request(url, {
          method: request.method,
          headers,
          body: temCorpo ? JSON.stringify(request.body) : undefined,
        }),
      );

      reply.status(resposta.status);
      resposta.headers.forEach((valor, nome) => {
        if (nome !== 'set-cookie') void reply.header(nome, valor);
      });
      // Headers.forEach funde set-cookie em uma string; getSetCookie preserva cada cookie.
      const cookies = resposta.headers.getSetCookie();
      if (cookies.length > 0) void reply.header('set-cookie', cookies);
      return reply.send(await resposta.text());
    },
  });

  app.decorate('requireAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessao = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!sessao) {
      return reply.status(401).send({ erro: 'NAO_AUTENTICADO' });
    }
    request.user = { id: sessao.user.id, nome: sessao.user.name };
  });

  app.get('/api/me', { preHandler: app.requireAuth }, async (request) => {
    const { id, name, email } = await prisma.user.findUniqueOrThrow({
      where: { id: request.user.id },
    });
    return { id, nome: name, email };
  });
}
