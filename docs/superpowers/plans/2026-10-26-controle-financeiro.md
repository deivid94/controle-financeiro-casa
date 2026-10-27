# Controle Financeiro da Casa — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA mobile first para duas pessoas controlarem as contas da casa por mês: o que falta pagar (na ordem certa), marcar como pago com um toque e consultar o histórico por competência.

**Architecture:** Monorepo pnpm com três pacotes: `apps/api` (Fastify 5 em camadas rotas → controller → service → repository, Prisma 7 + Postgres, Better Auth), `apps/web` (React + Vite + Tailwind + shadcn, TanStack Query) e `packages/shared` (schemas Zod, tipos e utilitários de dinheiro e competência, usados pelos dois lados). As regras de negócio (geração dos lançamentos, ordenação, parcelas, resumo) são funções puras em `apps/api/src/domain`, testadas antes de tudo. Em produção, os dois apps são projetos separados na Vercel. O web faz *rewrite* de `/api/*` para a API, então o navegador vê uma origem só e os cookies de sessão são first-party.

**Tech Stack:** Node 22 LTS, pnpm 10, TypeScript (strict), Fastify 5, `@fastify/type-provider-zod`, Zod 4, Prisma 7 com `@prisma/adapter-pg`, PostgreSQL (Neon em produção, Docker local), Better Auth, React 19, Vite, Tailwind 4, shadcn/ui, TanStack Query, React Hook Form, React Router, `vite-plugin-pwa`, Vitest, Testing Library, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-10-26-controle-financeiro-design.md`. Leia a spec antes de qualquer tarefa. Este plano argumenta a partir dela.

## Global Constraints

- Dinheiro é sempre **inteiro em centavos** (`valorCentavos: number`, `Int` no Prisma). Proibido `float`/`Decimal` para valores.
- Competência é string `AAAA-MM`. Vencimento é string `AAAA-MM-DD` (coluna `String` no Prisma, para evitar bugs de fuso; strings nesse formato ordenam corretamente).
- "Mês atual" sempre calculado no fuso `America/Sao_Paulo`, nunca em UTC.
- Exibição em `pt-BR`: `R$ 1.234,56`.
- Tudo agrega por **competência**, nunca pela data de pagamento.
- Lançamentos `cancelada` não entram em nenhum total nem em listas de pendentes e nunca são gerados de novo.
- Ordem de pendentes: prioridade (`ESSENCIAL` < `IMPORTANTE` < `NORMAL`) → valor de ordenação desc (sem valor por último no grupo) → vencimento asc.
- Geração nunca vai além de **mês atual + 1**. Requisições de meses além disso → 400.
- Sem cadastro aberto (`disableSignUp: true`). Todas as rotas fora de `/api/auth/*` e `/api/health` exigem sessão.
- Segredos só em variáveis de ambiente; `.env*` no `.gitignore` (exceto `.env.example`).
- Identificadores de domínio em português sem acento (`Conta`, `Lancamento`, `competencia`, `valorCentavos`), batendo com a spec. Código de infraestrutura em inglês convencional (`buildApp`, `requireAuth`).
- Bibliotecas: instalar a última versão estável no momento da tarefa e conferir peer deps. Quando uma API de biblioteca citada aqui não bater com a doc atual, siga a doc atual e anote no commit.

## Review Focus

1. **Valor digitado em formatos brasileiros** (`1.234,56`, `1234,5`, `R$ 89,90`, `89`): o usuário espera que vire o valor certo em centavos. Lixo, zero e negativo são recusados com mensagem, nunca viram `NaN` ou centavo errado. Teste na Task 3.
2. **Toque duplo ou as duas pessoas pagando a mesma conta ao mesmo tempo**: a conta fica paga uma vez, com o primeiro pagador, e a segunda chamada responde 200 sem alterar nada. Teste na Task 10.
3. **Virada do mês à noite**: em 31/10 às 22h30 em São Paulo (já 01/11 em UTC), o mês atual é `2026-10`. Teste na Task 2.
4. **Pagar uma atrasada**: o valor entra no total do mês dela no histórico, não no mês corrente, e a tela do mês corrente para de mostrá-la. Teste na Task 9 (API) e invalidação de cache na Task 12.
5. **Conta editada ou desativada depois de gerar lançamentos**: os lançamentos já gerados mantêm nome, prioridade e valor antigos. Pendências de conta desativada continuam visíveis. Dia 31 em fevereiro vira 28/29. Teste nas Tasks 6 e 8.

---

## Estrutura de arquivos

```
package.json                     # scripts raiz (dev, build, test, lint, typecheck)
pnpm-workspace.yaml
tsconfig.base.json
docker-compose.yml               # postgres local (dev 5432, test 5433)
.github/workflows/ci.yml
CLAUDE.md
packages/shared/
  src/index.ts                   # reexporta tudo
  src/competencia.ts             # mês atual SP, somar meses, vencimento com clamp
  src/money.ts                   # parseValorBRL, formatBRL
  src/schemas/conta.ts           # Zod: criar/editar conta
  src/schemas/lancamento.ts      # Zod: esporádica, pagar, editar
  src/schemas/views.ts           # tipos de resposta (MesView, LancamentoItem, HistoricoItem)
apps/api/
  prisma/schema.prisma
  prisma.config.ts
  src/index.ts                   # entrypoint (Vercel + local): buildApp().listen
  src/app.ts                     # buildApp(): registra plugins e módulos
  src/env.ts                     # Zod das env vars
  src/lib/prisma.ts
  src/lib/auth.ts                # instância Better Auth
  src/plugins/error-handler.ts
  src/plugins/auth.ts            # rota /api/auth/*, requireAuth, request.user
  src/domain/geracao.ts          # planejarLancamentos (puro)
  src/domain/ordenacao.ts        # compararPendentes (puro)
  src/domain/resumo.ts           # resumirMes, calcularParcela (puro)
  src/modules/contas/{routes,controller,service,repository}.ts
  src/modules/meses/{routes,controller,service,repository}.ts
  src/modules/lancamentos/{routes,controller,service,repository}.ts
  scripts/seed-users.ts
  test/helpers.ts                # app de teste, reset do banco, login
apps/web/
  vercel.json                    # rewrite /api → API
  vite.config.ts                 # proxy /api em dev, PWA
  src/main.tsx, src/router.tsx
  src/lib/api.ts                 # fetch wrapper (credentials, erros)
  src/lib/auth-client.ts
  src/features/auth/LoginPage.tsx
  src/features/mes/{MesPage,LancamentoCard,ValorDialog,ResumoMes}.tsx
  src/features/mes/queries.ts
  src/features/esporadica/EsporadicaForm.tsx
  src/features/contas/{ContasPage,ContaForm}.tsx
  src/features/historico/HistoricoPage.tsx
  src/components/{AppLayout,BottomNav,CopyButton}.tsx
```

Cada módulo da API segue as camadas que o usuário já usa: `routes.ts` declara schemas Zod e liga ao controller. O `controller.ts` traduz HTTP ↔ service, o `service.ts` aplica regras (chama o domínio) e o `repository.ts` é o único lugar que fala com o Prisma.

---

### Task 1: Monorepo, ferramentas, git e CLAUDE.md

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.editorconfig`, `eslint.config.js`, `.prettierrc`, `docker-compose.yml`, `packages/shared/{package.json,tsconfig.json,src/index.ts}`, `packages/shared/src/index.test.ts`, `CLAUDE.md`
- Delete: `src/index.ts` (arquivo vazio criado só para abrir o editor)

**Interfaces:**
- Produces: pacote `@casa/shared` com `build` (tsc → `dist/`, `exports` apontando para `dist`, `types` incluídos). Scripts raiz: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` (roda `-r` respeitando dependências). Serviço `db` do compose em `5432` (dev, banco `casa`) e `db-test` em `5433` (banco `casa_test`), imagem `postgres:17`.

- [ ] **Step 1:** `git init` e `.gitignore` (node_modules, dist, .env*, !.env.example, .vercel, coverage, `apps/api/src/generated`).
- [ ] **Step 2:** workspace pnpm (`apps/*`, `packages/*`), `tsconfig.base.json` com `strict`, `noUncheckedIndexedAccess`, `module`/`moduleResolution` `NodeNext`, `target ES2023`. ESLint flat config com `typescript-eslint` + Prettier.
- [ ] **Step 3: teste de fumaça** em `packages/shared/src/index.test.ts`: `expect(VERSION).toBe('0.1.0')` com `export const VERSION = '0.1.0'` em `index.ts`. Rode `pnpm --filter @casa/shared test` → primeiro FAIL (sem export), depois PASS.
- [ ] **Step 4:** `docker compose up -d` e conferir com `docker compose ps` que os dois Postgres estão `healthy`.
- [ ] **Step 5: CLAUDE.md com o usuário.** Rascunhe: visão do projeto (1 parágrafo + link para spec e plano), comandos (`pnpm dev`, `pnpm test`, `docker compose up -d`), convenções da seção Global Constraints e "o usuário é dev júnior aprendendo Fastify: explique o porquê das escolhas não óbvias". **Pare e peça revisão ao usuário antes de commitar** (a spec diz que é criado junto com ele).
- [ ] **Step 6:** `pnpm lint && pnpm typecheck && pnpm test` passam. Commit `chore: monorepo pnpm com shared, tooling e CLAUDE.md`.

---

### Task 2: Competência e datas (shared)

**Files:**
- Create: `packages/shared/src/competencia.ts`, `packages/shared/src/competencia.test.ts`

**Interfaces:**
- Produces:
  - `type Competencia = string` (formato `AAAA-MM`) e `competenciaSchema` (Zod regex `^\d{4}-(0[1-9]|1[0-2])$`)
  - `competenciaAtual(agora: Date = new Date()): Competencia` (fuso `America/Sao_Paulo`)
  - `somarMeses(c: Competencia, n: number): Competencia`
  - `mesesEntre(de: Competencia, ate: Competencia): number` (`ate − de`, pode ser negativo)
  - `vencimentoNoMes(c: Competencia, dia: number): string` (`AAAA-MM-DD`, dia limitado ao último dia do mês)
  - `competenciaDe(data: string): Competencia` (de `AAAA-MM-DD`)

- [ ] **Step 1: testes que falham**
```ts
it('usa o fuso de São Paulo na virada do mês', () => {
  expect(competenciaAtual(new Date('2026-11-01T01:30:00Z'))).toBe('2026-10');
  expect(competenciaAtual(new Date('2026-11-01T03:30:00Z'))).toBe('2026-11');
});
it('soma meses atravessando o ano', () => {
  expect(somarMeses('2026-11', 3)).toBe('2027-02');
  expect(somarMeses('2026-01', -1)).toBe('2025-12');
});
it('conta meses entre competências', () => {
  expect(mesesEntre('2026-02', '2026-10')).toBe(8);
  expect(mesesEntre('2026-10', '2026-02')).toBe(-8);
});
it('limita o dia ao fim do mês', () => {
  expect(vencimentoNoMes('2027-02', 31)).toBe('2027-02-28');
  expect(vencimentoNoMes('2028-02', 31)).toBe('2028-02-29');
  expect(vencimentoNoMes('2026-10', 6)).toBe('2026-10-06');
});
it('rejeita competência inválida', () => {
  expect(competenciaSchema.safeParse('2026-13').success).toBe(false);
});
```
- [ ] **Step 2:** `pnpm --filter @casa/shared test competencia` → FAIL.
- [ ] **Step 3:** implementar. `competenciaAtual` usa `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' })`. O resto é aritmética de inteiros sobre ano/mês (sem `Date` local).
- [ ] **Step 4:** testes PASS. Commit `feat(shared): utilitários de competência e vencimento`.

---

### Task 3: Dinheiro e schemas Zod (shared)

**Files:**
- Create: `packages/shared/src/money.ts`, `money.test.ts`, `src/schemas/{conta,lancamento,views}.ts`, `src/schemas/schemas.test.ts`; Modify: `src/index.ts`

**Interfaces:**
- Produces:
  - `parseValorBRL(texto: string): number | null` → centavos, ou `null` se inválido/≤ 0
  - `formatBRL(centavos: number): string`
  - `valorCentavosSchema` = `z.number().int().positive()`
  - `prioridadeSchema` = `z.enum(['ESSENCIAL','IMPORTANTE','NORMAL'])`; `tipoContaSchema` = `z.enum(['RECORRENTE_VARIAVEL','RECORRENTE_FIXA','PARCELADA'])`; `statusSchema` = `z.enum(['PENDENTE','PAGA','CANCELADA'])`
  - `criarContaSchema`: `z.discriminatedUnion('tipo', [...])`. Comum: `nome` (1–80, trim), `prioridade`, `diaVencimento` (int 1–31), `linkSegundaVia` (`z.url()` opcional). FIXA: `+ valorCentavos`. PARCELADA: `+ valorCentavos`, `totalParcelas` (int 1–120), `primeiraParcela: competenciaSchema`.
  - `editarContaSchema`: parcial de `{ nome, prioridade, diaVencimento, valorCentavos, linkSegundaVia (nullable), ativa }`. `tipo`, `totalParcelas` e `primeiraParcela` **não** são editáveis (escolha do plano: mudar isso depois de gerar lançamentos quebraria a contagem de parcelas).
  - `criarEsporadicaSchema`: `{ nome, valorCentavos, vencimento: AAAA-MM-DD, prioridade, codigoPagamento?, observacao? }`
  - `pagarSchema`: `{ valorCentavos?: valorCentavosSchema }`
  - `editarLancamentoSchema`: parcial de `{ nome, prioridade, valorCentavos, vencimento, codigoPagamento (nullable), observacao (nullable) }`
  - Em `views.ts` (schemas Zod usados como `response` na API e tipos no web):
    - `LancamentoItem`: `{ id, contaId: string|null, tipo: TipoConta|'ESPORADICA', nome, prioridade, competencia, vencimento, valorCentavos: number|null, valorEstimadoCentavos: number|null, status, pagoEm: string|null (ISO), pagoPor: {id,nome}|null, parcela: {numero,total,faltam}|null, linkSegundaVia: string|null, codigoPagamento: string|null, observacao: string|null }`
    - `MesView`: `{ competencia, resumo: { totalPagoCentavos, totalPendenteCentavos, totalMesCentavos, semValor }, atrasadas: { itens: LancamentoItem[], totalCentavos }, aPagar, pagas, canceladas }`
    - `HistoricoItem`: `{ competencia, totalPagoCentavos, totalMesCentavos }`
    - `ContaView`: os campos da conta + `id`, `ativa`, `inicioCompetencia`

- [ ] **Step 1: testes que falham** (Review Focus 1)
```ts
it.each([
  ['1.234,56', 123456], ['1234,5', 123450], ['R$ 89,90', 8990],
  ['89', 8900], [' 0,99 ', 99], ['1234.56', 123456],
])('parseValorBRL(%s) = %i', (t, c) => expect(parseValorBRL(t)).toBe(c));
it.each(['', 'abc', '0', '0,00', '-5', '1,2,3', '12,345'])('rejeita %s', (t) =>
  expect(parseValorBRL(t)).toBeNull());
it('formata em pt-BR', () => expect(formatBRL(123456)).toBe('R$ 1.234,56'));
it('parcelada exige primeiraParcela e totalParcelas', () => {
  expect(criarContaSchema.safeParse({ tipo: 'PARCELADA', nome: 'IPTU', prioridade: 'IMPORTANTE',
    diaVencimento: 10, valorCentavos: 15000 }).success).toBe(false);
});
it('variável não aceita valorCentavos', () => {
  const r = criarContaSchema.parse({ tipo: 'RECORRENTE_VARIAVEL', nome: 'Luz', prioridade: 'ESSENCIAL',
    diaVencimento: 10, valorCentavos: 100 });
  expect('valorCentavos' in r).toBe(false);
});
```
Regra de `parseValorBRL` para ambiguidade: vírgula é sempre decimal. Ponto seguido de exatamente 3 dígitos é separador de milhar (`1.234,56`, `1.234` → 123400). Ponto é decimal só quando não há vírgula e há 1–2 dígitos depois dele (`1234.56`). Mais de 2 casas decimais → `null`. `formatBRL` usa `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`, normalizando o espaço não separável para espaço comum (o teste compara com espaço comum).
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS.
- [ ] **Step 5:** `pnpm --filter @casa/shared build` gera `dist/` com tipos. Commit `feat(shared): dinheiro em centavos e schemas Zod`.

---

### Task 4: Esqueleto da API (Fastify, Prisma, erros, testes de integração)

**Files:**
- Create: `apps/api/{package.json,tsconfig.json,vitest.config.ts,prisma.config.ts,.env.example}`, `prisma/schema.prisma`, `src/{index,app,env}.ts`, `src/lib/prisma.ts`, `src/plugins/error-handler.ts`, `test/helpers.ts`, `test/health.test.ts`

**Interfaces:**
- Consumes: `@casa/shared` (workspace).
- Produces:
  - `buildApp(opts?: { logger?: boolean }): Promise<FastifyInstance>`, com `validatorCompiler`/`serializerCompiler` de `@fastify/type-provider-zod` e tipagem `withTypeProvider<ZodTypeProvider>()` usada pelos módulos.
  - `env`: `{ DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, WEB_ORIGIN, PORT }` validado com Zod na inicialização.
  - `prisma: PrismaClient` (Prisma 7, generator `prisma-client` com output `src/generated/prisma`, adapter `new PrismaPg({ connectionString: env.DATABASE_URL })`). Escolha do plano: `adapter-pg` em vez de `adapter-neon`, para o mesmo driver funcionar no Postgres local e no Neon (usando a URL *pooled* do Neon em produção). Confirme na doc do Prisma 7 + Neon se isso continua recomendado para Vercel Functions. Se não, troque só `src/lib/prisma.ts`.
  - Error handler: erro de validação Zod → `400 { erro: 'VALIDACAO', detalhes }`; `AppError(status, codigo, mensagem)` → `{ erro: codigo, mensagem }`; resto → 500 sem vazar stack.
  - `class AppError extends Error { constructor(public status: number, public codigo: string, mensagem: string) }` em `src/plugins/error-handler.ts`.
  - Test helpers: `criarAppDeTeste()`, `limparBanco()` (TRUNCATE ... CASCADE em todas as tabelas de domínio e auth). `vitest.config.ts` com `globalSetup` que roda `prisma migrate reset --force --skip-seed` contra `.env.test` (`DATABASE_URL` → porta 5433) e `fileParallelism: false`.
  - Prisma models (o Better Auth adiciona os dele na Task 5):
```prisma
enum Prioridade { ESSENCIAL IMPORTANTE NORMAL }
enum TipoConta { RECORRENTE_VARIAVEL RECORRENTE_FIXA PARCELADA }
enum StatusLancamento { PENDENTE PAGA CANCELADA }

model Conta {
  id                String     @id @default(cuid())
  nome              String
  tipo              TipoConta
  prioridade        Prioridade
  diaVencimento     Int
  valorCentavos     Int?
  totalParcelas     Int?
  primeiraParcela   String?    // AAAA-MM
  inicioCompetencia String     // mês de cadastro (AAAA-MM, fuso SP)
  linkSegundaVia    String?
  ativa             Boolean    @default(true)
  lancamentos       Lancamento[]
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
}

model Lancamento {
  id              String           @id @default(cuid())
  contaId         String?
  conta           Conta?           @relation(fields: [contaId], references: [id])
  nome            String
  prioridade      Prioridade
  competencia     String           // AAAA-MM
  vencimento      String           // AAAA-MM-DD
  valorCentavos   Int?
  numeroParcela   Int?
  status          StatusLancamento @default(PENDENTE)
  pagoEm          DateTime?
  pagoPorId       String?
  codigoPagamento String?
  observacao      String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  @@unique([contaId, competencia])
  @@index([competencia, status])
}
```
(`pagoPorId` vira relação com `User` na Task 5. `@@unique` com `contaId` nulo permite várias esporádicas no mesmo mês, já que no Postgres nulos não colidem.)

- [ ] **Step 1: teste que falha** `test/health.test.ts`: `GET /api/health` → `200 { ok: true }`. Rota com `body` inválido declarada no próprio teste (`z.object({ n: z.number() })`) → `400` com `erro: 'VALIDACAO'`. `AppError(409,'X','m')` lançado numa rota de teste → `409 { erro: 'X', mensagem: 'm' }`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar `buildApp`, env, prisma, error handler, migração inicial (`prisma migrate dev --name init`). `src/index.ts` chama `buildApp()` e `listen({ port: env.PORT, host: '0.0.0.0' })` (formato que a Vercel detecta para Fastify).
- [ ] **Step 4:** `pnpm --filter @casa/api test` PASS. `pnpm --filter @casa/api dev` (tsx watch) responde em `http://localhost:3333/api/health`.
- [ ] **Step 5:** Commit `feat(api): esqueleto Fastify com Zod, Prisma 7 e handler de erros`.

---

### Task 5: Autenticação (Better Auth) e seed dos dois usuários

**Files:**
- Create: `src/lib/auth.ts`, `src/plugins/auth.ts`, `scripts/seed-users.ts`, `test/auth.test.ts`; Modify: `prisma/schema.prisma` (modelos do Better Auth + relação `pagoPor`), `src/app.ts`, `test/helpers.ts`

**Interfaces:**
- Produces:
  - `auth` = `betterAuth({ database: prismaAdapter(prisma, { provider: 'postgresql' }), emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 }, rateLimit: { enabled: true, storage: 'database' }, baseURL: env.BETTER_AUTH_URL, secret: env.BETTER_AUTH_SECRET, trustedOrigins: [env.WEB_ORIGIN] })`. Rate limit em `database` porque memória não sobrevive entre invocações serverless. Confira o nome exato das opções na doc atual.
  - Plugin `auth`: rota catch-all `GET|POST /api/auth/*` encaminhando para `auth.handler` (padrão da doc oficial "Fastify integration": `fromNodeHeaders`, `new Request`, copiar status/headers/body). Decorator `requireAuth` (preHandler): `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`, sem sessão → `401 { erro: 'NAO_AUTENTICADO' }`, com sessão → `request.user = { id, nome }` (tipado via `declare module 'fastify'`).
  - Convenção para os módulos: registrar rotas protegidas dentro de um plugin com `app.addHook('preHandler', app.requireAuth)`.
  - `GET /api/me` → `{ id, nome, email }`.
  - `scripts/seed-users.ts`: lê `SEED_USER_1_EMAIL`, `SEED_USER_1_NOME`, `SEED_USER_1_SENHA` e o mesmo para `_2`. Cria cada usuário que ainda não existir com uma **instância separada** de `betterAuth` com a mesma config, mas `disableSignUp: false`, chamando `auth.api.signUpEmail`. Assim o seed usa a API pública e o hash oficial. Idempotente. Script `pnpm --filter @casa/api seed:users`.
  - Test helper: `loginComo(app, n: 1|2): Promise<string>` → header `cookie` (cria usuário via função do seed com dados fixos de teste e faz `POST /api/auth/sign-in/email`).
- [ ] **Step 1:** gerar os modelos do Better Auth no `schema.prisma` com a CLI (`npx @better-auth/cli generate`, confirme o comando na doc) e adicionar `pagoPor User? @relation(...)` em `Lancamento`. Migração `auth`.
- [ ] **Step 2: testes que falham** `test/auth.test.ts`:
  - `GET /api/me` sem cookie → 401.
  - `POST /api/auth/sign-up/email` → não cria usuário (status ≥ 400) e `prisma.user.count()` não muda.
  - login com senha errada → 401. Login certo → cookie de sessão `HttpOnly`. `GET /api/me` com o cookie → 200 com o e-mail.
  - seed rodado duas vezes → continua com 2 usuários.
- [ ] **Step 3:** FAIL → **Step 4:** implementar → **Step 5:** PASS.
- [ ] **Step 6:** Commit `feat(api): login com Better Auth, cadastro desligado e seed de usuários`.

---

### Task 6: Domínio — planejar lançamentos (puro)

**Files:**
- Create: `apps/api/src/domain/geracao.ts`, `geracao.test.ts`

**Interfaces:**
- Produces:
```ts
type ContaParaGeracao = {
  id: string; nome: string; tipo: TipoConta; prioridade: Prioridade; diaVencimento: number;
  valorCentavos: number | null; totalParcelas: number | null; primeiraParcela: Competencia | null;
  inicioCompetencia: Competencia; ativa: boolean;
};
type NovoLancamento = {
  contaId: string; nome: string; prioridade: Prioridade; competencia: Competencia;
  vencimento: string; valorCentavos: number | null; numeroParcela: number | null;
};
function planejarLancamentos(
  contas: ContaParaGeracao[],
  existentes: ReadonlySet<string>,   // chaves `${contaId}|${competencia}`, qualquer status
  ate: Competencia,
): NovoLancamento[]
```
Regras (spec 6.2):
- conta inativa → nada;
- início = `inicioCompetencia` (recorrentes) ou o maior entre `inicioCompetencia` e `primeiraParcela` (parcelada), para nunca gerar antes do cadastro;
- gera cada competência de início até `ate` cuja chave não está em `existentes`;
- FIXA e PARCELADA copiam `valorCentavos`; VARIÁVEL → `null`;
- parcelada: `numeroParcela = mesesEntre(primeiraParcela, c) + 1`; para quando passa de `totalParcelas`;
- `vencimento = vencimentoNoMes(c, diaVencimento)`; nome e prioridade copiados.
- [ ] **Step 1: testes que falham** (usar `ate` fixo, sem relógio):
  - fixa cadastrada em `2026-10`, `ate='2026-11'` → 2 lançamentos com o valor;
  - variável → `valorCentavos: null`;
  - IPTU `totalParcelas: 10`, `primeiraParcela: '2026-02'`, cadastrada `2026-10`, `ate='2026-12'` → competências `2026-10..2026-12`, parcelas 9 e 10 (nada em dezembro);
  - parcelada com primeira parcela futura (`2026-12`, cadastro `2026-10`, `ate='2026-12'`) → só dezembro, parcela 1;
  - mês não aberto: fixa cadastrada `2026-09`, `existentes` só com `2026-09`, `ate='2026-11'` → gera `2026-10` e `2026-11`;
  - chave existente (inclusive cancelada) → não regenera;
  - inativa → `[]`;
  - `diaVencimento: 31` em `2027-02` → `'2027-02-28'` (Review Focus 5).
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS. Commit `feat(api): regra de geração dos lançamentos do mês`.

---

### Task 7: Domínio — ordenação, parcelas e resumo (puro)

**Files:**
- Create: `apps/api/src/domain/ordenacao.ts`, `resumo.ts`, `ordenacao.test.ts`, `resumo.test.ts`

**Interfaces:**
- Produces:
  - `compararPendentes(a: ItemOrdenavel, b: ItemOrdenavel): number`, com `ItemOrdenavel = { prioridade; valorCentavos: number|null; valorEstimadoCentavos: number|null; vencimento: string }`. Valor de ordenação = `valorCentavos ?? valorEstimadoCentavos`. Sem ambos → fim do grupo de prioridade.
  - `calcularParcela(args: { numero: number; total: number; primeiraGerada: number; pagas: number }): { numero, total, faltam }`, com `faltam = (total − primeiraGerada + 1) − pagas`, onde `primeiraGerada` é o número da primeira parcela gerada no app (parcelas anteriores ao cadastro não contam como faltando) e `pagas` são as parcelas `PAGA` dessa conta. Uma cancelada **continua** contando como faltando (spec 6.1).
  - `resumirMes(itensDoMes: { status; valorCentavos: number|null }[]): MesView['resumo']`: ignora `CANCELADA`; `semValor` = pendentes com valor nulo; `totalMes = pago + pendente`.
- [ ] **Step 1: testes que falham:**
  - ordenação do exemplo da conversa: internet (NORMAL, 10000, `2026-11-07`) e luz (ESSENCIAL, 30000, `2026-11-10`) → luz primeiro;
  - mesma prioridade: maior valor primeiro; mesmo valor: vencimento mais cedo primeiro;
  - variável sem valor com estimativa 25000 fica entre 30000 e 10000; sem estimativa fica por último no grupo, mas antes do grupo seguinte;
  - `calcularParcela({ numero: 9, total: 10, primeiraGerada: 9, pagas: 0 })` → `faltam: 2`; depois de pagar a 9 (`pagas: 1`) → `faltam: 1`;
  - `resumirMes` com uma paga 10000, uma pendente 5000, uma pendente null e uma cancelada 9999 → `{ totalPagoCentavos: 10000, totalPendenteCentavos: 5000, totalMesCentavos: 15000, semValor: 1 }`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS. Commit `feat(api): ordenação, parcelas e resumo do mês`.

---

### Task 8: Módulo de contas (CRUD)

**Files:**
- Create: `apps/api/src/modules/contas/{routes,controller,service,repository}.ts`, `apps/api/test/contas.test.ts`; Modify: `src/app.ts`

**Interfaces:**
- Consumes: `criarContaSchema`, `editarContaSchema`, `ContaView`, `competenciaAtual`, `requireAuth`, `AppError`.
- Produces (todas autenticadas):
  - `GET /api/contas` → `ContaView[]` (ativas primeiro, depois por nome)
  - `POST /api/contas` → `201 ContaView`, com `inicioCompetencia = competenciaAtual()`
  - `PATCH /api/contas/:id` → `ContaView` (404 `CONTA_NAO_ENCONTRADA`)
  - Desativar = `PATCH { ativa: false }`. Não existe DELETE (histórico preservado).
- [ ] **Step 1: testes que falham** (usando `loginComo`):
  - criar FIXA, VARIÁVEL e PARCELADA → 201 com os campos certos e `inicioCompetencia` = mês atual (use `vi.setSystemTime` para fixar `2026-10-20T12:00:00-03:00`);
  - PARCELADA sem `totalParcelas` → 400;
  - PATCH com `tipo` → 400 (campo não permitido);
  - PATCH `{ valorCentavos: 12000 }` numa conta que já tem lançamento gerado → o lançamento existente continua com o valor antigo (Review Focus 5; gere o lançamento direto pelo repositório de lançamentos ou via `GET /api/meses` depois da Task 9. Se escrever antes, insira com `prisma.lancamento.create`);
  - sem login → 401.
- [ ] **Step 2:** FAIL → **Step 3:** implementar nas quatro camadas → **Step 4:** PASS. Commit `feat(api): cadastro de contas`.

---

### Task 9: Módulo de meses (visão do mês com geração) e histórico

**Files:**
- Create: `apps/api/src/modules/meses/{routes,controller,service,repository}.ts`, `apps/api/test/meses.test.ts`; Modify: `src/app.ts`

**Interfaces:**
- Consumes: `planejarLancamentos`, `compararPendentes`, `calcularParcela`, `resumirMes`, `competenciaAtual`, `somarMeses`, `MesView`, `HistoricoItem`.
- Produces:
  - `GET /api/meses/:competencia` → `MesView`. Competência > `atual + 1` → `400 COMPETENCIA_FORA_DO_LIMITE`.
  - `GET /api/historico` → `HistoricoItem[]`, competências com algum lançamento não cancelado, mais recente primeiro, até o mês atual (o próximo mês não aparece no histórico).
  - `garantirLancamentos(ate: Competencia): Promise<void>` no service de meses (exportado, também usado pela Task 10): carrega contas e chaves existentes, chama `planejarLancamentos` e grava com `createMany({ skipDuplicates: true })` (a unicidade resolve a corrida de dois usuários abrindo juntos).
- Algoritmo do `GET /api/meses/:c`:
  1. `garantirLancamentos(max(c, atual))`, para que as atrasadas do mês atual existam mesmo vendo um mês passado.
  2. Lançamentos com `competencia = c` → separar `aPagar` (PENDENTE, ordenado por `compararPendentes`), `pagas` (por `pagoEm` desc), `canceladas`.
  3. `atrasadas` = PENDENTE com `competencia < c`, ordenadas por competência e depois `compararPendentes`. `totalCentavos` soma só os valores não nulos.
  4. `valorEstimadoCentavos` de um variável sem valor = `valorCentavos` do lançamento da mesma conta em `somarMeses(competencia, -1)`, se houver.
  5. `parcela` via `calcularParcela`, contando `PAGA` e o menor `numeroParcela` gerado da conta (uma consulta agregada por conta parcelada, não N+1).
  6. `resumo = resumirMes(itens com competencia = c)`.
- [ ] **Step 1: testes que falham** (relógio fixo em `2026-10-20`):
  - conta FIXA cadastrada em outubro → `GET /api/meses/2026-10` tem 1 item em `aPagar`. Chamar 2× em paralelo (`Promise.all`) → ainda 1 lançamento no banco;
  - `GET /api/meses/2026-12` → 400; `GET /api/meses/2026-11` → 200 (adiantar);
  - lançamento PENDENTE de setembro aparece em `atrasadas` de outubro e não em `aPagar`;
  - (Review Focus 4) pagar a atrasada de setembro com `prisma.lancamento.update` → `GET /api/historico` mostra o valor em `2026-09` e não em `2026-10`, e `atrasadas` de outubro fica vazia;
  - variável de outubro sem valor com setembro = 21000 → `valorEstimadoCentavos: 21000`;
  - IPTU (total 10, primeira `2026-02`) cadastrado em outubro → item com `parcela: { numero: 9, total: 10, faltam: 2 }`;
  - conta desativada depois de gerar → o PENDENTE continua em `aPagar` (Review Focus 5) e nada novo é gerado em novembro;
  - cancelada não aparece em `aPagar` nem no resumo e aparece em `canceladas`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS. Commit `feat(api): visão do mês com geração automática e histórico`.

---

### Task 10: Ações sobre lançamentos

**Files:**
- Create: `apps/api/src/modules/lancamentos/{routes,controller,service,repository}.ts`, `apps/api/test/lancamentos.test.ts`; Modify: `src/app.ts`

**Interfaces:**
- Consumes: `pagarSchema`, `editarLancamentoSchema`, `criarEsporadicaSchema`, `LancamentoItem`, `competenciaDe`, `garantirLancamentos`.
- Produces (todas retornam o `LancamentoItem` atualizado, montado pela mesma função do módulo de meses: extraia `montarItem` para `modules/meses/service.ts` e reuse):
  - `POST /api/lancamentos` (esporádica) → `201`, com `competencia = competenciaDe(vencimento)`. Competência > atual + 1 → 400.
  - `POST /api/lancamentos/:id/pagar` `{ valorCentavos? }`:
    - PENDENTE sem valor e sem `valorCentavos` → `422 VALOR_OBRIGATORIO`;
    - PENDENTE → PAGA, `pagoEm = now`, `pagoPorId = request.user.id`, valor gravado se enviado;
    - já PAGA → 200 sem alterar nada (idempotente);
    - CANCELADA → `409 LANCAMENTO_CANCELADO`.
    - Implementar com `updateMany({ where: { id, status: 'PENDENTE' } })` e reler. Se `count = 0`, decidir pelo status atual (resolve a corrida).
  - `POST /api/lancamentos/:id/desfazer`: PAGA ou CANCELADA → PENDENTE, limpando `pagoEm`/`pagoPorId` (o valor fica).
  - `POST /api/lancamentos/:id/cancelar`: PENDENTE → CANCELADA. PAGA → `409 LANCAMENTO_PAGO`.
  - `PATCH /api/lancamentos/:id`: edita os campos do schema. Se `vencimento` mudar, `competencia` **não** muda (escolha do plano: a competência é a identidade do lançamento na geração).
  - 404 `LANCAMENTO_NAO_ENCONTRADO` em todas.
- [ ] **Step 1: testes que falham:**
  - (Review Focus 2) usuário 1 e usuário 2 pagam o mesmo lançamento em `Promise.all` → ambos 200, banco com `status PAGA` e um único `pagoPorId`, igual ao `pagoPor.id` das duas respostas;
  - variável sem valor → 422; com `{ valorCentavos: 18990 }` → PAGA com 18990;
  - desfazer → PENDENTE, `pagoEm: null`;
  - cancelar PENDENTE → CANCELADA. Abrir o mês de novo (`GET /api/meses`) **não** recria. Cancelar PAGA → 409. Pagar CANCELADA → 409;
  - esporádica com vencimento `2026-11-03` → competência `2026-11`. Duas esporádicas no mesmo mês → ambas criadas;
  - `valorCentavos: 0` ou `1.5` → 400.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS. Commit `feat(api): pagar, desfazer, cancelar, editar e esporádicas`.

---

### Task 11: Esqueleto do web (Vite, Tailwind, shadcn, rotas, login, PWA)

**Files:**
- Create: `apps/web/*` (Vite React TS), `src/main.tsx`, `src/router.tsx`, `src/lib/{api,auth-client,query-client}.ts`, `src/features/auth/LoginPage.tsx`, `src/components/{AppLayout,BottomNav}.tsx`, `src/test/setup.ts`, `src/features/auth/LoginPage.test.tsx`

**Interfaces:**
- Consumes: Better Auth (`createAuthClient` de `better-auth/react`, mesma origem), endpoints `/api/*`.
- Produces:
  - `api<T>(path: string, init?: RequestInit): Promise<T>`: `credentials: 'include'`, JSON. Erro HTTP → lança `ApiError { status, codigo, mensagem }`. 401 → redireciona para `/login`.
  - `authClient` com `signIn.email`, `signOut`, `useSession`.
  - Rotas: `/login`; dentro de `AppLayout` (exige sessão): `/` → redireciona para `/mes/<competenciaAtual()>`, `/mes/:competencia`, `/historico`, `/contas`, `/contas/nova`, `/contas/:id`, `/lancar` (esporádica).
  - `BottomNav` fixa embaixo com 4 destinos: Mês, Lançar, Histórico, Contas. Alvos de toque ≥ 48px.
  - Vite: `server.proxy['/api'] → http://localhost:3333`. `vite-plugin-pwa` com `registerType: 'autoUpdate'`, manifest `pt-BR` (nome "Contas da Casa", `display: 'standalone'`, ícones 192/512). **Sem cache de `/api`** (não-objetivo: offline).
  - Vitest + jsdom + Testing Library.
- [ ] **Step 1: teste que falha** `LoginPage.test.tsx`: preencher e-mail e senha e enviar → chama `authClient.signIn.email` (mock) com os valores; erro → mostra "E-mail ou senha inválidos".
- [ ] **Step 2:** FAIL → **Step 3:** implementar (inicializar shadcn com `button`, `input`, `card`, `dialog`, `sonner`, `form`, `select`, `badge`) → **Step 4:** PASS.
- [ ] **Step 5: verificação manual:** `docker compose up -d`, `pnpm dev` (api + web), seed, login no navegador com DevTools em modo celular → cai em `/mes/2026-10` (página vazia ainda) e a sessão persiste no reload. Commit `feat(web): esqueleto PWA com login e navegação`.

---

### Task 12: Tela do mês (o coração do app)

**Files:**
- Create: `apps/web/src/features/mes/{MesPage,ResumoMes,LancamentoCard,ValorDialog,queries}.ts(x)`, `src/components/CopyButton.tsx`, testes `LancamentoCard.test.tsx`, `queries.test.ts`

**Interfaces:**
- Consumes: `MesView`, `LancamentoItem`, `formatBRL`, `parseValorBRL`, `somarMeses`, `competenciaAtual`, endpoints das Tasks 9 e 10.
- Produces:
  - `useMes(c)` → `useQuery(['mes', c])`; `usePagar()`, `useDesfazer()`, `useCancelar()`, `useEditarLancamento()`. Toda mutação faz `invalidateQueries({ queryKey: ['mes'] })` (todos os meses, porque pagar uma atrasada muda outro mês, Review Focus 4) e `['historico']`.
  - `MesPage`: cabeçalho com `‹ outubro de 2026 ›` (o botão › some quando `c = atual + 1`), `ResumoMes`, seções Atrasadas (só se houver), A pagar, Pagas, Canceladas (recolhida, `<details>`). Estado vazio de "A pagar": "Tudo pago neste mês 🎉".
  - `LancamentoCard`: nome, valor (`formatBRL`, ou "~R$ X (mês passado)" em itálico para estimativa, ou "valor a informar"), vencimento `dd/mm`, badge de prioridade, "Parcela 9 de 10 · faltam 2", botão "2ª via" (`<a target="_blank" rel="noopener">`), `CopyButton` do código, botão principal **Pagar** (largura total, ≥ 48px). Menu ⋯ com Editar valor/código, Cancelar (com confirmação: "Cancelar tira esta conta dos totais. Continuar?") e, nas pagas/canceladas, Desfazer.
  - Fluxo de pagar: com valor → 1 toque, chama `pagar` e mostra toast "Luz paga" com ação **Desfazer**. Sem valor → abre `ValorDialog` (campo único, `inputMode="decimal"`, `autoFocus`, valida com `parseValorBRL`, Enter confirma).
  - `CopyButton`: `navigator.clipboard.writeText`, feedback "Copiado".
- [ ] **Step 1: testes que falham** (`LancamentoCard.test.tsx`, com mutações mockadas):
  - item FIXA com valor → clicar "Pagar" chama `pagar({ id })` uma vez, sem abrir diálogo;
  - item VARIÁVEL sem valor → clicar "Pagar" abre o diálogo. Digitar `189,90` e confirmar chama `pagar({ id, valorCentavos: 18990 })`. Digitar `abc` mostra "Valor inválido" e não chama;
  - estimativa renderiza "~R$ 210,00 (mês passado)";
  - parcela renderiza "Parcela 9 de 10 · faltam 2";
  - clique duplo rápido em "Pagar" chama `pagar` só uma vez (botão desabilitado enquanto `isPending`).
  - `queries.test.ts`: depois de `usePagar` com sucesso, as queries `['mes','2026-09']` e `['mes','2026-10']` estão invalidadas.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS.
- [ ] **Step 5: verificação manual no navegador (modo celular):** cadastrar contas pelo banco ou pela API, abrir o mês, pagar uma fixa (1 toque), pagar uma variável (valor + 1 toque), desfazer pelo toast, cancelar, navegar ‹ ›. Commit `feat(web): tela do mês com pagar, desfazer e cancelar`.

---

### Task 13: Esporádica, cadastro de contas e histórico (web)

**Files:**
- Create: `apps/web/src/features/esporadica/EsporadicaForm.tsx`, `src/features/contas/{ContasPage,ContaForm}.tsx`, `src/features/historico/HistoricoPage.tsx`, testes `ContaForm.test.tsx`, `EsporadicaForm.test.tsx`

**Interfaces:**
- Consumes: `criarContaSchema`, `editarContaSchema`, `criarEsporadicaSchema`, `ContaView`, `HistoricoItem`, `parseValorBRL`, `formatBRL`.
- Produces:
  - `EsporadicaForm` (`/lancar`): nome, valor (texto → `parseValorBRL`), vencimento (`<input type="date">`, padrão hoje), prioridade (padrão NORMAL). Sucesso → volta para `/mes/<competência do vencimento>`.
  - `ContaForm` (`/contas/nova`, `/contas/:id`): React Hook Form + `zodResolver`. O tipo é escolhido primeiro e controla os campos visíveis (valor só em FIXA/PARCELADA; total e primeira parcela só em PARCELADA). Na edição, o tipo aparece só como texto, e há um botão Desativar/Reativar.
  - `ContasPage`: lista com nome, tipo, prioridade, valor e dia. As inativas ficam em seção separada, esmaecidas.
  - `HistoricoPage`: lista de meses ("setembro de 2026 · pago R$ X de R$ Y"). Tocar abre `/mes/:competencia`.
- [ ] **Step 1: testes que falham:**
  - `ContaForm`: tipo VARIÁVEL → campo "Valor" não aparece. PARCELADA → aparecem "Total de parcelas" e "Primeira parcela". Enviar PARCELADA sem total mostra erro e não chama a API. Valor `150,00` é enviado como `15000`.
  - `EsporadicaForm`: valor `-5` mostra "Valor inválido". Envio válido chama a API com `valorCentavos` em centavos.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS.
- [ ] **Step 5: verificação manual:** cadastrar luz (variável, essencial, dia 10), água (variável, essencial), internet (fixa, normal), taxa do lixo (fixa) e IPTU (parcelada 10x desde fevereiro). Na tela do mês, conferir a ordem e "Parcela 9 de 10 · faltam 2". Lançar uma esporádica. Ver o histórico. Commit `feat(web): esporádicas, cadastro de contas e histórico`.

---

### Task 14: CI/CD (GitHub Actions + Vercel + Neon)

**Files:**
- Create: `.github/workflows/ci.yml`, `apps/web/vercel.json`, `apps/api/vercel.json` (se necessário); Modify: `CLAUDE.md` (seção de deploy), `apps/api/.env.example`

**Interfaces:**
- Produces:
  - Job `test` (push e PR): pnpm install com cache, serviço `postgres:17` na porta 5433, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`.
  - Job `deploy` (só `push` em `main`, `needs: test`): `prisma migrate deploy` com `DIRECT_DATABASE_URL` (Neon sem pooler), depois `vercel deploy --prod` para o projeto da API e para o do web, usando os secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_API`, `VERCEL_PROJECT_ID_WEB`. O deploy automático por Git fica desligado nos dois projetos (`"git": { "deploymentEnabled": false }`), para produção **só** subir com testes verdes.
  - `apps/web/vercel.json`: `rewrites` `/api/:path*` → `https://<projeto-api>.vercel.app/api/:path*` e fallback SPA `/(.*)` → `/index.html`.
  - Env vars na Vercel (API): `DATABASE_URL` (pooled), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` = `WEB_ORIGIN` = URL pública do web (as requisições chegam pela origem do web via rewrite).
- [ ] **Step 1:** conferir na doc atual da Vercel: (a) Fastify em monorepo com Root Directory `apps/api` e entry `src/index.ts`; (b) `vercel deploy --prod` a partir do Actions com workspace pnpm; (c) se `rewrites` para domínio externo mantém o cookie first-party; (d) limites do plano Hobby. Ajuste os arquivos ao que a doc disser e registre as diferenças no commit.
- [ ] **Step 2:** criar o projeto Neon, os dois projetos na Vercel e os secrets no GitHub. **Este passo é do usuário** (contas e credenciais dele). Gere um checklist em `CLAUDE.md` e peça para ele executar.
- [ ] **Step 3:** abrir um PR com um teste quebrado de propósito → o job `test` falha e não há deploy. Remover o erro → verde.
- [ ] **Step 4:** merge em `main` → deploy. Rodar `seed:users` contra o Neon (localmente, com a URL de produção). **Verificação de produção:** no celular, abrir a URL, instalar na tela inicial, logar com os dois usuários (aparelhos diferentes), pagar a mesma conta quase ao mesmo tempo → aparece paga uma vez só.
- [ ] **Step 5:** Commit `ci: testes e deploy na Vercel com migrações no Neon`.
