import { CalendarDays, Layers, Repeat, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/card';

type Opcao = { to: string; titulo: string; descricao: string; Icone: LucideIcon };

/**
 * Ponto único de criação (issue #4). Em vez de dois botões na barra ("Lançar" e
 * "Contas") que pareciam fazer a mesma coisa, a pessoa responde uma pergunta só:
 * com que frequência a conta aparece. Cada resposta leva ao formulário que já existia.
 */
const OPCOES: Opcao[] = [
  {
    to: '/nova/avulsa',
    titulo: 'Só este mês',
    descricao: 'Conserto, compra pontual. Aparece só no mês do vencimento.',
    Icone: CalendarDays,
  },
  {
    to: '/nova/recorrente',
    titulo: 'Todo mês',
    descricao: 'Luz, água, internet. Aparece sozinha todo mês.',
    Icone: Repeat,
  },
  {
    to: '/nova/recorrente?tipo=PARCELADA',
    titulo: 'Parcelada',
    descricao: 'Compra em várias vezes. Aparece até a última parcela.',
    Icone: Layers,
  },
];

export function NovaPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Com que frequência?</h1>
      <nav className="grid gap-3" aria-label="Tipo de conta">
        {OPCOES.map(({ to, titulo, descricao, Icone }) => (
          <Link key={to} to={to} className="block">
            <Card className="flex-row items-center gap-4 p-4">
              <Icone className="text-muted-foreground size-6 shrink-0" aria-hidden />
              <div className="grid gap-0.5">
                <span className="font-medium">{titulo}</span>
                <span className="text-muted-foreground text-sm">{descricao}</span>
              </div>
            </Card>
          </Link>
        ))}
      </nav>
    </div>
  );
}
