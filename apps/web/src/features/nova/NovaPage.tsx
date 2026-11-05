import { CalendarDays, Layers, Repeat, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/card';

type Opcao = { to: string; titulo: string; descricao: string; Icone: LucideIcon };

/**
 * Ponto único de criação (issue #4). Em vez de botões na barra que pareciam fazer a mesma
 * coisa, a pessoa responde uma pergunta só: o que quer lançar. Contas se distinguem pela
 * frequência; receitas são fixas (todo mês) ou só deste mês. Cada resposta leva ao formulário.
 */
const OPCOES_CONTA: Opcao[] = [
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

const OPCOES_RECEITA: Opcao[] = [
  {
    to: '/nova/receita',
    titulo: 'Receita fixa',
    descricao: 'Aluguel, salário. Entra sozinha todo mês.',
    Icone: TrendingUp,
  },
  {
    to: '/nova/receita-avulsa',
    titulo: 'Receita só deste mês',
    descricao: 'Uma venda, um extra. Conta só no mês em que entrou.',
    Icone: Wallet,
  },
];

function Grupo({
  subtitulo,
  rotuloNav,
  opcoes,
}: {
  subtitulo: string;
  rotuloNav: string;
  opcoes: Opcao[];
}) {
  return (
    <section className="grid gap-3">
      <h2 className="text-muted-foreground text-sm font-medium">{subtitulo}</h2>
      <nav className="grid gap-3" aria-label={rotuloNav}>
        {opcoes.map(({ to, titulo, descricao, Icone }) => (
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
    </section>
  );
}

export function NovaPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">O que você quer lançar?</h1>
      <Grupo subtitulo="Conta" rotuloNav="Tipo de conta" opcoes={OPCOES_CONTA} />
      <Grupo subtitulo="Receita" rotuloNav="Tipo de receita" opcoes={OPCOES_RECEITA} />
    </div>
  );
}
