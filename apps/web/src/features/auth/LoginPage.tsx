import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const { error } = await authClient.signIn.email({ email, password: senha });
      if (error) {
        setErro('E-mail ou senha inválidos');
        return;
      }
      await navigate('/', { replace: true });
    } catch {
      setErro('Não foi possível entrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Contas da Casa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="senha" className="text-sm font-medium">
                Senha
              </label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            {erro && (
              <p role="alert" className="text-destructive text-sm">
                {erro}
              </p>
            )}
            <Button type="submit" disabled={enviando}>
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
