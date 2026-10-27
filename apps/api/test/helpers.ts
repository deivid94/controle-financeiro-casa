import type { FastifyInstance } from 'fastify';
import { garantirUsuario } from '../scripts/seed-users.js';
import { buildApp } from '../src/app.js';
import { env } from '../src/env.js';
import { prisma } from '../src/lib/prisma.js';

export async function criarAppDeTeste(): Promise<FastifyInstance> {
  return buildApp({ logger: false });
}

export function nomeDoBanco(url: string): string {
  return new URL(url).pathname.slice(1);
}

/** TRUNCATE ... CASCADE em todas as tabelas (domínio e auth), exceto migrações. Só no casa_test. */
export async function limparBanco(): Promise<void> {
  const banco = nomeDoBanco(env.DATABASE_URL);
  if (banco !== 'casa_test') {
    throw new Error(`limparBanco recusado: banco "${banco}" não é casa_test`);
  }
  const tabelas = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tabelas.length === 0) return;
  const lista = tabelas.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
}

export const USUARIOS_TESTE = {
  1: { email: 'usuario1@teste.local', nome: 'Usuário Um', senha: 'senha-teste-1234' },
  2: { email: 'usuario2@teste.local', nome: 'Usuário Dois', senha: 'senha-teste-5678' },
} as const;

/** Garante o usuário n, faz login e devolve o header `cookie` para usar nas próximas requisições. */
export async function loginComo(app: FastifyInstance, n: 1 | 2): Promise<string> {
  const usuario = USUARIOS_TESTE[n];
  await garantirUsuario(usuario);
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    // IP distinto por chamada: o rate limit do Better Auth não deve interferir entre testes.
    headers: {
      origin: env.WEB_ORIGIN,
      'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250) + 1}`,
    },
    payload: { email: usuario.email, password: usuario.senha },
  });
  if (res.statusCode !== 200) {
    throw new Error(`loginComo(${n}) falhou: ${res.statusCode} ${res.body}`);
  }
  return res.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}
