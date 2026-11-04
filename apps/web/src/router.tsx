import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '@/components/AppLayout';
import { RedirecionarMesAtual } from '@/components/RedirecionarMesAtual';
import { LoginPage } from '@/features/auth/LoginPage';
import { ContaEditarPage } from '@/features/contas/ContaEditarPage';
import { ContasPage } from '@/features/contas/ContasPage';
import { EsporadicaForm } from '@/features/esporadica/EsporadicaForm';
import { HistoricoPage } from '@/features/historico/HistoricoPage';
import { MesPage } from '@/features/mes/MesPage';
import { NovaContaPage } from '@/features/nova/NovaContaPage';
import { NovaPage } from '@/features/nova/NovaPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <RedirecionarMesAtual /> },
      { path: '/mes/:competencia', element: <MesPage /> },
      { path: '/historico', element: <HistoricoPage /> },
      { path: '/contas', element: <ContasPage /> },
      { path: '/contas/:id', element: <ContaEditarPage /> },
      // Criação unificada (issue #4): /nova pergunta a frequência e leva a um dos formulários.
      { path: '/nova', element: <NovaPage /> },
      { path: '/nova/avulsa', element: <EsporadicaForm /> },
      { path: '/nova/recorrente', element: <NovaContaPage /> },
      // Endereços antigos: redirecionam para não quebrar favoritos nem o app instalado.
      // `/contas/nova` precisa vir declarado para não cair em `/contas/:id` com id "nova".
      { path: '/lancar', element: <Navigate to="/nova/avulsa" replace /> },
      { path: '/contas/nova', element: <Navigate to="/nova/recorrente" replace /> },
    ],
  },
]);
