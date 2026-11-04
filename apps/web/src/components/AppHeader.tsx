import { competenciaAtual } from '@casa/shared';
import { ArrowLeft, House } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';

/**
 * Barra do topo com "Voltar" e "Início" (issue #6).
 *
 * Por que não basta `navigate(-1)`: se a tela foi aberta direto (link, app instalado
 * recém-aberto), não existe tela anterior *do app*, e voltar no histórico do navegador
 * sairia do app. O React Router marca a primeira entrada do histórico com
 * `location.key === 'default'`; nesse caso mandamos para o início.
 */
export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  // Calculado a cada render (não no carregamento do módulo), para virar o mês à meia-noite.
  const inicio = `/mes/${competenciaAtual()}`;

  // Na tela de início não há para onde voltar nem para onde "ir ao início".
  // "/" conta como início porque só redireciona para lá (evita a barra piscar).
  if (location.pathname === inicio || location.pathname === '/') return null;

  const temTelaAnterior = location.key !== 'default';
  const voltar = () => {
    if (temTelaAnterior) void navigate(-1);
    else void navigate(inicio, { replace: true });
  };

  return (
    <header className="bg-background sticky top-0 z-10 flex items-center justify-between border-b px-2 pt-[env(safe-area-inset-top)]">
      <Button variant="ghost" size="icon" aria-label="Voltar" onClick={voltar}>
        <ArrowLeft className="size-5" aria-hidden />
      </Button>
      <Link
        to={inicio}
        aria-label="Início"
        className={buttonVariants({ variant: 'ghost', size: 'icon' })}
      >
        <House className="size-5" aria-hidden />
      </Link>
    </header>
  );
}
