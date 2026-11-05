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
    url: '/api/receitas',
    headers: { cookie },
    payload: payload as object,
  });

const patch = (id: string, payload: unknown) =>
  app.inject({
    method: 'PATCH',
    url: `/api/receitas/${id}`,
    headers: { cookie },
    payload: payload as object,
  });

/** Cria a receita pela API e insere as ocorrências (a geração via /api/meses é da Task 5). */
async function receitaComOcorrencias(competencias: string[], valorCentavos = 150000) {
  const res = await post({ nome: 'Salário', valorCentavos, diaRecebimento: 5 });
  const receita = res.json<{ id: string }>();
  await prisma.recebimento.createMany({
    data: competencias.map((competencia) => ({
      receitaId: receita.id,
      nome: 'Salário',
      competencia,
      data: `${competencia}-05`,
      valorCentavos,
    })),
  });
  return receita.id;
}

const ocorrencias = (receitaId: string) =>
  prisma.recebimento.findMany({ where: { receitaId }, orderBy: { competencia: 'asc' } });

describe('autenticação', () => {
  it('sem cookie retorna 401 em GET, POST e PATCH', async () => {
    const get = await app.inject({ method: 'GET', url: '/api/receitas' });
    const criar = await app.inject({ method: 'POST', url: '/api/receitas', payload: {} });
    const editar = await app.inject({ method: 'PATCH', url: '/api/receitas/x', payload: {} });
    expect([get.statusCode, criar.statusCode, editar.statusCode]).toEqual([401, 401, 401]);
  });
});

describe('POST /api/receitas', () => {
  it('cria receita ativa com início no mês atual', async () => {
    const res = await post({ nome: 'Salário', valorCentavos: 150000, diaRecebimento: 5 });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      nome: 'Salário',
      valorCentavos: 150000,
      diaRecebimento: 5,
      ativa: true,
      inicioCompetencia: '2026-10',
    });
  });

  it('rejeita valor 0', async () => {
    const res = await post({ nome: 'Salário', valorCentavos: 0, diaRecebimento: 5 });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/receitas', () => {
  it('lista ativas primeiro, depois por nome', async () => {
    await post({ nome: 'Zeta', valorCentavos: 100, diaRecebimento: 1 });
    await post({ nome: 'Beta', valorCentavos: 100, diaRecebimento: 1 });
    const inativa = (await post({ nome: 'Alfa', valorCentavos: 100, diaRecebimento: 1 })).json<{
      id: string;
    }>();
    await patch(inativa.id, { ativa: false });
    const res = await app.inject({ method: 'GET', url: '/api/receitas', headers: { cookie } });
    expect(res.json<{ nome: string }[]>().map((r) => r.nome)).toEqual(['Beta', 'Zeta', 'Alfa']);
  });
});

describe('PATCH /api/receitas/:id', () => {
  it('novo valor vale do mês atual em diante, sem mexer no passado', async () => {
    const id = await receitaComOcorrencias(['2026-09', '2026-10', '2026-11']);
    const res = await patch(id, { valorCentavos: 160000 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ valorCentavos: 160000 });
    const linhas = await ocorrencias(id);
    expect(linhas.map((l) => [l.competencia, l.valorCentavos])).toEqual([
      ['2026-09', 150000],
      ['2026-10', 160000],
      ['2026-11', 160000],
    ]);
  });

  it('não sobrescreve ocorrência já ajustada manualmente', async () => {
    const id = await receitaComOcorrencias(['2026-10', '2026-11']);
    await prisma.recebimento.updateMany({
      where: { receitaId: id, competencia: '2026-10' },
      data: { valorCentavos: 0 },
    });
    await patch(id, { valorCentavos: 160000 });
    const linhas = await ocorrencias(id);
    expect(linhas.map((l) => [l.competencia, l.valorCentavos])).toEqual([
      ['2026-10', 0],
      ['2026-11', 160000],
    ]);
  });

  it('renomeia as ocorrências do mês atual em diante', async () => {
    const id = await receitaComOcorrencias(['2026-09', '2026-10', '2026-11']);
    await patch(id, { nome: 'Salário CLT' });
    expect((await ocorrencias(id)).map((l) => l.nome)).toEqual([
      'Salário',
      'Salário CLT',
      'Salário CLT',
    ]);
  });

  it('recalcula a data das ocorrências pelo novo dia', async () => {
    const id = await receitaComOcorrencias(['2026-09', '2026-10', '2026-11']);
    await patch(id, { diaRecebimento: 31 });
    expect((await ocorrencias(id)).map((l) => l.data)).toEqual([
      '2026-09-05',
      '2026-10-31',
      '2026-11-30',
    ]);
  });

  it('desativar apaga só as ocorrências futuras', async () => {
    const id = await receitaComOcorrencias(['2026-10', '2026-11']);
    const res = await patch(id, { ativa: false });
    expect(res.json()).toMatchObject({ ativa: false });
    expect((await ocorrencias(id)).map((l) => l.competencia)).toEqual(['2026-10']);
  });

  it('desativar e reativar no mesmo mês mantém uma ocorrência só', async () => {
    const id = await receitaComOcorrencias(['2026-10', '2026-11']);
    await patch(id, { ativa: false });
    const res = await patch(id, { ativa: true });
    expect(res.json()).toMatchObject({ ativa: true, inicioCompetencia: '2026-10' });
    const total = await prisma.recebimento.count({
      where: { receitaId: id, competencia: '2026-10' },
    });
    expect(total).toBe(1);
  });

  it('reativar em outro mês move o início para o mês atual', async () => {
    const id = await receitaComOcorrencias(['2026-10']);
    await patch(id, { ativa: false });
    vi.setSystemTime(new Date('2027-03-10T12:00:00-03:00'));
    // A sessão do cookie antigo expira com o salto no tempo: loga de novo.
    cookie = await loginComo(app, 1);
    const res = await patch(id, { ativa: true });
    expect(res.json()).toMatchObject({ ativa: true, inicioCompetencia: '2027-03' });
  });

  it('campo desconhecido retorna 400', async () => {
    const id = await receitaComOcorrencias([]);
    expect((await patch(id, { tipo: 'X' })).statusCode).toBe(400);
  });

  it('id inexistente retorna 404', async () => {
    const res = await patch('nao-existe', { nome: 'X' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ erro: 'RECEITA_NAO_ENCONTRADA' });
  });
});
