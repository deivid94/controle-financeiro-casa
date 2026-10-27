import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/components/AppLayout';
import { RedirecionarMesAtual } from '@/components/RedirecionarMesAtual';
import { LoginPage } from '@/features/auth/LoginPage';

// Páginas reais chegam nas próximas tarefas; por ora, só o título.
function Pagina({ titulo }: { titulo: string }) {
  return <h1 className="text-xl font-semibold">{titulo}</h1>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <RedirecionarMesAtual /> },
      { path: '/mes/:competencia', element: <Pagina titulo="Mês" /> },
      { path: '/historico', element: <Pagina titulo="Histórico" /> },
      { path: '/contas', element: <Pagina titulo="Contas" /> },
      { path: '/contas/nova', element: <Pagina titulo="Nova conta" /> },
      { path: '/contas/:id', element: <Pagina titulo="Conta" /> },
      { path: '/lancar', element: <Pagina titulo="Lançar" /> },
    ],
  },
]);
