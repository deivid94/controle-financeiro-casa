import type { FastifyRequest } from 'fastify';
import * as service from './service.js';

export function mes(request: FastifyRequest<{ Params: { competencia: string } }>) {
  return service.mesDe(request.params.competencia);
}

export function historico() {
  return service.historico();
}
