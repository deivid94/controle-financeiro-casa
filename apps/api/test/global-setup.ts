import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

/** Aplica as migrações pendentes no banco de teste (5433) antes de toda a suíte. */
export default function setup(): void {
  const envTeste = parseEnv(readFileSync(new URL('../.env.test', import.meta.url), 'utf8'));
  try {
    execSync('pnpm exec prisma migrate deploy', {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, ...envTeste },
      stdio: 'pipe',
    });
  } catch (e) {
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    const saida = `${err.stdout?.toString() ?? ''}${err.stderr?.toString() ?? ''}`;
    throw new Error(
      `Falha ao preparar o banco de teste (docker compose up -d db-test):\n${saida}`,
      { cause: e },
    );
  }
}
