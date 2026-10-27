import type { CriarEsporadicaInput, LancamentoItem } from '@casa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';

export function useCriarEsporadica() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (corpo: CriarEsporadicaInput) =>
      api<LancamentoItem>('/api/lancamentos', { method: 'POST', body: JSON.stringify(corpo) }),
    onSuccess: (item) => {
      toast(`${item.nome} lançada`);
      return Promise.all([
        client.invalidateQueries({ queryKey: ['mes'] }),
        client.invalidateQueries({ queryKey: ['historico'] }),
      ]);
    },
    onError: (erro) => {
      toast.error(erro instanceof ApiError && erro.mensagem ? erro.mensagem : 'Algo deu errado');
    },
  });
}
