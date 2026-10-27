import type { LancamentoItem, MesView } from '@casa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';

export function useMes(competencia: string) {
  return useQuery({
    queryKey: ['mes', competencia],
    queryFn: () => api<MesView>(`/api/meses/${competencia}`),
  });
}

/**
 * Toda mutação invalida todos os meses (pagar uma atrasada muda o total de outro mês)
 * e o histórico.
 */
function useMutacaoLancamento<V extends { id: string }>(
  mutationFn: (vars: V) => Promise<LancamentoItem>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['mes'] }),
        client.invalidateQueries({ queryKey: ['historico'] }),
      ]),
    onError: (erro) => {
      toast.error(erro instanceof ApiError && erro.mensagem ? erro.mensagem : 'Algo deu errado');
    },
  });
}

function post(id: string, acao: string, corpo: object = {}) {
  return api<LancamentoItem>(`/api/lancamentos/${id}/${acao}`, {
    method: 'POST',
    body: JSON.stringify(corpo),
  });
}

export function usePagar() {
  return useMutacaoLancamento(({ id, valorCentavos }: { id: string; valorCentavos?: number }) =>
    post(id, 'pagar', valorCentavos === undefined ? {} : { valorCentavos }),
  );
}

export function useDesfazer() {
  return useMutacaoLancamento(({ id }: { id: string }) => post(id, 'desfazer'));
}

export function useCancelar() {
  return useMutacaoLancamento(({ id }: { id: string }) => post(id, 'cancelar'));
}

export function useEditarLancamento() {
  return useMutacaoLancamento(
    ({ id, ...campos }: { id: string; valorCentavos?: number; codigoPagamento?: string | null }) =>
      api<LancamentoItem>(`/api/lancamentos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(campos),
      }),
  );
}
