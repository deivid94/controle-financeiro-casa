import { competenciaAtual } from '@casa/shared';
import { CalendarDays, History, PlusCircle, ReceiptText } from 'lucide-react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const destinos = [
    { to: `/mes/${competenciaAtual()}`, rotulo: 'Mês', Icone: CalendarDays },
    { to: '/lancar', rotulo: 'Lançar', Icone: PlusCircle },
    { to: '/historico', rotulo: 'Histórico', Icone: History },
    { to: '/contas', rotulo: 'Contas', Icone: ReceiptText },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="bg-background fixed inset-x-0 bottom-0 z-10 flex border-t pb-[env(safe-area-inset-bottom)]"
    >
      {destinos.map(({ to, rotulo, Icone }) => (
        <NavLink
          key={rotulo}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex min-h-14 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 text-xs',
              isActive ? 'text-primary font-semibold' : 'text-muted-foreground',
            )
          }
        >
          <Icone className="size-5" aria-hidden />
          {rotulo}
        </NavLink>
      ))}
    </nav>
  );
}
