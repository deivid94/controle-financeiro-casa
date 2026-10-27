import { competenciaAtual } from '@casa/shared';
import { Navigate } from 'react-router';

/** Calcula o mês atual no momento da navegação (não no carregamento do módulo). */
export function RedirecionarMesAtual() {
  return <Navigate to={`/mes/${competenciaAtual()}`} replace />;
}
