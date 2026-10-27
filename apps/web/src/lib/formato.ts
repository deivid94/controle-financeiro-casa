/** "outubro de 2026"; UTC dos dois lados para não deslocar o mês por fuso. */
export function nomeDoMes(competencia: string): string {
  const data = new Date(
    Date.UTC(Number(competencia.slice(0, 4)), Number(competencia.slice(5, 7)) - 1, 1),
  );
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(data);
}

const fusoSaoPaulo = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Hoje (`AAAA-MM-DD`) no fuso de São Paulo. */
export function hojeSaoPaulo(agora: Date = new Date()): string {
  return fusoSaoPaulo.format(agora);
}
