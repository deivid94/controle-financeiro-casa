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

const get = (url: string, headers: Record<string, string> = { cookie }) =>
  app.inject({ method: 'GET', url, headers });

async function criarConta(payload: object, inicioCompetencia?: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/contas',
    headers: { cookie },
    payload,
  });
  expect(res.statusCode).toBe(201);
  const { id } = res.json<{ id: string }>();
  if (inicioCompetencia) {
    await prisma.conta.update({ where: { id }, data: { inicioCompetencia } });
  }
  return id;
}

const fixa = {
  tipo: 'RECORRENTE_FIXA',
  nome: 'Aluguel',
  prioridade: 'ESSENCIAL',
  diaVencimento: 5,
  valorCentavos: 150000,
};

const variavel = {
  tipo: 'RECORRENTE_VARIAVEL',
  nome: 'Luz',
  prioridade: 'IMPORTANTE',
  diaVencimento: 10,
};

describe('GET /api/meses/:competencia', () => {
  it('exige sessão', async () => {
    expect((await get('/api/meses/2026-10', {})).statusCode).toBe(401);
    expect((await get('/api/historico', {})).statusCode).toBe(401);
  });

  it('gera o lançamento da conta FIXA e não duplica sob chamadas paralelas', async () => {
    await criarConta(fixa);
    const [a, b] = await Promise.all([get('/api/meses/2026-10'), get('/api/meses/2026-10')]);
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    expect(a.json().aPagar).toHaveLength(1);
    expect(a.json().aPagar[0]).toMatchObject({
      nome: 'Aluguel',
      tipo: 'RECORRENTE_FIXA',
      valorCentavos: 150000,
      vencimento: '2026-10-05',
      status: 'PENDENTE',
    });
    expect(await prisma.lancamento.count()).toBe(1);
  });

  it('competência além do próximo mês -> 400; próximo mês -> 200', async () => {
    const longe = await get('/api/meses/2026-12');
    expect(longe.statusCode).toBe(400);
    expect(longe.json().erro).toBe('COMPETENCIA_FORA_DO_LIMITE');
    expect((await get('/api/meses/2026-11')).statusCode).toBe(200);
    expect((await get('/api/meses/abc')).statusCode).toBe(400);
  });

  it('pendente de setembro aparece em atrasadas de outubro, não em aPagar', async () => {
    await criarConta(fixa, '2026-09');
    const res = (await get('/api/meses/2026-10')).json();
    expect(res.aPagar.map((i: { competencia: string }) => i.competencia)).toEqual(['2026-10']);
    expect(res.atrasadas.itens.map((i: { competencia: string }) => i.competencia)).toEqual([
      '2026-09',
    ]);
    expect(res.atrasadas.totalCentavos).toBe(150000);
    expect(res.atrasadas.semValor).toBe(0);
  });

  it('atrasadas conta as pendentes sem valor', async () => {
    await criarConta(
      { tipo: 'RECORRENTE_VARIAVEL', nome: 'Luz', prioridade: 'IMPORTANTE', diaVencimento: 10 },
      '2026-09',
    );
    await criarConta(fixa, '2026-09');
    const res = (await get('/api/meses/2026-10')).json();
    expect(res.atrasadas.itens).toHaveLength(2);
    expect(res.atrasadas.semValor).toBe(1);
    expect(res.atrasadas.totalCentavos).toBe(150000);
  });

  it('ver mês passado também gera as atrasadas do mês atual', async () => {
    await criarConta(fixa, '2026-08');
    await get('/api/meses/2026-08');
    expect(await prisma.lancamento.count()).toBe(3);
  });

  it('atrasada paga conta no histórico da sua competência, não na do pagamento', async () => {
    await criarConta(fixa, '2026-09');
    await get('/api/meses/2026-10');
    const setembro = await prisma.lancamento.findFirstOrThrow({
      where: { competencia: '2026-09' },
    });
    await prisma.lancamento.update({
      where: { id: setembro.id },
      data: { status: 'PAGA', pagoEm: new Date() },
    });

    const historico = (await get('/api/historico')).json();
    expect(historico).toEqual([
      { competencia: '2026-10', totalPagoCentavos: 0, totalMesCentavos: 150000 },
      { competencia: '2026-09', totalPagoCentavos: 150000, totalMesCentavos: 150000 },
    ]);
    const mes = (await get('/api/meses/2026-10')).json();
    expect(mes.atrasadas.itens).toEqual([]);
    expect(mes.resumo.totalPagoCentavos).toBe(0);
  });

  it('histórico omite o próximo mês e meses só com canceladas', async () => {
    await criarConta(fixa, '2026-09');
    await get('/api/meses/2026-11');
    const setembro = await prisma.lancamento.findFirstOrThrow({
      where: { competencia: '2026-09' },
    });
    await prisma.lancamento.update({ where: { id: setembro.id }, data: { status: 'CANCELADA' } });
    const historico = (await get('/api/historico')).json();
    expect(historico.map((h: { competencia: string }) => h.competencia)).toEqual(['2026-10']);
  });

  it('variável sem valor traz o valor do mês anterior como estimativa', async () => {
    await criarConta(variavel, '2026-09');
    await get('/api/meses/2026-10');
    await prisma.lancamento.updateMany({
      where: { competencia: '2026-09' },
      data: { valorCentavos: 21000 },
    });
    const res = (await get('/api/meses/2026-10')).json();
    expect(res.aPagar).toHaveLength(1);
    expect(res.aPagar[0]).toMatchObject({ valorCentavos: null, valorEstimadoCentavos: 21000 });
    expect(res.resumo.semValor).toBe(1);
  });

  it('parcelada traz numero, total e faltam', async () => {
    await criarConta({
      tipo: 'PARCELADA',
      nome: 'IPTU',
      prioridade: 'IMPORTANTE',
      diaVencimento: 10,
      valorCentavos: 30000,
      totalParcelas: 10,
      primeiraParcela: '2026-02',
    });
    const res = (await get('/api/meses/2026-10')).json();
    expect(res.aPagar).toHaveLength(1);
    expect(res.aPagar[0].parcela).toEqual({ numero: 9, total: 10, faltam: 2 });
  });

  const iptu = {
    tipo: 'PARCELADA',
    nome: 'IPTU',
    prioridade: 'IMPORTANTE',
    diaVencimento: 10,
    valorCentavos: 30000,
    totalParcelas: 10,
    primeiraParcela: '2026-02',
  };

  it('parcela paga reduz faltam na parcela seguinte', async () => {
    await criarConta(iptu);
    await get('/api/meses/2026-11');
    await prisma.lancamento.updateMany({
      where: { competencia: '2026-10' },
      data: { status: 'PAGA', pagoEm: new Date() },
    });
    const res = (await get('/api/meses/2026-11')).json();
    expect(res.aPagar[0].parcela).toEqual({ numero: 10, total: 10, faltam: 1 });
  });

  it('parcela cancelada continua contando como faltando', async () => {
    await criarConta(iptu);
    await get('/api/meses/2026-11');
    await prisma.lancamento.updateMany({
      where: { competencia: '2026-10' },
      data: { status: 'CANCELADA' },
    });
    const res = (await get('/api/meses/2026-11')).json();
    expect(res.aPagar[0].parcela).toEqual({ numero: 10, total: 10, faltam: 2 });
  });

  it('conta desativada: o pendente já gerado continua e nada novo nasce', async () => {
    const id = await criarConta(fixa);
    await get('/api/meses/2026-10');
    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/contas/${id}`,
      headers: { cookie },
      payload: { ativa: false },
    });
    expect(patch.statusCode).toBe(200);

    const outubro = (await get('/api/meses/2026-10')).json();
    expect(outubro.aPagar).toHaveLength(1);
    const novembro = (await get('/api/meses/2026-11')).json();
    expect(novembro.aPagar).toEqual([]);
    expect(await prisma.lancamento.count()).toBe(1);
  });

  it('cancelada fica fora de aPagar e do resumo e aparece em canceladas', async () => {
    await criarConta(fixa);
    await get('/api/meses/2026-10');
    await prisma.lancamento.updateMany({ data: { status: 'CANCELADA' } });
    const res = (await get('/api/meses/2026-10')).json();
    expect(res.aPagar).toEqual([]);
    expect(res.canceladas).toHaveLength(1);
    expect(res.resumo).toEqual({
      totalPagoCentavos: 0,
      totalPendenteCentavos: 0,
      totalMesCentavos: 0,
      semValor: 0,
    });
  });

  it('pagas trazem quem pagou e vêm ordenadas por pagoEm desc', async () => {
    await criarConta(fixa);
    await criarConta({ ...fixa, nome: 'Internet', valorCentavos: 9000 });
    await get('/api/meses/2026-10');
    const usuario = await prisma.user.findFirstOrThrow();
    const lancs = await prisma.lancamento.findMany({ orderBy: { nome: 'asc' } });
    await prisma.lancamento.update({
      where: { id: lancs[0]!.id },
      data: { status: 'PAGA', pagoEm: new Date('2026-10-10T12:00:00Z'), pagoPorId: usuario.id },
    });
    await prisma.lancamento.update({
      where: { id: lancs[1]!.id },
      data: { status: 'PAGA', pagoEm: new Date('2026-10-15T12:00:00Z'), pagoPorId: usuario.id },
    });
    const res = (await get('/api/meses/2026-10')).json();
    expect(res.pagas.map((p: { nome: string }) => p.nome)).toEqual(['Internet', 'Aluguel']);
    expect(res.pagas[0].pagoPor).toEqual({ id: usuario.id, nome: usuario.name });
  });
});
