import type { ContaView, CriarContaInput, EditarContaInput } from '@casa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';

export function useContas() {
  return useQuery({
    queryKey: ['contas'],
    queryFn: () => api<ContaView[]>('/api/contas'),
  });
}

function useMutacaoConta<V>(mutationFn: (vars: V) => Promise<ContaView>, mensagem: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast(mensagem);
      // Mudar uma conta muda os lançamentos gerados nos meses.
      return Promise.all([
        client.invalidateQueries({ queryKey: ['contas'] }),
        client.invalidateQueries({ queryKey: ['mes'] }),
        client.invalidateQueries({ queryKey: ['historico'] }),
      ]);
    },
    onError: (erro) => {
      toast.error(erro instanceof ApiError && erro.mensagem ? erro.mensagem : 'Algo deu errado');
    },
  });
}

export function useCriarConta() {
  return useMutacaoConta(
    (corpo: CriarContaInput) =>
      api<ContaView>('/api/contas', { method: 'POST', body: JSON.stringify(corpo) }),
    'Conta cadastrada',
  );
}

export function useEditarConta() {
  return useMutacaoConta(
    ({ id, ...campos }: { id: string } & EditarContaInput) =>
      api<ContaView>(`/api/contas/${id}`, { method: 'PATCH', body: JSON.stringify(campos) }),
    'Conta atualizada',
  );
}
