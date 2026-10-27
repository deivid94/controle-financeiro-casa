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

function lerVariavel(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável ${nome} não definida`);
  return valor;
}

async function main(): Promise<void> {
  for (const n of [1, 2]) {
    const usuario = {
      email: lerVariavel(`SEED_USER_${n}_EMAIL`),
      nome: lerVariavel(`SEED_USER_${n}_NOME`),
      senha: lerVariavel(`SEED_USER_${n}_SENHA`),
    };
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
