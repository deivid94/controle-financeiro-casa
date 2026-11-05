# Receitas e Gráficos na Home — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar receitas (fixas e só deste mês) e mostrar na home um saldo e dois gráficos de rosca: receitas do mês e gastos pagos, com o resumo "Ainda a pagar" ao lado.

**Architecture:** Par `Receita` (cadastro) / `Recebimento` (ocorrência por competência), espelhando `Conta` / `Lancamento`. A geração é uma função pura em `domain/`, chamada pelo `mesDe` junto com `garantirLancamentos`. O `MesView` ganha `receitas` e `saldo`, calculados no servidor, e o web só desenha (componente Chart do shadcn, que usa Recharts).

**Tech Stack:** Fastify 5, Prisma 7 (adapter-pg), Zod 4, React 19, TanStack Query 5, React Router 8, shadcn (base-nova) + Recharts, Vitest, MCP do Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-receitas-e-graficos-design.md` (leia junto; as regras são citadas como §2.1.5 etc.)

## Global Constraints

- Dinheiro sempre `Int` em centavos (`valorCentavos`); nunca float/Decimal.
- Competência `AAAA-MM`; datas `AAAA-MM-DD` em string; "mês atual" = `competenciaAtual()` (fuso `America/Sao_Paulo`).
- Exibição `pt-BR` via `formatBRL` de `@casa/shared`.
- Tudo agrega por competência. Lançamentos `CANCELADA` nunca entram em totais.
- Geração nunca passa de mês atual + 1; competência além disso → 400 `COMPETENCIA_FORA_DO_LIMITE`.
- Toda rota nova tem `rotas.addHook('onRequest', app.requireAuth)`.
- Migração só adiciona tabelas (retrocompatível com o código anterior).
- Nomes de domínio em português sem acento; infraestrutura em inglês.
- Camadas na API: `routes → controller → service → repository` (só o repository importa `prisma`).
- TDD: teste falhando primeiro. API: testes de integração em `apps/api/test/*.test.ts` com `criarAppDeTeste`, `limparBanco`, `loginComo` e `vi.setSystemTime(new Date('2026-10-20T12:00:00-03:00'))` (mês atual = `2026-10`).
- Bibliotecas na última versão estável; consultar o Context7 antes de instalar ou usar uma API nova; se a doc divergir do plano, siga a doc e anote no commit.
- Mudança visual no `apps/web` também é verificada no navegador com o MCP do Playwright (390x844, claro e escuro).
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Dois celulares abrindo o mesmo mês ao mesmo tempo** → nenhum recebimento duplicado (`createMany` com `skipDuplicates` + `@@unique([receitaId, competencia])`). Teste na Task 5.
2. **Receita fixa com dia 31 em fevereiro** → `data` = último dia do mês (`vencimentoNoMes`). Teste na Task 3.
3. **Ocorrência ajustada para R$ 0,00 e depois o cadastro sobe de valor** → a ocorrência continua R$ 0,00 (ela difere do valor antigo). Teste na Task 4.
4. **Conta atrasada de setembro paga em outubro** → entra no saldo de **setembro** (competência), não no de outubro. Teste na Task 5.
5. **Desativar e reativar no mesmo mês** → a ocorrência do mês atual continua única, e o mês seguinte é gerado de novo uma vez só. Teste na Task 4.

---

## Estrutura de arquivos

**Criar**
- `packages/shared/src/schemas/receita.ts`: schemas e tipos de receita e recebimento.
- `apps/api/prisma/migrations/<timestamp>_receitas/migration.sql`: gerado pelo Prisma.
- `apps/api/src/domain/recebimentos.ts` (+ `.test.ts`): `planejarRecebimentos`, `calcularSaldo`.
- `apps/api/src/modules/receitas/{routes,controller,service,repository}.ts`: cadastro de receita fixa.
- `apps/api/src/modules/recebimentos/{routes,controller,service,repository}.ts`: avulsas e ajuste de uma ocorrência.
- `apps/api/test/receitas.test.ts`, `apps/api/test/recebimentos.test.ts`.
- `apps/web/src/components/ui/chart.tsx`: gerado pelo `shadcn add chart`.
- `apps/web/src/features/mes/fatias.ts` (+ `.test.ts`): `agruparFatias`.
- `apps/web/src/features/mes/{SaldoMes,GraficoReceitas,GraficoGastos,RecebimentoDialog}.tsx` (+ testes).
- `apps/web/src/features/receitas/{queries.ts,ReceitaForm.tsx,NovaReceitaPage.tsx,ReceitaEditarPage.tsx,RecebimentoAvulsoForm.tsx}` (+ testes).

**Modificar**
- `packages/shared/src/index.ts`, `packages/shared/src/schemas/views.ts`.
- `apps/api/prisma/schema.prisma`, `apps/api/src/app.ts`, `apps/api/src/modules/meses/{service,repository}.ts`.
- `apps/web/src/index.css` (tokens `--chart-1..6`), `apps/web/src/router.tsx`, `apps/web/src/features/mes/MesPage.tsx`, `apps/web/src/features/nova/NovaPage.tsx`, `apps/web/src/features/contas/ContasPage.tsx`.

---

### Task 1: Schemas compartilhados

**Files:**
- Create: `packages/shared/src/schemas/receita.ts`
- Modify: `packages/shared/src/schemas/views.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/src/schemas/schemas.test.ts`

**Interfaces:**
- Produces (em `receita.ts`, todos exportados por `@casa/shared`):
  - `diaRecebimentoSchema = z.number().int().min(1).max(31)`
  - `criarReceitaSchema = z.object({ nome: nomeSchema, valorCentavos: valorCentavosSchema, diaRecebimento })` → `CriarReceitaInput`
  - `editarReceitaSchema = z.object({ nome, valorCentavos, diaRecebimento, ativa: z.boolean() }).partial()` → `EditarReceitaInput`
  - `criarRecebimentoAvulsoSchema = z.object({ nome, valorCentavos: valorCentavosSchema, data: dataSchema })` → `CriarRecebimentoAvulsoInput`
  - `valorRecebidoSchema = z.number().int().min(0).max(VALOR_MAX_CENTAVOS)` (aceita 0, §2.1.7)
  - `editarRecebimentoSchema = z.object({ nome, valorCentavos: valorRecebidoSchema, data: dataSchema }).partial()` → `EditarRecebimentoInput`
  - `receitaViewSchema = z.object({ id, nome, valorCentavos, diaRecebimento, inicioCompetencia: competenciaSchema, ativa })` → `ReceitaView`
  - `recebimentoItemSchema = z.object({ id, receitaId: z.string().nullable(), nome, competencia, data: dataSchema, valorCentavos: z.number().int() })` → `RecebimentoItem`
- Produces (em `views.ts`): o `mesViewSchema` ganha
  - `receitas: z.object({ itens: z.array(recebimentoItemSchema), totalCentavos: z.number().int() })`
  - `saldo: z.object({ receitasCentavos, pagoCentavos, saldoCentavos, depoisDeTudoCentavos })` (todos `z.number().int()`; o saldo pode ser negativo).

- [ ] **Step 1: Testes que falham** em `schemas.test.ts`, num `describe('receita')`:
  - `criarReceitaSchema` aceita `{ nome: 'Aluguel da inquilina', valorCentavos: 150000, diaRecebimento: 5 }`; rejeita `valorCentavos: 0`, `diaRecebimento: 32` e `nome: '  '`.
  - `editarRecebimentoSchema` aceita `{ valorCentavos: 0 }`; rejeita `{ valorCentavos: -1 }` e `{ data: '2026-02-30' }`.
  - `criarRecebimentoAvulsoSchema` rejeita `valorCentavos: 0`.
  - `mesViewSchema` exige `receitas` e `saldo` (um objeto sem eles falha).
- [ ] **Step 2:** `pnpm --filter @casa/shared test` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar `receita.ts` reaproveitando `nomeSchema`, `valorCentavosSchema`, `VALOR_MAX_CENTAVOS` (de `conta.ts`) e `dataSchema` (de `lancamento.ts`); estender `mesViewSchema`; exportar em `index.ts`.
- [ ] **Step 4:** `pnpm --filter @casa/shared test && pnpm --filter @casa/shared build` → PASS. A API e o web vão quebrar no typecheck (o `MesView` agora exige campos). Isso é esperado e é resolvido nas Tasks 5 e 7. Não rode o typecheck global ainda.
- [ ] **Step 5: Commit** `feat(shared): schemas de receita e recebimento`.

---

### Task 2: Modelo no banco

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: migração gerada

**Interfaces:**
- Produces: modelos Prisma `Receita` e `Recebimento` exatamente como no §6.1 da spec (`@@unique([receitaId, competencia])`, `@@index([competencia])`, `receitaId` opcional).

- [ ] **Step 1:** Adicionar os dois modelos ao `schema.prisma` (copiar o bloco do §6.1).
- [ ] **Step 2:** Com o `docker compose up -d` rodando: `pnpm --filter @casa/api exec prisma migrate dev --name receitas`. Esperado: a pasta `migrations/<timestamp>_receitas/` só com `CREATE TABLE` / `CREATE INDEX` / `ADD CONSTRAINT` (nenhum `DROP` nem `ALTER` em tabelas existentes; confira o SQL).
- [ ] **Step 3:** `pnpm --filter @casa/api exec prisma generate` → sem erro.
- [ ] **Step 4: Commit** `feat(api): tabelas Receita e Recebimento`.

---

### Task 3: Domínio — geração e saldo (funções puras)

**Files:**
- Create: `apps/api/src/domain/recebimentos.ts`, `apps/api/src/domain/recebimentos.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ReceitaParaGeracao = { id: string; nome: string; diaRecebimento: number;
    valorCentavos: number; inicioCompetencia: Competencia; ativa: boolean };
  export type NovoRecebimento = { receitaId: string; nome: string; competencia: Competencia;
    data: string; valorCentavos: number };
  export function planejarRecebimentos(receitas: ReceitaParaGeracao[],
    existentes: ReadonlySet<string>, ate: Competencia): NovoRecebimento[];
  // chave do Set: chaveLancamento(receitaId, competencia) de domain/geracao.ts (reaproveitar)
  export function calcularSaldo(receitasCentavos: number,
    resumo: { totalPagoCentavos: number; totalPendenteCentavos: number }): MesView['saldo'];
  ```

- [ ] **Step 1: Testes que falham:**
  - `planejarRecebimentos`: receita ativa com `inicioCompetencia: '2026-10'`, `ate: '2026-11'` → 2 itens (`2026-10`, `2026-11`) com `data` `2026-10-05`/`2026-11-05` e o valor do cadastro.
  - Inativa → `[]`.
  - Já existente `2026-10` no Set → só `2026-11`.
  - `diaRecebimento: 31`, `inicioCompetencia: '2027-02'`, `ate: '2027-02'` → `data: '2027-02-28'` (Review Focus 2).
  - `calcularSaldo(450000, { totalPagoCentavos: 37000, totalPendenteCentavos: 19000 })` → `{ receitasCentavos: 450000, pagoCentavos: 37000, saldoCentavos: 413000, depoisDeTudoCentavos: 394000 }`.
  - `calcularSaldo(0, { totalPagoCentavos: 5000, totalPendenteCentavos: 0 })` → `saldoCentavos: -5000`.
- [ ] **Step 2:** `pnpm --filter @casa/api exec vitest run src/domain/recebimentos.test.ts` → FAIL.
- [ ] **Step 3:** Implementar no mesmo formato de laço de `planejarLancamentos` (de `inicioCompetencia` até `ate`, pulando chaves existentes, `vencimentoNoMes` para a data).
- [ ] **Step 4:** Mesmo comando → PASS.
- [ ] **Step 5: Commit** `feat(api): planejarRecebimentos e calcularSaldo`.

---

### Task 4: API — cadastro de receita fixa (`/api/receitas`)

**Files:**
- Create: `apps/api/src/modules/receitas/{routes,controller,service,repository}.ts`, `apps/api/test/receitas.test.ts`
- Modify: `apps/api/src/app.ts` (`void app.register(receitasRoutes)`)

**Interfaces:**
- Consumes: schemas da Task 1; `garantirRecebimentos` não é necessário aqui.
- Produces:
  - `GET /api/receitas` → `ReceitaView[]` (ativas primeiro, depois por nome).
  - `POST /api/receitas` (body `criarReceitaSchema`) → 201 `ReceitaView` com `inicioCompetencia = competenciaAtual()`, `ativa: true`.
  - `PATCH /api/receitas/:id` (body `editarReceitaSchema.strict()`) → 200 `ReceitaView`; 404 `RECEITA_NAO_ENCONTRADA`.
  - Regras do PATCH no service, numa `prisma.$transaction` (chamada pelo repository):
    - **Valor (§2.1.5):** `updateMany` em `Recebimento` com `receitaId = id`, `competencia >= competenciaAtual()` e `valorCentavos = <valor antigo do cadastro>` → novo valor.
    - **Nome:** atualiza o `nome` das ocorrências com `competencia >= atual`.
    - **Dia:** recalcula a `data` (`vencimentoNoMes(competencia, dia)`) das ocorrências com `competencia >= atual`.
    - **Desativar** (`ativa: false`, §2.1.6): `deleteMany` com `competencia > atual`.
    - **Reativar** (`ativa: true` vindo de inativa): `inicioCompetencia = competenciaAtual()`.

- [ ] **Step 1: Testes que falham** em `receitas.test.ts` (setup igual a `contas.test.ts`). Para criar ocorrências, faça `GET /api/meses/2026-11` (isso só funciona depois da Task 5; até lá, insira as ocorrências com `prisma.recebimento.createMany`, como o teste de lançamentos faz com dados prontos):
  - Sem cookie → 401 em GET, POST e PATCH.
  - POST válido → 201, `inicioCompetencia: '2026-10'`; `valorCentavos: 0` → 400.
  - PATCH `valorCentavos: 160000` com ocorrências `2026-09` (150000), `2026-10` (150000) e `2026-11` (150000) → só `2026-10` e `2026-11` ficam 160000.
  - PATCH valor com a ocorrência `2026-10` já ajustada para `0` → ela continua `0`, e `2026-11` vira 160000 (Review Focus 3).
  - PATCH `ativa: false` com ocorrências `2026-10` e `2026-11` → sobra só `2026-10`.
  - Desativar e reativar no mesmo mês: depois de `ativa: true`, `inicioCompetencia: '2026-10'`; com `prisma.recebimento.count({ where: { receitaId, competencia: '2026-10' } })` = 1 (Review Focus 5; a regeneração de `2026-11` é testada na Task 5).
  - Reativar em `2027-03` (avance `setSystemTime`) → `inicioCompetencia: '2027-03'`.
  - PATCH com campo desconhecido (`{ tipo: 'X' }`) → 400; id inexistente → 404.
- [ ] **Step 2:** `pnpm --filter @casa/api exec vitest run test/receitas.test.ts` → FAIL.
- [ ] **Step 3:** Implementar o módulo nas 4 camadas, copiando a forma do módulo `contas` (o `paraView` no service).
- [ ] **Step 4:** Mesmo comando → PASS.
- [ ] **Step 5: Commit** `feat(api): cadastro de receitas fixas`.

---

### Task 5: API — mês com receitas e saldo; recebimentos avulsos

**Files:**
- Create: `apps/api/src/modules/recebimentos/{routes,controller,service,repository}.ts`, `apps/api/test/recebimentos.test.ts`
- Modify: `apps/api/src/modules/meses/{service,repository}.ts`, `apps/api/src/app.ts`, `apps/api/test/meses.test.ts`

**Interfaces:**
- Consumes: `planejarRecebimentos`, `calcularSaldo` (Task 3).
- Produces:
  - `garantirRecebimentos(ate: Competencia): Promise<void>` em `meses/service.ts`, chamada logo depois de `garantirLancamentos` no `mesDe` (mesmo `ate`).
  - `mesDe` devolve `receitas: { itens /* competência exibida, valor desc, depois nome */, totalCentavos }` e `saldo: calcularSaldo(receitas.totalCentavos, resumo)`.
  - `POST /api/recebimentos` (body `criarRecebimentoAvulsoSchema`) → 201 `RecebimentoItem` (`receitaId: null`, `competencia = competenciaDe(data)`); competência > atual + 1 → 400 `COMPETENCIA_FORA_DO_LIMITE`.
  - `PATCH /api/recebimentos/:id` (body `editarRecebimentoSchema.strict()`) → 200 `RecebimentoItem`. Em ocorrência de fixa (`receitaId` não nulo), só `valorCentavos` é permitido; `nome`/`data` → 400 `CAMPO_NAO_EDITAVEL`. Em avulsa, mudar `data` recalcula `competencia` (mesmo limite de +1). Avulsa com `valorCentavos: 0` → 400 (avulsa exige > 0). 404 `RECEBIMENTO_NAO_ENCONTRADO`.
  - `DELETE /api/recebimentos/:id` → 204 em avulsa; 400 `RECEBIMENTO_DE_RECEITA_FIXA` em ocorrência de fixa; 404 se não existir.

- [ ] **Step 1: Testes que falham:**
  - `meses.test.ts`: com uma receita fixa de 150000 cadastrada em `2026-10`, `GET /api/meses/2026-10` → `receitas.totalCentavos: 150000`, 1 item. Com uma conta paga de 37000 e uma pendente de 19000 em `2026-10` → `saldo` = `{ receitasCentavos: 150000, pagoCentavos: 37000, saldoCentavos: 113000, depoisDeTudoCentavos: 94000 }`.
  - `meses.test.ts`: `Promise.all` com dois `GET /api/meses/2026-10` (cookies dos usuários 1 e 2) → `prisma.recebimento.count()` = 2 (`2026-10` e `2026-11`; a geração vai até atual + 1) (Review Focus 1).
  - `meses.test.ts`: uma conta de `2026-09` paga hoje (`2026-10-20`) → entra em `saldo.pagoCentavos` de `2026-09`, não de `2026-10` (Review Focus 4).
  - `meses.test.ts`: desativar e reativar no mesmo mês e depois `GET /api/meses/2026-11` → exatamente 1 recebimento em `2026-11` (Review Focus 5).
  - `meses.test.ts`: receita desativada não aparece em `2026-11`.
  - `recebimentos.test.ts`: 401 sem cookie; POST avulsa `data: '2026-10-15'` → 201, `competencia: '2026-10'`; `data: '2026-12-01'` → 400; PATCH `valorCentavos: 0` numa ocorrência de fixa → 200, e `receitas.totalCentavos` do mês fica 0; PATCH `nome` em ocorrência de fixa → 400; DELETE avulsa → 204; DELETE ocorrência de fixa → 400.
- [ ] **Step 2:** `pnpm --filter @casa/api exec vitest run test/meses.test.ts test/recebimentos.test.ts` → FAIL.
- [ ] **Step 3:** Implementar. O repository de meses ganha `listarReceitas()`, `listarChavesRecebimentos(ate)`, `criarRecebimentos(novos)` (com `skipDuplicates: true`) e `listarRecebimentosDaCompetencia(c)`. Registrar `recebimentosRoutes` no `app.ts`.
- [ ] **Step 4:** `pnpm --filter @casa/api test && pnpm --filter @casa/api typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(api): receitas e saldo no mês; recebimentos avulsos`.

---

### Task 6: Web — gráfico base (shadcn Chart, cores e agrupamento)

**Files:**
- Create: `apps/web/src/components/ui/chart.tsx` (via CLI), `apps/web/src/features/mes/fatias.ts`, `apps/web/src/features/mes/fatias.test.ts`
- Modify: `apps/web/src/index.css`, `apps/web/package.json`

**Interfaces:**
- Produces:
  ```ts
  export type Fatia = { chave: string; nome: string; valorCentavos: number; cor: string };
  /** Remove valor 0/nulo e ordena por valor desc (empate: nome). Até 6 itens: uma fatia cada. Mais de 6: os 5 maiores + "Outros" com a soma do resto. cor = `var(--chart-N)` pela posição. */
  export function agruparFatias(itens: { id: string; nome: string; valorCentavos: number | null }[]): Fatia[];
  ```
  - Tokens `--chart-1` … `--chart-6` coloridos (hoje são cinza, e o 6 não existe) em `:root` e `.dark`, e `--color-chart-6` no `@theme`.

- [ ] **Step 1:** Consultar o Context7 sobre o componente Chart do shadcn (instalação, `ChartContainer`, `ChartConfig`, `PieChart` com `innerRadius`) e sobre a versão estável do Recharts. Rodar `pnpm --filter @casa/web exec shadcn add chart`. Anote no commit qualquer diferença em relação a este plano.
- [ ] **Step 2: Testes que falham** em `fatias.test.ts`:
  - 3 itens (250, 120, 0) → 2 fatias, ordem 250, 120, cores `var(--chart-1)`, `var(--chart-2)`.
  - 6 itens → 6 fatias, sem "Outros".
  - 8 itens de valores distintos → 6 fatias: os 5 maiores e, por último, `{ chave: 'outros', nome: 'Outros', valorCentavos: <soma dos 3 menores>, cor: 'var(--chart-6)' }`.
  - Item com `valorCentavos: null` é ignorado.
- [ ] **Step 3:** Implementar `agruparFatias`. Definir as 6 cores em OKLCH para os temas claro e escuro, distinguíveis entre si e com contraste contra o fundo do card.
- [ ] **Step 4:** `pnpm --filter @casa/web test -- fatias` → PASS; `pnpm --filter @casa/web build` → sem erro.
- [ ] **Step 5: Commit** `feat(web): componente de gráfico e cores das fatias`.

---

### Task 7: Web — saldo e gráficos na home

**Files:**
- Create: `apps/web/src/features/mes/{SaldoMes,GraficoReceitas,GraficoGastos}.tsx` (+ `.test.tsx` de cada)
- Modify: `apps/web/src/features/mes/MesPage.tsx`, `apps/web/src/features/mes/MesPage.test.tsx` (as fixtures de `MesView` ganham `receitas` e `saldo`)

**Interfaces:**
- Consumes: `agruparFatias` (Task 6), `MesView['receitas' | 'saldo' | 'resumo']`, `MesView['pagas']`.
- Produces:
  - `SaldoMes({ saldo }: { saldo: MesView['saldo'] })`: "Saldo do mês", o valor em destaque (classe `text-destructive` se negativo) e "Entrou R$ X − pago R$ Y".
  - `GraficoReceitas({ receitas, onSelecionar }: { receitas: MesView['receitas']; onSelecionar: (r: RecebimentoItem) => void })`: título "Receitas · R$ total", a rosca e a legenda. Cada linha é um `<button>`; valor 0 aparece como "R$ 0,00 · não recebido". Estado vazio: "Nenhuma receita neste mês" + `<Link to="/nova">Cadastrar receita</Link>`.
  - `GraficoGastos({ pagas, resumo })`: título "Gastos pagos · R$ total", a rosca pequena à esquerda e, à direita, a caixa "Ainda a pagar" com um `<a href="#a-pagar">` "N contas" (N = itens `PENDENTE` da competência, com e sem valor), o total e "+ k sem valor" quando houver. Clique: `preventDefault` + `document.getElementById('a-pagar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })`. Sem pagas: círculo cinza e "Nada pago ainda". N = 0: "Tudo pago 🎉", sem link.
  - Cada rosca tem `role="img"` e `aria-label` com o resumo em texto (§6.3).
  - `MesPage`: ordem `SaldoMes` → `GraficoReceitas` → `GraficoGastos` → `ResumoMes` → seções atuais; a `Secao` "A pagar" ganha `id="a-pagar"` e `scroll-mt-4`.

- [ ] **Step 1: Testes que falham** (RTL, `MemoryRouter`):
  - `SaldoMes` com `saldoCentavos: 413000` mostra "R$ 4.130,00"; com `-5000` mostra "-R$ 50,00" (o texto exato que o `formatBRL` gera) com a classe `text-destructive`.
  - `GraficoReceitas` com 2 itens lista "Aluguel da inquilina" e "R$ 1.500,00"; clicar na linha chama `onSelecionar` com o item; um item de valor 0 mostra "não recebido"; com 0 itens mostra o link "Cadastrar receita" para `/nova`.
  - `GraficoGastos` com 2 pendentes (19000 no total) + 1 sem valor mostra o link "3 contas", "R$ 190,00" e "+ 1 sem valor"; clicar chama `scrollIntoView` no elemento `#a-pagar` (mock com `Element.prototype.scrollIntoView = vi.fn()`); sem pendentes mostra "Tudo pago 🎉".
  - `MesPage` renderiza "Saldo do mês" antes de "Receitas", e a seção "A pagar" tem `id="a-pagar"`.
- [ ] **Step 2:** `pnpm --filter @casa/web test -- mes` → FAIL.
- [ ] **Step 3:** Implementar. "Pendentes da competência" é `aPagar` (já filtrado na API), não `atrasadas`.
- [ ] **Step 4:** `pnpm --filter @casa/web test && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(web): saldo e gráficos de receitas e gastos na home`.

---

### Task 8: Web — criar receitas (tela Nova e formulários)

**Files:**
- Create: `apps/web/src/features/receitas/{queries.ts,ReceitaForm.tsx,NovaReceitaPage.tsx,RecebimentoAvulsoForm.tsx}` (+ testes dos formulários)
- Modify: `apps/web/src/features/nova/NovaPage.tsx` (+ teste), `apps/web/src/router.tsx`

**Interfaces:**
- Produces (`receitas/queries.ts`; toda mutação invalida `['mes']` e `['receitas']`, com toast de erro igual a `mes/queries.ts`):
  - `useReceitas()` → `GET /api/receitas`, key `['receitas']`.
  - `useCriarReceita()`, `useEditarReceita()` (`{ id, dados: EditarReceitaInput }`).
  - `useCriarRecebimento()`, `useEditarRecebimento()` (`{ id, dados: EditarRecebimentoInput }`), `useExcluirRecebimento()` (`id`).
- `ReceitaForm({ inicial?, onEnviar, enviando })`: campos nome, valor (texto → `parseValorBRL`) e dia; reaproveitado na edição (Task 9).
- Rotas: `/nova/receita` → `NovaReceitaPage` (cria e navega para `/mes/<atual>`); `/nova/receita-avulsa` → `RecebimentoAvulsoForm` (cria e navega para `/mes/<competenciaDe(data)>`).
- `NovaPage`: título "O que você quer lançar?"; dois `<nav>` com subtítulos "Conta" (as 3 opções atuais, `aria-label="Tipo de conta"`) e "Receita" (`aria-label="Tipo de receita"`): "Receita fixa" ("Aluguel, salário. Entra sozinha todo mês.") e "Receita só deste mês" ("Uma venda, um extra. Conta só no mês em que entrou.").

- [ ] **Step 1: Testes que falham:**
  - `NovaPage`: o heading "O que você quer lançar?"; o link "Receita fixa" vai para `/nova/receita` e "Receita só deste mês" para `/nova/receita-avulsa`; os 3 links de conta continuam lá.
  - `ReceitaForm`: enviar vazio mostra "Informe o nome" e "Valor inválido"; "1.500,00" + dia 5 chama `onEnviar({ nome, valorCentavos: 150000, diaRecebimento: 5 })`; dia 32 mostra erro.
  - `RecebimentoAvulsoForm`: a data padrão é `hojeSaoPaulo()`; enviar chama a mutação com `{ nome, valorCentavos, data }`.
- [ ] **Step 2:** `pnpm --filter @casa/web test -- nova receitas` → FAIL.
- [ ] **Step 3:** Implementar seguindo `EsporadicaForm` (react-hook-form + zodResolver + `Campo`).
- [ ] **Step 4:** `pnpm --filter @casa/web test && pnpm typecheck && pnpm lint` → PASS.
- [ ] **Step 5: Commit** `feat(web): lançar receita fixa ou só deste mês`.

---

### Task 9: Web — ver e editar receitas

**Files:**
- Create: `apps/web/src/features/receitas/ReceitaEditarPage.tsx`, `apps/web/src/features/mes/RecebimentoDialog.tsx` (+ testes)
- Modify: `apps/web/src/features/contas/ContasPage.tsx` (+ teste), `apps/web/src/features/mes/MesPage.tsx`, `apps/web/src/router.tsx`

**Interfaces:**
- Consumes: hooks e `ReceitaForm` da Task 8; `onSelecionar` do `GraficoReceitas` (Task 7).
- Produces:
  - `ContasPage`: nova `<section aria-label="Receitas fixas">` abaixo das contas, com o heading "Receitas fixas" e linhas "Nome · R$ valor · dia N" que levam a `/receitas/:id`; inativas com `opacity-60`. A frase do cabeçalho passa a ser "Contas e receitas que se repetem todo mês."
  - Rota `/receitas/:id` → `ReceitaEditarPage`: `ReceitaForm` preenchido, um botão "Desativar"/"Reativar" e um aviso abaixo do valor: "O novo valor vale a partir deste mês. Meses já ajustados à mão não mudam."
  - `RecebimentoDialog({ item, aberto, onFechar })` (usa `components/ui/dialog`): para ocorrência de fixa, só o campo "Valor deste mês" (aceita "0,00"); para avulsa, nome, valor, data e o botão "Excluir" (com confirmação). `MesPage` guarda o item selecionado no estado e abre o dialog.

- [ ] **Step 1: Testes que falham:**
  - `ContasPage` com uma receita mockada mostra o heading "Receitas fixas" e um link para `/receitas/r1`.
  - `ReceitaEditarPage` salva com `useEditarReceita` `{ id: 'r1', dados: { valorCentavos: 160000, ... } }`; "Desativar" envia `{ ativa: false }`.
  - `RecebimentoDialog` de fixa não mostra os campos "Nome" nem "Excluir"; salvar "0,00" envia `{ valorCentavos: 0 }`. Avulsa mostra "Excluir" e chama `useExcluirRecebimento` com o id.
- [ ] **Step 2:** `pnpm --filter @casa/web test -- receitas contas RecebimentoDialog` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `pnpm build && pnpm lint && pnpm typecheck && pnpm test` (raiz) → tudo verde.
- [ ] **Step 5: Commit** `feat(web): editar receitas e o valor do mês`.

---

### Task 10: Verificação no navegador e PR

**Files:** nenhum de código (os artefatos ficam em `.playwright-mcp/`, que está no `.gitignore`).

- [ ] **Step 1:** `docker compose up -d`, `pnpm dev`; `browser_resize` 390x844; login com `SEED_USER_1_*` do `apps/api/.env` (não copie a senha para lugar nenhum).
- [ ] **Step 2:** Pela tela Nova, cadastre "Aluguel da inquilina" R$ 1.500,00, dia 5, e uma receita só deste mês de R$ 200,00. Na home, confira o saldo, as 2 fatias de receita e a legenda (`browser_snapshot` + `browser_take_screenshot`).
- [ ] **Step 3:** Marque uma conta como paga → o saldo cai e aparece a fatia nos gastos pagos. Toque em "N contas" → a página rola até "A pagar" (confira `window.scrollY` com `browser_evaluate`).
- [ ] **Step 4:** Ajuste o aluguel deste mês para "0,00" pela legenda → "não recebido" aparece e o saldo cai R$ 1.500,00. Edite o cadastro para R$ 1.600,00 → este mês continua R$ 0,00 e o próximo mês (seta ›) mostra R$ 1.600,00.
- [ ] **Step 5:** `browser_emulate_media` `colorScheme: 'dark'` → screenshot; confira com `getComputedStyle` que as 6 cores das fatias são distintas e que os textos da legenda têm contraste.
- [ ] **Step 5b — riscos visuais apontados na revisão final (jsdom não pega):**
  - Depois de tocar em "N contas", o heading "A pagar" fica inteiro abaixo do header sticky (`scroll-mt` calculado em `MesPage.tsx`)? Se possível, confira também no PWA instalado com notch.
  - A rosca vazia ("Nada pago ainda") tem a mesma espessura da rosca real, e o círculo `bg-muted` aparece no modo escuro?
  - As linhas entre as fatias aparecem bem nos dois temas?
  - Com 6 contas pagas, a 6ª fatia sai cinza, igual a "Outros". Isso é aceitável?
  - Em 390px, o `size-28` ao lado de "Ainda a pagar" cabe com valores grandes ("R$ 12.345,67 + 2 sem valor")? E nomes longos nas legendas?
  - O saldo negativo (`text-destructive`) tem contraste nos dois temas?
  - O dialog "Valor deste mês" fica usável com o teclado do celular aberto?
  - Tab não para no SVG do gráfico (`accessibilityLayer={false}`)?
  - Espaçamento entre os grupos "Conta" e "Receita" em `/nova`. Receitas inativas esmaecidas na aba Contas.
  - Se algo falhar, corrija num commit antes de abrir o PR.
- [ ] **Step 6:** Push da branch `feat/receitas-e-graficos` e abra o PR para `main`, com o resumo do que foi verificado no navegador (sem dados de login) e terminando com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
