import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { criarAppDeTeste, limparBanco, loginComo } from './helpers.js';

let app: FastifyInstance;
let cookie: string;

beforeAll(async () => {
  app = await criarAppDeTeste();
  await app.ready();
});

beforeEach(async () => {
  await limparBanco();
  cookie = await loginComo(app, 1);
  // Só Date é falso: os timers de I/O do Prisma/pg continuam reais.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T12:00:00-03:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const chamar = (method: 'POST' | 'PATCH' | 'DELETE' | 'GET', url: string, payload?: object) =>
  app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

const avulsa = { nome: 'Bico', valorCentavos: 50000, data: '2026-10-15' };

/** Cria uma receita fixa pela API e devolve o id da ocorrência de 2026-10. */
async function ocorrenciaFixa() {
  const res = await chamar('POST', '/api/receitas', {
    nome: 'Salário',
    valorCentavos: 150000,
    diaRecebimento: 5,
  });
  expect(res.statusCode).toBe(201);
  await chamar('GET', '/api/meses/2026-10');
  return (await prisma.recebimento.findFirstOrThrow({ where: { competencia: '2026-10' } })).id;
}

describe('autenticação', () => {
  it('sem cookie retorna 401', async () => {
    const r = await Promise.all([
      app.inject({ method: 'POST', url: '/api/recebimentos', payload: {} }),
      app.inject({ method: 'PATCH', url: '/api/recebimentos/x', payload: {} }),
      app.inject({ method: 'DELETE', url: '/api/recebimentos/x' }),
    ]);
    expect(r.map((x) => x.statusCode)).toEqual([401, 401, 401]);
  });
});

describe('POST /api/recebimentos', () => {
  it('cria avulsa com a competência da data', async () => {
    const res = await chamar('POST', '/api/recebimentos', avulsa);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ receitaId: null, competencia: '2026-10', ...avulsa });
  });

  it('data além do próximo mês retorna 400 COMPETENCIA_FORA_DO_LIMITE', async () => {
    const res = await chamar('POST', '/api/recebimentos', { ...avulsa, data: '2026-12-01' });
    expect(res.statusCode).toBe(400);
    expect(res.json().erro).toBe('COMPETENCIA_FORA_DO_LIMITE');
  });
});

describe('PATCH /api/recebimentos/:id', () => {
  it('valor 0 em ocorrência de fixa retorna 200 e o total do mês zera', async () => {
    const id = await ocorrenciaFixa();
    const res = await chamar('PATCH', `/api/recebimentos/${id}`, { valorCentavos: 0 });
    expect(res.statusCode).toBe(200);
    expect(res.json().valorCentavos).toBe(0);
    const mes = (await chamar('GET', '/api/meses/2026-10')).json();
    expect(mes.receitas.totalCentavos).toBe(0);
  });

  it('nome em ocorrência de fixa retorna 400 CAMPO_NAO_EDITAVEL', async () => {
    const id = await ocorrenciaFixa();
    const res = await chamar('PATCH', `/api/recebimentos/${id}`, { nome: 'Outro' });
    expect(res.statusCode).toBe(400);
    expect(res.json().erro).toBe('CAMPO_NAO_EDITAVEL');
  });

  it('avulsa: mudar a data recalcula a competência', async () => {
    const { id } = (await chamar('POST', '/api/recebimentos', avulsa)).json<{ id: string }>();
    const res = await chamar('PATCH', `/api/recebimentos/${id}`, { data: '2026-11-03' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ data: '2026-11-03', competencia: '2026-11' });
    const longe = await chamar('PATCH', `/api/recebimentos/${id}`, { data: '2026-12-03' });
    expect(longe.json().erro).toBe('COMPETENCIA_FORA_DO_LIMITE');
  });

  it('avulsa com valor 0 retorna 400', async () => {
    const { id } = (await chamar('POST', '/api/recebimentos', avulsa)).json<{ id: string }>();
    const res = await chamar('PATCH', `/api/recebimentos/${id}`, { valorCentavos: 0 });
    expect(res.statusCode).toBe(400);
  });

  it('inexistente retorna 404 RECEBIMENTO_NAO_ENCONTRADO', async () => {
    const res = await chamar('PATCH', '/api/recebimentos/nao-existe', { valorCentavos: 1 });
    expect(res.statusCode).toBe(404);
    expect(res.json().erro).toBe('RECEBIMENTO_NAO_ENCONTRADO');
  });
});

describe('DELETE /api/recebimentos/:id', () => {
  it('avulsa retorna 204 e some do banco', async () => {
    const { id } = (await chamar('POST', '/api/recebimentos', avulsa)).json<{ id: string }>();
    expect((await chamar('DELETE', `/api/recebimentos/${id}`)).statusCode).toBe(204);
    expect(await prisma.recebimento.count()).toBe(0);
  });

  it('ocorrência de fixa retorna 400 RECEBIMENTO_DE_RECEITA_FIXA', async () => {
    const id = await ocorrenciaFixa();
    const res = await chamar('DELETE', `/api/recebimentos/${id}`);
    expect(res.statusCode).toBe(400);
    expect(res.json().erro).toBe('RECEBIMENTO_DE_RECEITA_FIXA');
  });

  it('inexistente retorna 404', async () => {
    expect((await chamar('DELETE', '/api/recebimentos/nao-existe')).statusCode).toBe(404);
  });
});
