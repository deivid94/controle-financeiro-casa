# CLAUDE.md

## Projeto

Controle financeiro da casa: PWA mobile first para listar as contas do mês, ver o que falta pagar na ordem certa e marcar como paga com um toque. Duas pessoas, mesmas permissões, dados compartilhados.

- Spec: `docs/superpowers/specs/2026-10-26-controle-financeiro-design.md`
- Plano: `docs/superpowers/plans/2026-10-26-controle-financeiro.md`

Monorepo pnpm: `apps/api` (Fastify + Prisma + Better Auth), `apps/web` (React + Vite), `packages/shared` (`@casa/shared`: tipos, Zod, datas, dinheiro).

## Comandos

- `docker compose up -d` — Postgres dev (`5432`, banco `casa`) e teste (`5433`, banco `casa_test`)
- `pnpm dev` — sobe api e web
- `pnpm test` — Vitest em todos os pacotes
- `pnpm typecheck` / `pnpm lint` / `pnpm build`

## Convenções

- Dinheiro é sempre inteiro em centavos (`valorCentavos`, `Int` no Prisma). Nunca `float`/`Decimal`.
- Competência é `AAAA-MM`; vencimento é `AAAA-MM-DD` (string, evita bugs de fuso).
- "Mês atual" é calculado em `America/Sao_Paulo`, nunca em UTC.
- Exibição em `pt-BR`: `R$ 1.234,56`.
- Tudo agrega por competência, nunca pela data de pagamento.
- Lançamentos `cancelada` não entram em totais nem em pendentes e nunca são gerados de novo.
- Ordem de pendentes: prioridade (`ESSENCIAL` < `IMPORTANTE` < `NORMAL`), valor desc (sem valor por último), vencimento asc.
- Geração nunca passa de mês atual + 1 (além disso, 400).
- Sem cadastro aberto. Rotas fora de `/api/auth/*` e `/api/health` exigem sessão.
- Segredos só em variáveis de ambiente; `.env*` no `.gitignore` (exceto `.env.example`).
- Nomes de domínio em português sem acento (`Conta`, `Lancamento`, `competencia`); infraestrutura em inglês (`buildApp`, `requireAuth`).
- Bibliotecas: última versão estável; se a doc atual divergir do plano, siga a doc e anote no commit.
- Testes: TDD (teste falhando primeiro), Vitest.

## Sobre quem trabalha aqui

O usuário é dev júnior aprendendo Fastify. Explique o porquê das escolhas não óbvias, em pt-BR, e prefira código legível e em camadas a código "esperto".

## Deploy (Vercel + Neon + GitHub Actions)

Fluxo: `.github/workflows/ci.yml`. Job `test` roda em todo push/PR (postgres:17 na 5433, `pnpm build` -> lint -> typecheck -> test; o build vem antes porque os apps importam o `dist` de `@casa/shared`). Job `deploy` roda só em push na `main`, depois de `test`: `prisma migrate deploy` no Neon (URL direta) e `vercel deploy --prod` da API e do web (build remoto na Vercel). O deploy automático por Git está desligado nos dois `vercel.json`, então produção só sobe com testes verdes.

Desenho same-origin: o web tem rewrite `/api/:path*` -> projeto da API, então o navegador só fala com a origem do web (cookie de sessão first-party, sem CORS). Por isso `BETTER_AUTH_URL` = `WEB_ORIGIN` = URL pública do web.

### Deploy — passos do usuário

Nada abaixo foi feito pelo agente (sem contas/credenciais). Faça nesta ordem:

