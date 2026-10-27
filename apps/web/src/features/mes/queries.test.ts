import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePagar } from './queries';

const api = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

describe('usePagar', () => {
  beforeEach(() => {
    api.mockReset();
    toast.mockReset();
  });

  it('invalida todos os meses (e o histórico) depois de pagar', async () => {
    api.mockResolvedValue({});
    const client = new QueryClient();
    client.setQueryData(['mes', '2026-09'], {});
    client.setQueryData(['mes', '2026-10'], {});
    client.setQueryData(['historico'], {});
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(() => usePagar(), { wrapper });

    act(() => result.current.mutate({ id: 'l1', nome: 'Luz' }));

    await waitFor(() => expect(client.getQueryState(['mes', '2026-09'])?.isInvalidated).toBe(true));
    expect(client.getQueryState(['mes', '2026-10'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['historico'])?.isInvalidated).toBe(true);
    expect(api).toHaveBeenCalledWith('/api/lancamentos/l1/pagar', {
      method: 'POST',
      body: '{}',
    });
  });

  it('mostra o toast com Desfazer a partir do hook (não depende do componente montado)', async () => {
    api.mockResolvedValue({});
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { result, unmount } = renderHook(() => usePagar(), { wrapper });

    act(() => result.current.mutate({ id: 'l1', nome: 'Luz' }));
    unmount();

    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    const [mensagem, opcoes] = toast.mock.calls[0] as [
      string,
      { action: { label: string; onClick: () => void } },
    ];
    expect(mensagem).toBe('Luz paga');
    expect(opcoes.action.label).toBe('Desfazer');

    opcoes.action.onClick();
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/api/lancamentos/l1/desfazer', {
        method: 'POST',
        body: '{}',
      }),
    );
  });
});
