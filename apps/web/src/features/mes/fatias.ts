export type Fatia = { chave: string; nome: string; valorCentavos: number; cor: string };

type Item = { id: string; nome: string; valorCentavos: number | null };

// A paleta tem 6 cores (--chart-1 ... --chart-6). Com mais de 6 itens,
// as 5 primeiras ficam como estão e a 6a vira "Outros".
const MAX_FATIAS = 6;

const cor = (posicao: number) => `var(--chart-${posicao + 1})`;

export function agruparFatias(itens: Item[]): Fatia[] {
  const ordenados = itens
    .filter(
      (i): i is Item & { valorCentavos: number } => i.valorCentavos !== null && i.valorCentavos > 0,
    )
    .sort((a, b) => b.valorCentavos - a.valorCentavos || a.nome.localeCompare(b.nome, 'pt-BR'));

  const visiveis = ordenados.length <= MAX_FATIAS ? ordenados : ordenados.slice(0, MAX_FATIAS - 1);
  const fatias: Fatia[] = visiveis.map((i, idx) => ({
    chave: i.id,
    nome: i.nome,
    valorCentavos: i.valorCentavos,
    cor: cor(idx),
  }));

  if (ordenados.length > MAX_FATIAS) {
    const resto = ordenados.slice(MAX_FATIAS - 1);
    fatias.push({
      chave: 'outros',
      nome: 'Outros',
      valorCentavos: resto.reduce((soma, i) => soma + i.valorCentavos, 0),
      cor: cor(MAX_FATIAS - 1),
    });
  }
  return fatias;
}
