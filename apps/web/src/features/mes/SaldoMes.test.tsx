import type { MesView } from '@casa/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SaldoMes } from './SaldoMes';

const saldo = (saldoCentavos: number): MesView['saldo'] => ({
  receitasCentavos: 450000,
  pagoCentavos: 37000,
  saldoCentavos,
  depoisDeTudoCentavos: 0,
});

describe('SaldoMes', () => {
  it('mostra o saldo positivo e a linha de apoio', () => {
    render(<SaldoMes saldo={saldo(413000)} />);
    expect(screen.getByText('Saldo do mês')).toBeInTheDocument();
    expect(screen.getByText('R$ 4.130,00')).not.toHaveClass('text-destructive');
    expect(screen.getByText(/Entrou R\$ 4\.500,00 − pago R\$ 370,00/)).toBeInTheDocument();
  });

  it('saldo negativo fica vermelho com sinal de menos', () => {
    render(<SaldoMes saldo={saldo(-5000)} />);
    expect(screen.getByText('-R$ 50,00')).toHaveClass('text-destructive');
  });
});
