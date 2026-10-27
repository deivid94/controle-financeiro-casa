import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  WEB_ORIGIN: z.url(),
  PORT: z.coerce.number().int().positive().default(3333),
});

export type Env = z.infer<typeof envSchema>;

const resultado = envSchema.safeParse(process.env);
if (!resultado.success) {
  throw new Error(`Variáveis de ambiente inválidas:\n${z.prettifyError(resultado.error)}`);
}

export const env: Env = resultado.data;
