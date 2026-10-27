export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    public readonly mensagem?: string,
  ) {
    super(mensagem ?? codigo);
    this.name = 'ApiError';
  }
}

/** Corpo de erro da API: `{ erro, mensagem?, detalhes? }`. */
type CorpoErro = { erro?: string; mensagem?: string };

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const resposta = await fetch(path, { ...init, headers, credentials: 'include' });

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => ({}))) as CorpoErro;
    if (resposta.status === 401 && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
    throw new ApiError(resposta.status, corpo.erro ?? 'ERRO_DESCONHECIDO', corpo.mensagem);
  }

  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}