1. **Neon**: crie o projeto (região próxima, ex. `sa-east-1`/São Paulo se disponível). Copie duas strings: **pooled** (host com `-pooler`, vai em `DATABASE_URL` na Vercel) e **direct** (sem `-pooler`, vai no secret `DIRECT_DATABASE_URL` do GitHub). Ambas com `?sslmode=require`.
2. **Vercel, projeto da API**: Add New Project > importe o repositório. Root Directory `apps/api`. Deixe "Include source files outside of the Root Directory" ligado (padrão). Anote o nome/URL (`https://<api>.vercel.app`).
3. **Vercel, projeto do web**: mesmo repositório, Root Directory `apps/web`, Framework Vite. Antes do primeiro deploy, edite `apps/web/vercel.json` e troque `SEU-PROJETO-API` pela URL real da API (commit).
4. **Git auto-deploy**: já está desligado pelos `vercel.json` (`git.deploymentEnabled: false`). Confirme em Settings > Git de cada projeto.
5. **Env vars do projeto da API** (Production): `DATABASE_URL` (pooled), `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL` e `WEB_ORIGIN` (ambos = URL pública do web, ex. `https://<web>.vercel.app`), `IP_ADDRESS_HEADERS` (ver nota (c): valide antes; o padrão é `x-vercel-forwarded-for`). O web não precisa de env vars.
6. **Secrets no GitHub** (Settings > Secrets and variables > Actions): `VERCEL_TOKEN` (conta Vercel > Tokens), `VERCEL_ORG_ID` (Settings do time/conta), `VERCEL_PROJECT_ID_API`, `VERCEL_PROJECT_ID_WEB` (Settings > General de cada projeto), `DIRECT_DATABASE_URL`.
7. **Migrações compatíveis**: o `migrate deploy` roda antes do deploy da API, então toda migração deve ser retrocompatível com o código anterior (adicione colunas/tabelas antes de remover ou renomear, em duas etapas).
8. **Teste do CI sem deploy**: abra um PR com um teste quebrado de propósito. O job `test` deve falhar e o `deploy` nem rodar. Conserte, push, deve ficar verde. Merge na `main` dispara o deploy.
9. **Seed dos usuários no Neon** (local, uma vez, depois do primeiro deploy e das migrações): no `apps/api/.env` coloque `DATABASE_URL` = URL direta do Neon e os `SEED_USER_*`; rode `pnpm --filter @casa/api seed:users`. Depois restaure o `.env` para o banco local.
10. **Teste de fumaça em produção**: abra a URL do web em dois celulares, instale na tela inicial, logue com cada usuário e pague a mesma conta quase ao mesmo tempo nos dois. Deve ficar paga uma vez só (o segundo recebe a conta já paga, sem duplicar). Confira também que o login persiste (cookie) e que `/api/health` responde via web.

### Notas da verificação de documentação (Context7, 2026-10-27)

- (a) Fastify na Vercel: a doc diz que o entrypoint é detectado automaticamente em `src/index.ts` (também `app`/`server`), chamando `fastify.listen(...)`. Nosso `apps/api/src/index.ts` já faz `listen`. Com Root Directory `apps/api` isso se aplica. Ajustei o `buildCommand` do API para buildar `@casa/shared` e rodar `prisma generate` antes. Não verifiquei na doc se a Vercel exige `.js` vs `.ts` nos imports (usamos `./app.js`, padrão ESM do TS).
- (b) `vercel deploy --prod` no Actions: a doc cobre `vercel pull`/`vercel build`/`deploy --prebuilt`; com `--prebuilt` as variáveis de sistema não existem no build. Escolhi build remoto (`deploy --prod` direto, sem `--prebuilt`) porque o brief pede e evita reproduzir o build do monorepo no runner; `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` por env dispensam `vercel link`. Alternativa se o build remoto falhar: `vercel pull --environment=production`, `vercel build --prod`, `vercel deploy --prebuilt --prod`.
- (c) Rewrite para domínio externo: a doc confirma que o rewrite faz proxy "preservando seu domínio no navegador", então o cookie fica first-party na origem do web. **Não encontrei na doc qual header de IP o projeto da API recebe** através de um rewrite (a doc só diz que a Vercel sobrescreve `x-forwarded-for` para evitar spoofing). O padrão `x-vercel-forwarded-for` é uma suposição NÃO verificada; no proxy interno o IP visto pode ser o do edge do web. Verificar no primeiro deploy (logar headers em rota temporária) e então ajustar `IP_ADDRESS_HEADERS`. Impacto se errado: o rate limit do login passa a contar por IP do proxy (compartilhado), não por cliente. Risco baixo para 2 usuários.
- (d) Limites do Hobby: a consulta não retornou a tabela de limites. Só confirmado: rollback limitado ao deploy de produção imediatamente anterior; funções aceitam uma única região; `maxDuration` configurável. Limites de duração/volume/uso não-comercial NÃO foram verificados: conferir em vercel.com/docs/limits.
- (e) Prisma + Neon: a doc do Prisma 7 mostra `@prisma/adapter-neon` (driver serverless do Neon, `PrismaNeon({ connectionString })`) para Neon; `@prisma/adapter-pg` é o adapter genérico do PostgreSQL. A doc mostrou o pooled (`-pooler`) com adapter-neon. **Recomendação (não aplicada nesta task): avaliar trocar para `@prisma/adapter-neon` na produção.** Por ora segue `adapter-pg` + URL pooled, que funciona via PgBouncer do Neon, mas `pg` em função serverless pode abrir várias conexões; se aparecerem erros de conexão, trocar. Não verifiquei na doc se adapter-pg com pooled é desaconselhado.
