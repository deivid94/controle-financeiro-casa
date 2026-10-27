import { z } from 'zod';

/** Competência no formato AAAA-MM. */
export type Competencia = string;

export const competenciaSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const fusoSaoPaulo = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
});

function partes(c: Competencia): { ano: number; mes: number } {
  return { ano: Number(c.slice(0, 4)), mes: Number(c.slice(5, 7)) };
}

function formatar(ano: number, mes: number): Competencia {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

/** Mês atual no fuso de São Paulo, independentemente do fuso do processo. */
export function competenciaAtual(agora: Date = new Date()): Competencia {
  const campos = fusoSaoPaulo.formatToParts(agora);
  const ano = campos.find((p) => p.type === 'year')?.value ?? '';
  const mes = campos.find((p) => p.type === 'month')?.value ?? '';
  return `${ano}-${mes}`;
}

export function somarMeses(c: Competencia, n: number): Competencia {
  const { ano, mes } = partes(c);
  const total = ano * 12 + (mes - 1) + n;
  return formatar(Math.floor(total / 12), (((total % 12) + 12) % 12) + 1);
}

/** `ate − de` em meses; pode ser negativo. */
export function mesesEntre(de: Competencia, ate: Competencia): number {
  const a = partes(de);
  const b = partes(ate);
  return (b.ano - a.ano) * 12 + (b.mes - a.mes);
}

/** Vencimento `AAAA-MM-DD`; o dia é limitado ao último dia do mês. */
export function vencimentoNoMes(c: Competencia, dia: number): string {
  const { ano, mes } = partes(c);
  // Dia 0 do mês seguinte (mes é 1-based, então Date.UTC usa o índice do mês seguinte) é o último dia do mês.
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const d = Math.min(dia, ultimoDia);
  return `${formatar(ano, mes)}-${String(d).padStart(2, '0')}`;
}

/** Competência de uma data `AAAA-MM-DD`. */
export function competenciaDe(data: string): Competencia {
  return data.slice(0, 7);
}
