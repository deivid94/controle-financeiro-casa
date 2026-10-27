import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

// Variáveis de teste (Postgres na porta 5433). Definidas no processo antes de qualquer import de src/env.ts.
const envTeste = parseEnv(readFileSync(new URL('./.env.test', import.meta.url), 'utf8'));

export default defineConfig({
  test: {
    env: envTeste,
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
  },
});
