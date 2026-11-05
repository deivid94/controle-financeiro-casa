import type {
  CriarReceitaInput,
  CriarRecebimentoAvulsoInput,
  EditarReceitaInput,
  EditarRecebimentoInput,
  ReceitaView,
  RecebimentoItem,
} from '@casa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';

export function useReceitas() {
  return useQuery({
    queryKey: ['receitas'],
    queryFn: () => api<ReceitaView[]>('/api/receitas'),
  });
}

/**
 * Toda mutação de receita muda o saldo e os gráficos do mês (`['mes']`) e a lista de
 * receitas (`['receitas']`). Os toasts ficam no hook pelo mesmo motivo de `mes/queries.ts`:
 * callbacks de `mutate()` não disparam se o componente desmontar antes da resposta.
 */
function useMutacaoReceita<V, R>(
  mutationFn: (vars: V) => Promise<R>,
  mensagem: (dados: R) => string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (dados) => {
      toast(mensagem(dados));
      return Promise.all([
        client.invalidateQueries({ queryKey: ['mes'] }),
        client.invalidateQueries({ queryKey: ['receitas'] }),
      ]);
    },
    onError: (erro) => {
      toast.error(erro instanceof ApiError && erro.mensagem ? erro.mensagem : 'Algo deu errado');
    },
  });
}

function enviar<T>(metodo: 'POST' | 'PATCH', path: string, corpo: object) {
  return api<T>(path, { method: metodo, body: JSON.stringify(corpo) });
}

export function useCriarReceita() {
  return useMutacaoReceita(
    (corpo: CriarReceitaInput) => enviar<ReceitaView>('POST', '/api/receitas', corpo),
    (r) => `${r.nome} criada`,
  );
}

export function useEditarReceita() {
  return useMutacaoReceita(
    ({ id, dados }: { id: string; dados: EditarReceitaInput }) =>
      enviar<ReceitaView>('PATCH', `/api/receitas/${id}`, dados),
    (r) => `${r.nome} atualizada`,
  );
}

export function useCriarRecebimento() {
  return useMutacaoReceita(
    (corpo: CriarRecebimentoAvulsoInput) =>
      enviar<RecebimentoItem>('POST', '/api/recebimentos', corpo),
    (r) => `${r.nome} lançada`,
  );
}

export function useEditarRecebimento() {
  return useMutacaoReceita(
    ({ id, dados }: { id: string; dados: EditarRecebimentoInput }) =>
      enviar<RecebimentoItem>('PATCH', `/api/recebimentos/${id}`, dados),
    (r) => `${r.nome} atualizada`,
  );
}

export function useExcluirRecebimento() {
  // DELETE devolve 204 sem corpo; `api()` já trata isso devolvendo `undefined`.
  return useMutacaoReceita(
    (id: string) => api<void>(`/api/recebimentos/${id}`, { method: 'DELETE' }),
    () => 'Recebimento excluído',
  );
}
