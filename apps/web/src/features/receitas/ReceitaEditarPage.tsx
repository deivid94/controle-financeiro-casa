import { useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { ReceitaForm } from './ReceitaForm';
import { useEditarReceita, useReceitas } from './queries';

/** A API não tem GET por id: a receita vem da lista de /api/receitas (como em ContaEditarPage). */
export function ReceitaEditarPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isPending } = useReceitas();
  const editar = useEditarReceita();
  if (isPending) return <p className="text-muted-foreground">Carregando…</p>;
  const receita = data?.find((r) => r.id === id);
  if (!receita) return <p role="alert">Receita não encontrada.</p>;

  const voltar = { onSuccess: () => void navigate('/contas') };

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Editar receita</h1>
      <ReceitaForm
        inicial={{
          nome: receita.nome,
          valorCentavos: receita.valorCentavos,
          diaRecebimento: receita.diaRecebimento,
        }}
        enviando={editar.isPending}
        avisoValor="O novo valor vale a partir deste mês. Meses já ajustados à mão não mudam."
        onEnviar={(dados) => editar.mutate({ id: receita.id, dados }, voltar)}
      />
      <Button
        type="button"
        variant="outline"
        disabled={editar.isPending}
        onClick={() => editar.mutate({ id: receita.id, dados: { ativa: !receita.ativa } }, voltar)}
      >
        {receita.ativa ? 'Desativar' : 'Reativar'}
      </Button>
    </div>
  );
}
