import { defineConfig } from 'prisma/config';

// Prisma 7 não carrega .env sozinho. Não sobrescreve variáveis já definidas.
try {
  process.loadEnvFile('.env');
} catch {
  // sem .env (CI/produção): usa o ambiente
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
