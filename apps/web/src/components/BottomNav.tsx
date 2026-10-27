import { competenciaAtual } from '@casa/shared';
import { CalendarDays, History, PlusCircle, ReceiptText } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const { pathname } = useLocation();
  const destinos = [
    { to: `/mes/${competenciaAtual()}`, rotulo: 'Mês', Icone: CalendarDays, prefixo: '/mes/' },
    { to: '/lancar', rotulo: 'Lançar', Icone: PlusCircle, prefixo: '/lancar' },
    { to: '/historico', rotulo: 'Histórico', Icone: History, prefixo: '/historico' },
    { to: '/contas', rotulo: 'Contas', Icone: ReceiptText, prefixo: '/contas' },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="bg-background fixed inset-x-0 bottom-0 z-10 flex border-t pb-[env(safe-area-inset-bottom)]"
    >
      {destinos.map(({ to, rotulo, Icone, prefixo }) => {
        // A aba "Mês" fica ativa em qualquer /mes/*, não só no mês atual.
        const ativa = pathname.startsWith(prefixo);
        return (
          <NavLink
            key={rotulo}
            to={to}
            aria-current={ativa ? 'page' : undefined}
            className={cn(
              'flex min-h-14 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 text-xs',
              ativa ? 'text-primary font-semibold' : 'text-muted-foreground',
            )}
          >
            <Icone className="size-5" aria-hidden />
            {rotulo}
          </NavLink>
        );
      })}
    </nav>
  );
}
