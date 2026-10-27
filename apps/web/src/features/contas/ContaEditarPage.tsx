import { useParams } from 'react-router';
import { ContaForm } from './ContaForm';
import { useContas } from './queries';

/** A API não tem GET por id: a conta vem da lista de /api/contas. */
export function ContaEditarPage() {
  const { id } = useParams();
  const { data, isPending } = useContas();
  if (isPending) return <p className="text-muted-foreground">Carregando…</p>;
  const conta = data?.find((c) => c.id === id);
  if (!conta) return <p role="alert">Conta não encontrada.</p>;
  return <ContaForm conta={conta} />;
}
