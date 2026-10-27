import type { CriarContaInput, EditarContaInput } from '@casa/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as service from './service.js';

export function listar() {
  return service.listar();
}

export async function criar(
  request: FastifyRequest<{ Body: CriarContaInput }>,
  reply: FastifyReply,
) {
  const conta = await service.criar(request.body);
  return reply.status(201).send(conta);
}

export function editar(
  request: FastifyRequest<{ Params: { id: string }; Body: EditarContaInput }>,
) {
  return service.editar(request.params.id, request.body);
}
