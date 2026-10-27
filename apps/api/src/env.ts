import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  WEB_ORIGIN: z.url(),
  // Headers (em ordem) de onde o Better Auth lê o IP do cliente para o rate limit. Só use headers que o cliente não controla.
  IP_ADDRESS_HEADERS: z
    .string()
    .default('x-vercel-forwarded-for')
    .transform((v) =>
      v
        .split(',')
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean),
    )
    .refine((headers) => headers.length > 0, {
      message: 'Informe ao menos um header (ex.: x-vercel-forwarded-for)',
    }),
  PORT: z.coerce.number().int().positive().default(3333),
});

export type Env = z.infer<typeof envSchema>;

const resultado = envSchema.safeParse(process.env);
if (!resultado.success) {
  throw new Error(`Variáveis de ambiente inválidas:\n${z.prettifyError(resultado.error)}`);
}

export const env: Env = resultado.data;
