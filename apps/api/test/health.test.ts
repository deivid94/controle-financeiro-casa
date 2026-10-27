import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from '../src/plugins/error-handler.js';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/env.js';
import { criarAppDeTeste, limparBanco, nomeDoBanco } from './helpers.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await criarAppDeTeste();
  const r = app.withTypeProvider<ZodTypeProvider>();
  r.post('/api/_teste/validacao', { schema: { body: z.object({ n: z.number() }) } }, () => ({
    ok: true,
  }));
  r.get('/api/_teste/app-error', () => {
    throw new AppError(409, 'X', 'm');
  });
  r.get('/api/_teste/boom', () => {
    throw new Error('segredo interno');
  });
  await app.ready();
  await limparBanco();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('infra da API', () => {
  it('GET /api/health responde 200 { ok: true }', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('body inválido vira 400 VALIDACAO com detalhes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/_teste/validacao',
      payload: { n: 'x' },
    });
    expect(res.statusCode).toBe(400);
    const corpo = res.json();
    expect(corpo.erro).toBe('VALIDACAO');
    expect(Array.isArray(corpo.detalhes)).toBe(true);
    expect(corpo.detalhes.length).toBeGreaterThan(0);
  });

  it('body válido passa', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/_teste/validacao',
      payload: { n: 1 },
    });
    expect(res.statusCode).toBe(200);
  });

  it('AppError vira { erro, mensagem } com o status dele', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/_teste/app-error' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ erro: 'X', mensagem: 'm' });
  });

  it('erro inesperado vira 500 sem vazar detalhes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/_teste/boom' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ erro: 'ERRO_INTERNO', mensagem: 'Erro interno' });
    expect(res.body).not.toContain('segredo interno');
  });

  it('JSON malformado vira 400, não 500', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/_teste/validacao',
      headers: { 'content-type': 'application/json' },
      payload: '{',
    });
    expect(res.statusCode).toBe(400);
  });

  it('o banco de teste está acessível e limpo', async () => {
    await limparBanco();
    expect(await prisma.conta.count()).toBe(0);
  });
});

describe('limparBanco', () => {
  it('só opera no banco casa_test', async () => {
    expect(env.DATABASE_URL).toContain('/casa_test');
    expect(nomeDoBanco('postgresql://casa:casa@localhost:5432/casa')).toBe('casa');
    const original = env.DATABASE_URL;
    env.DATABASE_URL = 'postgresql://casa:casa@localhost:5432/casa';
    try {
      await expect(limparBanco()).rejects.toThrow(/recusado/);
    } finally {
      env.DATABASE_URL = original;
    }
  });
});
