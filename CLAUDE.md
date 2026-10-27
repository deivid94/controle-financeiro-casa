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
