import { pathToFileURL } from 'node:url';
import { criarAuth } from '../src/lib/auth.js';
import { prisma } from '../src/lib/prisma.js';

export interface DadosUsuario {
  email: string;
  nome: string;
  senha: string;
}

/** Cria o usuário se ainda não existir (idempotente), usando a API pública do Better Auth. */
export async function garantirUsuario({ email, nome, senha }: DadosUsuario): Promise<void> {
  const existente = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existente) return;
  // Instância separada, só aqui, com cadastro liberado: o app em si nunca aceita sign-up.
  const authSeed = criarAuth({ permitirCadastro: true });
  await authSeed.api.signUpEmail({ body: { email, name: nome, password: senha } });
}

type Ambiente = Record<string, string | undefined>;

function lerVariavel(env: Ambiente, nome: string): string {
  const valor = env[nome];
  if (!valor) throw new Error(`Variável ${nome} não definida`);
  return valor;
}

/**
 * Lê SEED_USER_1_*, SEED_USER_2_*, ... em sequência e para no primeiro número sem e-mail.
 * Para dar acesso a mais alguém da casa, basta acrescentar o próximo número no .env.
 */
export function lerUsuarios(env: Ambiente): DadosUsuario[] {
  const usuarios: DadosUsuario[] = [];
  for (let n = 1; env[`SEED_USER_${n}_EMAIL`]; n++) {
    usuarios.push({
      email: lerVariavel(env, `SEED_USER_${n}_EMAIL`),
      nome: lerVariavel(env, `SEED_USER_${n}_NOME`),
      senha: lerVariavel(env, `SEED_USER_${n}_SENHA`),
    });
  }
  // Zero usuários quase sempre é .env errado; melhor avisar do que terminar calado.
  if (usuarios.length === 0) throw new Error('Variável SEED_USER_1_EMAIL não definida');
  return usuarios;
}

async function main(): Promise<void> {
  for (const usuario of lerUsuarios(process.env)) {
    await garantirUsuario(usuario);
    console.log(`Usuário garantido: ${usuario.email}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((e: unknown) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
