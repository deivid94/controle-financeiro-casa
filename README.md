# Controle Financeiro da Casa

[![CI](https://github.com/deivid94/controle-financeiro-casa/actions/workflows/ci.yml/badge.svg)](https://github.com/deivid94/controle-financeiro-casa/actions/workflows/ci.yml)

PWA mobile first para as contas da casa: lista o que falta pagar no mês **na ordem certa**, marca como paga com **um toque** e guarda o histórico dos meses anteriores. Feito para substituir a pilha de boletos em papel do dia do pagamento.

### Stack

![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24-5FA04E?logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)

**Back-end**
![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Better Auth](https://img.shields.io/badge/Better_Auth-1.7-000000?logo=betterauth&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4-3E67B1?logo=zod&logoColor=white)

**Front-end**
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-4-000000?logo=shadcnui&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-8-CA4245?logo=reactrouter&logoColor=white)
![React Hook Form](https://img.shields.io/badge/React_Hook_Form-7-EC5990?logo=reacthookform&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-instalável-5A0FC8?logo=pwa&logoColor=white)

**Qualidade e infraestrutura**
![Vitest](https://img.shields.io/badge/Vitest-5-6E9F18?logo=vitest&logoColor=white)
![Testing Library](https://img.shields.io/badge/Testing_Library-React-E33332?logo=testinglibrary&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-MCP-2EAD33?logo=playwright&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-10-4B32C3?logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-3-F7B93E?logo=prettier&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?logo=githubactions&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-deploy-000000?logo=vercel&logoColor=white)
![Neon](https://img.shields.io/badge/Neon-Postgres-00E599?logo=neon&logoColor=black)

## Funcionalidades

- **Mês atual**: resumo (pendente, pago, total), atrasadas de meses anteriores, contas a pagar, pagas e canceladas.
- **Ordem de pagamento**: prioridade (`essencial` → `importante` → `normal`), depois maior valor, depois vencimento mais cedo.
- **Pagar com um toque**, com desfazer. Conta de valor variável pede o valor na hora.
- **Quatro tipos de conta**: recorrente de valor fixo (internet), recorrente de valor variável (água, luz), parcelada (IPTU, com "parcela X de N") e esporádica (só este mês).
- **Praticidade no pagamento**: link da segunda via e botão para copiar o PIX copia-e-cola ou a linha digitável.
- **Histórico** por mês, com total pago e total do mês.
- **Duas pessoas, mesmos dados**: login com sessão por cookie, sem cadastro aberto (usuários criados por seed).
- **Instalável** na tela inicial do celular (PWA).

## Estrutura

Monorepo pnpm:

```
apps/
  api/        Fastify + Prisma + Better Auth (módulos: contas, lancamentos, meses)
  web/        React + Vite + Tailwind + shadcn/ui (PWA)
packages/
  shared/     @casa/shared: tipos, schemas Zod, datas e dinheiro usados pelos dois lados
docs/         spec e plano de implementação
```

## Rodando localmente

Pré-requisitos: Node.js 24, pnpm 10 e Docker.

```bash
pnpm install
docker compose up -d                 # Postgres dev (5432) e de teste (5433)
cp apps/api/.env.example apps/api/.env   # edite os valores (veja abaixo)
pnpm build                           # gera o dist de @casa/shared, usado pelos apps
pnpm --filter @casa/api exec prisma migrate dev
pnpm --filter @casa/api seed:users   # cria os usuários do .env
pnpm dev                             # API em :3333, web em http://localhost:5173
```

No `apps/api/.env`, gere o `BETTER_AUTH_SECRET` com `openssl rand -base64 32` e **troque as senhas de exemplo** dos usuários. O seed lê `SEED_USER_1_*`, `SEED_USER_2_*`, ... em sequência; para dar acesso a mais alguém da casa, acrescente o próximo número e rode o seed de novo (quem já existe é pulado). Senha com `#` vai entre aspas.

## Scripts

| Comando          | O que faz                                                                  |
| ---------------- | -------------------------------------------------------------------------- |
| `pnpm dev`       | Sobe API e web em modo desenvolvimento                                     |
| `pnpm build`     | Build de todos os pacotes                                                  |
| `pnpm test`      | Testes (Vitest) de todos os pacotes; a API usa o Postgres de teste na 5433 |
| `pnpm typecheck` | Checagem de tipos                                                          |
| `pnpm lint`      | ESLint + Prettier (checagem)                                               |
| `pnpm format`    | Formata com Prettier                                                       |

## Convenções

- **Dinheiro** é sempre inteiro em centavos (`valorCentavos`). Nada de `float`.
- **Datas** são strings: competência `AAAA-MM`, vencimento `AAAA-MM-DD`. O "mês atual" é calculado em `America/Sao_Paulo`.
- Tudo agrega por **competência** (o mês da conta), não pela data em que foi paga.
- Domínio em português sem acento (`Conta`, `Lancamento`); infraestrutura em inglês (`buildApp`, `requireAuth`).
- **TDD**: o teste vem antes do código. Mudanças visuais no web também são conferidas no navegador com o Playwright.

Detalhes em [`CLAUDE.md`](CLAUDE.md) e na [spec](docs/superpowers/specs/2026-10-26-controle-financeiro-design.md).

## Deploy

```
push na main → GitHub Actions: build → lint → typecheck → test
                              └─ (verde) prisma migrate deploy no Neon
                                         vercel deploy --prod (API e web)
```

- **Web e API** são dois projetos na Vercel. O web faz rewrite de `/api/*` para a API, então o navegador só fala com uma origem: cookie de sessão first-party e sem CORS.
- **Banco**: Postgres no Neon (URL pooled na API, URL direta nas migrações).
- O deploy automático por Git da Vercel está desligado: produção só sobe com os testes verdes.

O passo a passo de configuração (Neon, Vercel, secrets) está em [`CLAUDE.md`](CLAUDE.md#deploy-vercel--neon--github-actions).
