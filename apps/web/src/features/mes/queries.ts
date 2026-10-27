import type { LancamentoItem, MesView } from '@casa/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';

export function useMes(competencia: string) {
  return useQuery({
    queryKey: ['mes', competencia],
    queryFn: () => api<MesView>(`/api/meses/${competencia}`),
  });
}

function invalidar(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ['mes'] }),
    client.invalidateQueries({ queryKey: ['historico'] }),
  ]);
}

/**
 * Toda mutação invalida todos os meses (pagar uma atrasada muda o total de outro mês)
 * e o histórico. Os toasts de sucesso ficam aqui (callback do hook) porque callbacks de
 * `mutate()` não disparam se o componente desmontar antes da resposta, o que acontece
 * quando a lista é recarregada e o card muda de seção.
 */
function useMutacaoLancamento<V extends { id: string }>(
  mutationFn: (vars: V) => Promise<LancamentoItem>,
  aoSucesso?: (vars: V, client: QueryClient) => void,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_dados, vars) => {
      aoSucesso?.(vars, client);
      return invalidar(client);
    },
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

type Alvo = { id: string; nome: string };

export function usePagar() {
  return useMutacaoLancamento(
    ({ id, valorCentavos }: Alvo & { valorCentavos?: number }) =>
      post(id, 'pagar', valorCentavos === undefined ? {} : { valorCentavos }),
    ({ id, nome }, client) =>
      toast(`${nome} paga`, {
        action: {
          label: 'Desfazer',
          onClick: () => {
            // Não usa hooks: o componente que pagou pode já ter sido desmontado.
            post(id, 'desfazer')
              .then(() => invalidar(client))
              .catch((erro: unknown) =>
                toast.error(
                  erro instanceof ApiError && erro.mensagem ? erro.mensagem : 'Algo deu errado',
                ),
              );
          },
        },
      }),
  );
}

export function useDesfazer() {
  return useMutacaoLancamento(
    ({ id }: Alvo) => post(id, 'desfazer'),
    ({ nome }) => toast(`${nome} voltou para pendente`),
  );
}

export function useCancelar() {
  return useMutacaoLancamento(
    ({ id }: Alvo) => post(id, 'cancelar'),
    ({ nome }) => toast(`${nome} cancelada`),
  );
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
