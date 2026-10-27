import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function carregarEnv() {
  vi.resetModules();
  return import('../src/env.js');
}

describe('env IP_ADDRESS_HEADERS', () => {
  it('aceita lista normalizada', async () => {
    vi.stubEnv('IP_ADDRESS_HEADERS', ' X-Vercel-Forwarded-For , x-real-ip ');
    const { env } = await carregarEnv();
    expect(env.IP_ADDRESS_HEADERS).toEqual(['x-vercel-forwarded-for', 'x-real-ip']);
  });

  it.each(['', ' , ,'])('rejeita valor sem nenhum header (%j)', async (valor) => {
    vi.stubEnv('IP_ADDRESS_HEADERS', valor);
    await expect(carregarEnv()).rejects.toThrow(/IP_ADDRESS_HEADERS/);
  });
});
