import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { criarAppDeTeste, limparBanco, loginComo } from './helpers.js';

let app: FastifyInstance;
let cookie: string;

beforeAll(async () => {
  app = await criarAppDeTeste();
  await app.ready();
});

beforeEach(async () => {
  await limparBanco();
  cookie = await loginComo(app, 1);
  // Só Date é falso: os timers de I/O do Prisma/pg continuam reais.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T12:00:00-03:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const post = (payload: unknown) =>
  app.inject({
    method: 'POST',
    url: '/api/contas',
    headers: { cookie },
    payload: payload as object,
  });

describe('POST /api/contas', () => {
  it('cria conta FIXA', async () => {
    const res = await post({
      tipo: 'RECORRENTE_FIXA',
      nome: 'Aluguel',
      prioridade: 'ESSENCIAL',
      diaVencimento: 5,
      valorCentavos: 150000,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      tipo: 'RECORRENTE_FIXA',
      nome: 'Aluguel',
      valorCentavos: 150000,
      totalParcelas: null,
      primeiraParcela: null,
      linkSegundaVia: null,
      ativa: true,
      inicioCompetencia: '2026-10',
    });
  });

  it('cria conta VARIÁVEL sem valor', async () => {
    const res = await post({
      tipo: 'RECORRENTE_VARIAVEL',
      nome: 'Luz',
      prioridade: 'IMPORTANTE',
      diaVencimento: 10,
      linkSegundaVia: 'https://exemplo.com/luz',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      tipo: 'RECORRENTE_VARIAVEL',
      valorCentavos: null,
      linkSegundaVia: 'https://exemplo.com/luz',
      inicioCompetencia: '2026-10',
    });
  });

  it('cria conta PARCELADA', async () => {
    const res = await post({
      tipo: 'PARCELADA',
      nome: 'Geladeira',
      prioridade: 'NORMAL',
      diaVencimento: 15,
      valorCentavos: 30000,
      totalParcelas: 10,
      primeiraParcela: '2026-09',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      tipo: 'PARCELADA',
      totalParcelas: 10,
      primeiraParcela: '2026-09',
      inicioCompetencia: '2026-10',
    });
  });

  it('PARCELADA sem totalParcelas -> 400', async () => {
    const res = await post({
      tipo: 'PARCELADA',
      nome: 'Geladeira',
      prioridade: 'NORMAL',
      diaVencimento: 15,
      valorCentavos: 30000,
      primeiraParcela: '2026-09',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().erro).toBe('VALIDACAO');
  });
});

describe('GET /api/contas', () => {
  it('lista ativas primeiro, depois por nome', async () => {
    const base = { prioridade: 'NORMAL', diaVencimento: 1 };
    const b = await post({ ...base, tipo: 'RECORRENTE_VARIAVEL', nome: 'B' });
    await post({ ...base, tipo: 'RECORRENTE_VARIAVEL', nome: 'C' });
    await post({ ...base, tipo: 'RECORRENTE_VARIAVEL', nome: 'A' });
    await app.inject({
      method: 'PATCH',
      url: `/api/contas/${b.json().id}`,
      headers: { cookie },
      payload: { ativa: false },
    });
    const res = await app.inject({ method: 'GET', url: '/api/contas', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((c: { nome: string }) => c.nome)).toEqual(['A', 'C', 'B']);
  });
});

describe('PATCH /api/contas/:id', () => {
  const criarFixa = async () =>
    (
      await post({
        tipo: 'RECORRENTE_FIXA',
        nome: 'Internet',
        prioridade: 'IMPORTANTE',
        diaVencimento: 8,
        valorCentavos: 10000,
      })
    ).json();

  const patch = (id: string, payload: unknown) =>
    app.inject({
      method: 'PATCH',
      url: `/api/contas/${id}`,
      headers: { cookie },
      payload: payload as object,
    });

  it('desativa a conta', async () => {
    const conta = await criarFixa();
    const res = await patch(conta.id, { ativa: false });
    expect(res.statusCode).toBe(200);
    expect(res.json().ativa).toBe(false);
  });

  it('campo não permitido (tipo) -> 400', async () => {
    const conta = await criarFixa();
    const res = await patch(conta.id, { tipo: 'PARCELADA' });
    expect(res.statusCode).toBe(400);
  });

  it('conta inexistente -> 404 CONTA_NAO_ENCONTRADA', async () => {
    const res = await patch('nao-existe', { nome: 'X' });
    expect(res.statusCode).toBe(404);
    expect(res.json().erro).toBe('CONTA_NAO_ENCONTRADA');
  });

  it('mudar valor não altera lançamento já gerado', async () => {
    const conta = await criarFixa();
    const lancamento = await prisma.lancamento.create({
      data: {
        contaId: conta.id,
        nome: conta.nome,
        prioridade: conta.prioridade,
        competencia: '2026-10',
        vencimento: '2026-10-08',
        valorCentavos: 10000,
      },
    });
    const res = await patch(conta.id, { valorCentavos: 12000 });
    expect(res.statusCode).toBe(200);
    expect(res.json().valorCentavos).toBe(12000);
    const depois = await prisma.lancamento.findUniqueOrThrow({ where: { id: lancamento.id } });
    expect(depois.valorCentavos).toBe(10000);
  });
});

describe('autenticação', () => {
  it.each([
    ['GET', '/api/contas'],
    ['POST', '/api/contas'],
    ['PATCH', '/api/contas/x'],
  ] as const)('%s %s sem login -> 401', async (method, url) => {
    const res = await app.inject({ method, url, payload: method === 'GET' ? undefined : {} });
    expect(res.statusCode).toBe(401);
  });
});
