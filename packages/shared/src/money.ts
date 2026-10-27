/**
 * Converte texto em reais (pt-BR) para centavos. Retorna `null` se inválido ou ≤ 0.
 * Vírgula é sempre decimal; ponto + exatamente 3 dígitos é milhar; ponto é decimal
 * apenas sem vírgula e com 1–2 dígitos depois dele.
 */
export function parseValorBRL(texto: string): number | null {
  const t = texto.replace(/^\s*R\$\s*/i, '').trim();
  let inteiro: string;
  let decimal: string;

  const comVirgula = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(t);
  const comPonto = /^(\d+)\.(\d{1,2})$/.exec(t);
  if (comVirgula) {
    inteiro = (comVirgula[1] ?? '').replaceAll('.', '');
    decimal = comVirgula[2] ?? '';
  } else if (comPonto) {
    inteiro = comPonto[1] ?? '';
    decimal = comPonto[2] ?? '';
  } else {
    return null;
  }

  const centavos = Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos como `R$ 1.234,56` (espaço comum, não o não separável). */
export function formatBRL(centavos: number): string {
  return moeda.format(centavos / 100).replaceAll(' ', ' ');
}
