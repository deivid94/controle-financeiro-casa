import type { CriarReceitaInput, EditarReceitaInput } from '@casa/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as service from './service.js';

export function listar() {
  return service.listar();
}

export async function criar(
  request: FastifyRequest<{ Body: CriarReceitaInput }>,
  reply: FastifyReply,
) {
  const receita = await service.criar(request.body);
  return reply.status(201).send(receita);
}

export function editar(
  request: FastifyRequest<{ Params: { id: string }; Body: EditarReceitaInput }>,
) {
  return service.editar(request.params.id, request.body);
}
