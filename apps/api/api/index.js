// Função serverless da Vercel (Framework Preset "Other", ver apps/api/vercel.json).
//
// Por que JavaScript e não TypeScript: o builder da Vercel faz a própria checagem de tipos
// em arquivos .ts e falha com erros que não se reproduzem localmente (tsc, lint e testes
// passam). Então a API é compilada por nós (`tsc`, no buildCommand) para `dist/`, e esta
// função só importa o resultado. É o mesmo app do `src/index.ts` local, sem o `listen`.
import { buildApp } from '../dist/app.js';

// Uma instância por "container" da função: reaproveitada entre requisições enquanto ele
// estiver quente, em vez de montar o Fastify (e a conexão do Prisma) a cada chamada.
let appPronto;

export default async function handler(req, res) {
  appPronto ??= buildApp().then(async (app) => {
    await app.ready();
    return app;
  });
  const app = await appPronto;
  // Entrega a requisição Node crua ao servidor HTTP do Fastify, que roteia normalmente.
  app.server.emit('request', req, res);
}
