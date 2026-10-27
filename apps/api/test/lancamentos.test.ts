import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import * as repository from '../src/modules/lancamentos/repository.js';
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

const chamar = (
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  payload?: object,
  headers: Record<string, string> = { cookie },
) => app.inject({ method, url, headers, ...(payload ? { payload } : {}) });

const esporadica = {
  nome: 'Dentista',
  valorCentavos: 25000,
  vencimento: '2026-10-25',
  prioridade: 'NORMAL',
};

async function criarEsporadica(extra: object = {}): Promise<string> {
  const res = await chamar('POST', '/api/lancamentos', { ...esporadica, ...extra });
  expect(res.statusCode).toBe(201);
  return res.json<{ id: string }>().id;
}

async function criarVariavel(): Promise<string> {
  const conta = await chamar('POST', '/api/contas', {
    tipo: 'RECORRENTE_VARIAVEL',
    nome: 'Luz',
    prioridade: 'IMPORTANTE',
    diaVencimento: 10,
  });
  expect(conta.statusCode).toBe(201);
  const mes = (await chamar('GET', '/api/meses/2026-10')).json();
  return mes.aPagar[0].id as string;
}

describe('POST /api/lancamentos (esporádica)', () => {
  it('exige sessão', async () => {
    expect((await chamar('POST', '/api/lancamentos', esporadica, {})).statusCode).toBe(401);
  });

  it('cria com a competência do vencimento', async () => {
    const res = await chamar('POST', '/api/lancamentos', {
      ...esporadica,
      vencimento: '2026-11-03',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      competencia: '2026-11',
      vencimento: '2026-11-03',
      tipo: 'ESPORADICA',
      contaId: null,
      status: 'PENDENTE',
      valorCentavos: 25000,
    });
  });

  it('permite duas esporádicas no mesmo mês', async () => {
    await criarEsporadica();
    await criarEsporadica();
    expect(await prisma.lancamento.count({ where: { competencia: '2026-10' } })).toBe(2);
  });

  it('competência além do próximo mês → 400', async () => {
    const res = await chamar('POST', '/api/lancamentos', {
      ...esporadica,
      vencimento: '2026-12-01',
    });
    expect(res.statusCode).toBe(400);
  });

  it.each([0, 1.5])('valorCentavos %s → 400', async (valorCentavos) => {
    const res = await chamar('POST', '/api/lancamentos', { ...esporadica, valorCentavos });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/lancamentos/:id/pagar', () => {
  it('exige sessão e 404 se não existe', async () => {
    expect((await chamar('POST', '/api/lancamentos/x/pagar', {}, {})).statusCode).toBe(401);
    const res = await chamar('POST', '/api/lancamentos/x/pagar', {});
    expect(res.statusCode).toBe(404);
    expect(res.json().erro).toBe('LANCAMENTO_NAO_ENCONTRADO');
  });

  it('esporádica já tem valor: paga sem enviar valor', async () => {
    const id = await criarEsporadica();
    const res = await chamar('POST', `/api/lancamentos/${id}/pagar`, {});
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: 'PAGA',
      valorCentavos: 25000,
      pagoPor: { nome: 'Usuário Um' },
    });
    expect(res.json().pagoEm).toBe('2026-10-20T15:00:00.000Z');
  });

  it('variável sem valor → 422 VALOR_OBRIGATORIO e nada muda', async () => {
    const id = await criarVariavel();
    const res = await chamar('POST', `/api/lancamentos/${id}/pagar`, {});
    expect(res.statusCode).toBe(422);
    expect(res.json().erro).toBe('VALOR_OBRIGATORIO');
    expect((await prisma.lancamento.findUniqueOrThrow({ where: { id } })).status).toBe('PENDENTE');
  });

  it('variável com valor → PAGA com o valor', async () => {
    const id = await criarVariavel();
    const res = await chamar('POST', `/api/lancamentos/${id}/pagar`, { valorCentavos: 18990 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'PAGA', valorCentavos: 18990 });
  });

  it.each([0, 1.5])('valorCentavos %s → 400', async (valorCentavos) => {
    const id = await criarEsporadica();
    const res = await chamar('POST', `/api/lancamentos/${id}/pagar`, { valorCentavos });
    expect(res.statusCode).toBe(400);
  });

  it('já PAGA → 200 idempotente, sem alterar nada', async () => {
    const id = await criarEsporadica();
    await chamar('POST', `/api/lancamentos/${id}/pagar`, {});
    const antes = await prisma.lancamento.findUniqueOrThrow({ where: { id } });
    vi.setSystemTime(new Date('2026-10-21T12:00:00-03:00'));
    const cookie2 = await loginComo(app, 2);
    const res = await chamar(
      'POST',
      `/api/lancamentos/${id}/pagar`,
      { valorCentavos: 99 },
      { cookie: cookie2 },
    );
    expect(res.statusCode).toBe(200);
    expect(await prisma.lancamento.findUniqueOrThrow({ where: { id } })).toEqual(antes);
  });

  it('CANCELADA → 409 LANCAMENTO_CANCELADO', async () => {
    const id = await criarEsporadica();
    await chamar('POST', `/api/lancamentos/${id}/cancelar`);
    const res = await chamar('POST', `/api/lancamentos/${id}/pagar`, {});
    expect(res.statusCode).toBe(409);
    expect(res.json().erro).toBe('LANCAMENTO_CANCELADO');
  });

  it('dois usuários pagando ao mesmo tempo: ambos 200 e um único pagador consistente', async () => {
    const cookie2 = await loginComo(app, 2);
    const id = await criarEsporadica();

    // Torna a corrida determinística: a 1ª escrita a chegar espera a 2ª terminar.
    // Sem o `where status = PENDENTE`, a 1ª sobrescreveria o pagador da 2ª.
    const original = repository.marcarComoPaga;
    let chamadas = 0;
    let vencedor: string | undefined;
    let liberar!: () => void;
    const segundaTerminou = new Promise<void>((resolve) => (liberar = resolve));
    const espiao = vi.spyOn(repository, 'marcarComoPaga').mockImplementation(async (...args) => {
      chamadas += 1;
      if (chamadas === 1) {
        await segundaTerminou;
        return original(...args);
      }
      vencedor = args[1].pagoPorId;
      const resultado = await original(...args);
      liberar();
      return resultado;
    });

    try {
      const [a, b] = await Promise.all([
        chamar('POST', `/api/lancamentos/${id}/pagar`, {}, { cookie }),
        chamar('POST', `/api/lancamentos/${id}/pagar`, {}, { cookie: cookie2 }),
      ]);
      expect(chamadas).toBe(2);
      expect(a.statusCode).toBe(200);
      expect(b.statusCode).toBe(200);
      const banco = await prisma.lancamento.findUniqueOrThrow({ where: { id } });
      expect(banco.status).toBe('PAGA');
      // Quem escreveu primeiro (a 2ª chamada, liberada antes) tem de continuar sendo o pagador.
      expect(banco.pagoPorId).toBe(vencedor);
      expect(a.json().pagoPor.id).toBe(banco.pagoPorId);
      expect(b.json().pagoPor.id).toBe(banco.pagoPorId);
    } finally {
      espiao.mockRestore();
    }
  });
});

