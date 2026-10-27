import type { FastifyInstance } from 'fastify';
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
