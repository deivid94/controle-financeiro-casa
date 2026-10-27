import { Navigate, Outlet } from 'react-router';
import { BottomNav } from '@/components/BottomNav';
import { authClient } from '@/lib/auth-client';

/** Exige sessão: sem ela, manda para /login. */
export function AppLayout() {
  const { data: sessao, isPending } = authClient.useSession();

  if (isPending) {
    return <p className="p-4 text-sm">Carregando…</p>;
  }
  if (!sessao) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-dvh pb-20">
      <main className="p-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
