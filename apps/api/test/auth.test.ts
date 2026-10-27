import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { garantirUsuario } from '../scripts/seed-users.js';
import { criarAppDeTeste, limparBanco, loginComo, USUARIOS_TESTE } from './helpers.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await criarAppDeTeste();
  await app.ready();
});

beforeEach(async () => {
  await limparBanco();
  await garantirUsuario(USUARIOS_TESTE[1]);
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const login = (email: string, senha: string) =>
  app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { origin: 'http://localhost:5173' },
    payload: { email, password: senha },
  });

describe('autenticação', () => {
  it('GET /api/me sem cookie retorna 401 NAO_AUTENTICADO', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ erro: 'NAO_AUTENTICADO' });
  });

  it('cadastro público está desligado', async () => {
    const antes = await prisma.user.count();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { origin: 'http://localhost:5173' },
      payload: { email: 'intruso@teste.local', password: 'senha-forte-123', name: 'Intruso' },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(await prisma.user.count()).toBe(antes);
  });

  it('login com senha errada retorna 401', async () => {
    const res = await login(USUARIOS_TESTE[1].email, 'senha-errada-123');
    expect(res.statusCode).toBe(401);
  });

  it('login certo devolve cookie de sessão HttpOnly e /api/me responde com o e-mail', async () => {
    const res = await login(USUARIOS_TESTE[1].email, USUARIOS_TESTE[1].senha);
    expect(res.statusCode).toBe(200);
    const cookies = res.cookies;
    expect(cookies.length).toBeGreaterThan(0);
    const sessao = cookies.find((c) => c.name.includes('session_token'));
    expect(sessao?.httpOnly).toBe(true);

    const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({
      email: USUARIOS_TESTE[1].email,
      nome: USUARIOS_TESTE[1].nome,
    });
  });

  it('loginComo devolve um cookie que autentica', async () => {
    const cookie = await loginComo(app, 2);
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toBe(USUARIOS_TESTE[2].email);
  });

  it('seed é idempotente: rodar duas vezes mantém 2 usuários', async () => {
    await garantirUsuario(USUARIOS_TESTE[1]);
    await garantirUsuario(USUARIOS_TESTE[2]);
    await garantirUsuario(USUARIOS_TESTE[1]);
    await garantirUsuario(USUARIOS_TESTE[2]);
    expect(await prisma.user.count()).toBe(2);
  });
});
