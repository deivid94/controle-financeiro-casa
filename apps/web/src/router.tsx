import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/components/AppLayout';
import { RedirecionarMesAtual } from '@/components/RedirecionarMesAtual';
import { LoginPage } from '@/features/auth/LoginPage';
import { ContaEditarPage } from '@/features/contas/ContaEditarPage';
import { ContaForm } from '@/features/contas/ContaForm';
import { ContasPage } from '@/features/contas/ContasPage';
import { EsporadicaForm } from '@/features/esporadica/EsporadicaForm';
import { HistoricoPage } from '@/features/historico/HistoricoPage';
import { MesPage } from '@/features/mes/MesPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <RedirecionarMesAtual /> },
      { path: '/mes/:competencia', element: <MesPage /> },
      { path: '/historico', element: <HistoricoPage /> },
      { path: '/contas', element: <ContasPage /> },
      { path: '/contas/nova', element: <ContaForm /> },
      { path: '/contas/:id', element: <ContaEditarPage /> },
      { path: '/lancar', element: <EsporadicaForm /> },
    ],
  },
]);
