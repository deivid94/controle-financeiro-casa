import type { Prioridade, TipoConta } from '@casa/shared';

export const ROTULO_TIPO: Record<TipoConta, string> = {
  RECORRENTE_VARIAVEL: 'Variável (valor muda todo mês)',
  RECORRENTE_FIXA: 'Fixa (mesmo valor todo mês)',
  PARCELADA: 'Parcelada',
};

export const ROTULO_TIPO_CURTO: Record<TipoConta, string> = {
  RECORRENTE_VARIAVEL: 'Variável',
  RECORRENTE_FIXA: 'Fixa',
  PARCELADA: 'Parcelada',
};

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  ESSENCIAL: 'Essencial',
  IMPORTANTE: 'Importante',
  NORMAL: 'Normal',
};
