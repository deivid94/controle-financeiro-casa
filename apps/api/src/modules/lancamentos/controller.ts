import type { CriarEsporadicaInput, EditarLancamentoInput, PagarInput } from '@casa/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as service from './service.js';

type ComId = { Params: { id: string } };

export async function criarEsporadica(
  request: FastifyRequest<{ Body: CriarEsporadicaInput }>,
  reply: FastifyReply,
) {
  const item = await service.criarEsporadica(request.body);
  return reply.status(201).send(item);
}

export function pagar(request: FastifyRequest<ComId & { Body: PagarInput }>) {
  return service.pagar(request.params.id, request.body, request.user.id);
}

export function desfazer(request: FastifyRequest<ComId>) {
  return service.desfazer(request.params.id);
}

export function cancelar(request: FastifyRequest<ComId>) {
  return service.cancelar(request.params.id);
}

export function editar(request: FastifyRequest<ComId & { Body: EditarLancamentoInput }>) {
  return service.editar(request.params.id, request.body);
}
