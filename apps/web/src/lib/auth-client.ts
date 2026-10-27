import { createAuthClient } from 'better-auth/react';

// Sem baseURL: no navegador o Better Auth usa window.location.origin + /api/auth.
// A API é mesma origem (proxy do Vite em dev), então não há CORS.
export const authClient = createAuthClient();
