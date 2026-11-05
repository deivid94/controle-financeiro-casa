import { competenciaAtual } from '@casa/shared';
import { useNavigate } from 'react-router';
import { ReceitaForm } from './ReceitaForm';
import { useCriarReceita } from './queries';

export function NovaReceitaPage() {
  const navigate = useNavigate();
  const criar = useCriarReceita();
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Receita fixa</h1>
      <ReceitaForm
        enviando={criar.isPending}
        onEnviar={(dados) =>
          criar.mutate(dados, {
            onSuccess: () => void navigate(`/mes/${competenciaAtual()}`),
          })
        }
      />
    </div>
  );
}
