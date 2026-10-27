import type { MesView, StatusLancamento } from '@casa/shared';

export function resumirMes(
  itensDoMes: { status: StatusLancamento; valorCentavos: number | null }[],
): MesView['resumo'] {
  let totalPagoCentavos = 0;
  let totalPendenteCentavos = 0;
  let semValor = 0;

  for (const item of itensDoMes) {
    if (item.status === 'CANCELADA') continue;
    if (item.status === 'PAGA') {
      totalPagoCentavos += item.valorCentavos ?? 0;
    } else if (item.valorCentavos === null) {
      semValor += 1;
    } else {
      totalPendenteCentavos += item.valorCentavos;
    }
  }

  return {
    totalPagoCentavos,
    totalPendenteCentavos,
    totalMesCentavos: totalPagoCentavos + totalPendenteCentavos,
    semValor,
  };
}
