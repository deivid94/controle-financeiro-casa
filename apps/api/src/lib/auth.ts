import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { env } from '../env.js';
import { prisma } from './prisma.js';

/** Configuração compartilhada; o seed usa a mesma com `disableSignUp: false`. */
export function criarAuth(opts: { permitirCadastro: boolean }) {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !opts.permitirCadastro,
      minPasswordLength: 8,
    },
    // Em memória não sobreviveria entre invocações serverless.
    rateLimit: { enabled: true, storage: 'database' },
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    advanced: { ipAddress: { ipAddressHeaders: env.IP_ADDRESS_HEADERS } },
    trustedOrigins: [env.WEB_ORIGIN],
  });
}

export const auth = criarAuth({ permitirCadastro: false });
