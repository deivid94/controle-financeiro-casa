import type { CriarRecebimentoAvulsoInput, EditarRecebimentoInput } from '@casa/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as service from './service.js';

type ComId = { Params: { id: string } };

export async function criarAvulso(
  request: FastifyRequest<{ Body: CriarRecebimentoAvulsoInput }>,
  reply: FastifyReply,
) {
  const item = await service.criarAvulso(request.body);
  return reply.status(201).send(item);
}

export function editar(request: FastifyRequest<ComId & { Body: EditarRecebimentoInput }>) {
  return service.editar(request.params.id, request.body);
}

export async function excluir(request: FastifyRequest<ComId>, reply: FastifyReply) {
  await service.excluir(request.params.id);
  return reply.status(204).send();
}
