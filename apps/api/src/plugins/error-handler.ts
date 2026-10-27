import type { FastifyError, FastifyInstance } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from '@fastify/type-provider-zod';

export class AppError extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'AppError';
  }
}

export function registrarErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.status).send({ erro: error.codigo, mensagem: error.message });
    }
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({ erro: 'VALIDACAO', detalhes: error.validation });
    }
    if (isResponseSerializationError(error)) {
      request.log.error({ err: error }, 'resposta fora do schema');
      return reply.status(500).send({ erro: 'ERRO_INTERNO', mensagem: 'Erro interno' });
    }
    // Erros 4xx do próprio Fastify (JSON malformado, payload grande, ...).
    const status = (error as FastifyError).statusCode;
    if (status !== undefined && status >= 400 && status < 500) {
      return reply.status(status).send({ erro: 'REQUISICAO_INVALIDA', mensagem: error.message });
    }
    request.log.error({ err: error }, 'erro não tratado');
    return reply.status(500).send({ erro: 'ERRO_INTERNO', mensagem: 'Erro interno' });
  });
}