describe('POST /api/lancamentos/:id/desfazer', () => {
  it('PAGA → PENDENTE limpando pagoEm/pagoPor e mantendo o valor', async () => {
    const id = await criarVariavel();
    await chamar('POST', `/api/lancamentos/${id}/pagar`, { valorCentavos: 18990 });
    const res = await chamar('POST', `/api/lancamentos/${id}/desfazer`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: 'PENDENTE',
      pagoEm: null,
      pagoPor: null,
      valorCentavos: 18990,
    });
  });

  it('CANCELADA → PENDENTE', async () => {
    const id = await criarEsporadica();
    await chamar('POST', `/api/lancamentos/${id}/cancelar`);
    const res = await chamar('POST', `/api/lancamentos/${id}/desfazer`);
    expect(res.json().status).toBe('PENDENTE');
  });

  it('404 se não existe', async () => {
    expect((await chamar('POST', '/api/lancamentos/x/desfazer')).statusCode).toBe(404);
  });
});

describe('POST /api/lancamentos/:id/cancelar', () => {
  it('PENDENTE → CANCELADA e reabrir o mês não recria', async () => {
    await chamar('POST', '/api/contas', {
      tipo: 'RECORRENTE_FIXA',
      nome: 'Aluguel',
      prioridade: 'ESSENCIAL',
      diaVencimento: 5,
      valorCentavos: 150000,
    });
    const mes = (await chamar('GET', '/api/meses/2026-10')).json();
    const id = mes.aPagar[0].id as string;

    const res = await chamar('POST', `/api/lancamentos/${id}/cancelar`);
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('CANCELADA');

    const reaberto = (await chamar('GET', '/api/meses/2026-10')).json();
    expect(reaberto.aPagar).toHaveLength(0);
    expect(reaberto.canceladas).toHaveLength(1);
    expect(await prisma.lancamento.count()).toBe(1);
  });

  it('PAGA → 409 LANCAMENTO_PAGO', async () => {
    const id = await criarEsporadica();
    await chamar('POST', `/api/lancamentos/${id}/pagar`, {});
    const res = await chamar('POST', `/api/lancamentos/${id}/cancelar`);
    expect(res.statusCode).toBe(409);
    expect(res.json().erro).toBe('LANCAMENTO_PAGO');
  });

  it('404 se não existe', async () => {
    expect((await chamar('POST', '/api/lancamentos/x/cancelar')).statusCode).toBe(404);
  });
});

describe('PATCH /api/lancamentos/:id', () => {
  it('edita campos; mudar o vencimento dentro do mês mantém a competência', async () => {
    const id = await criarEsporadica();
    const res = await chamar('PATCH', `/api/lancamentos/${id}`, {
      nome: 'Dentista (retorno)',
      valorCentavos: 30000,
      vencimento: '2026-10-28',
      observacao: 'levar exames',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      nome: 'Dentista (retorno)',
      valorCentavos: 30000,
      vencimento: '2026-10-28',
      competencia: '2026-10',
      observacao: 'levar exames',
    });
  });

  it('vencimento em outro mês → 400 VENCIMENTO_FORA_DA_COMPETENCIA e nada muda', async () => {
    const id = await criarEsporadica();
    const res = await chamar('PATCH', `/api/lancamentos/${id}`, { vencimento: '2026-11-02' });
    expect(res.statusCode).toBe(400);
    expect(res.json().erro).toBe('VENCIMENTO_FORA_DA_COMPETENCIA');
    const salvo = await prisma.lancamento.findUniqueOrThrow({ where: { id } });
    expect(salvo.vencimento).toBe('2026-10-25');
  });

  it('campo desconhecido → 400', async () => {
    const id = await criarEsporadica();
    const res = await chamar('PATCH', `/api/lancamentos/${id}`, { status: 'PAGA' });
    expect(res.statusCode).toBe(400);
  });

  it('404 se não existe', async () => {
    const res = await chamar('PATCH', '/api/lancamentos/x', { nome: 'a' });
    expect(res.statusCode).toBe(404);
    expect(res.json().erro).toBe('LANCAMENTO_NAO_ENCONTRADO');
  });
});
