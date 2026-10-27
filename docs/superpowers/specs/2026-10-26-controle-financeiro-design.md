# Controle Financeiro da Casa — Design

**Data:** 2026-10-26
**Status:** rascunho para aprovação

Legenda das decisões:
- **[usuário]** — decidido pelo dono do projeto na conversa.
- **[Claude]** — escolha padrão feita pelo Claude; pode ser contestada na revisão.

---

## 1. Intenção e o porquê

Todo mês o usuário recebe no dia 5 e, no dia 6, senta à mesa com uma pilha de **boletos em papel** e o celular. Paga cada boleto escaneando o QR code no app do banco (PIX). O problema: com o papel não fica claro **o que já foi pago, o que ainda falta, e quais gastos são fixos ou esporádicos**. **[usuário]**

O app resolve isso: uma lista do mês, no celular, que mostra o que falta pagar na ordem certa, deixa marcar como pago com um toque e guarda o histórico dos meses anteriores.

O critério que manda em todas as decisões de produto é **praticidade**. **[usuário]** Se usar o app der mais trabalho que papel e caneta, ele falhou.

O projeto também é um **projeto de aprendizado**: o dono é engenheiro de software júnior e quer aprender construindo (principalmente Fastify). **[usuário]** O código deve ser legível e organizado de um jeito que ensine, em camadas claras, em vez de "esperto".

## 2. Usuários

- **Duas pessoas** da mesma casa, com **as mesmas permissões**: cadastrar contas, lançar, consultar e marcar como pagas. **[usuário]**
- Todos os dados são compartilhados entre os dois usuários. Não existe o conceito de "casa" ou "grupo" no modelo, porque há uma casa só. **[Claude]**
- **Não há cadastro aberto.** Os dois usuários são criados por um script de seed, a partir de variáveis de ambiente. **[Claude, aceito pelo usuário]**

## 3. Objetivos

1. Ver as contas do mês **pendentes**, ordenadas por **prioridade → valor (maior primeiro) → vencimento (mais cedo primeiro)**. **[usuário]**
2. Marcar uma conta como paga com **um toque**.
3. Suportar os **quatro tipos de conta** **[usuário]**:
   | Tipo | Exemplos | Comportamento |
   |---|---|---|
   | Recorrente, valor variável | água, luz | Aparece todo mês; o valor é informado quando o boleto chega |
   | Recorrente, valor fixo | internet, taxa do lixo | Aparece todo mês com o valor já preenchido |
   | Parcelada | IPTU | Aparece até a última parcela; mostra "parcela X de N, faltam Y" |
   | Esporádica | conserto, compra pontual | Lançada uma vez, num mês específico |
4. **Prioridade por conta**: `essencial`, `importante`, `normal`. **[usuário aprovou a sugestão do Claude]**
5. **Histórico**: meses anteriores, com o que foi pago e o **total do mês**. **[usuário]**
6. **Praticidade no pagamento** **[Claude, sem objeção do usuário]**:
   - cada conta pode guardar o **link do site da segunda via**, que abre com um toque;
   - cada lançamento pode guardar o **código PIX copia-e-cola ou a linha digitável**, com botão "copiar".
7. **Mobile first** e instalável na tela inicial (PWA). **[usuário: mobile first; Claude: PWA]**

## 4. Não-objetivos (fora da v1)

- Ler QR code ou código de barras pela câmera. **[usuário: "vou integrando aos poucos"]**
- Integração com banco ou pagamento de dentro do app. **[usuário]**
- Notificações e lembretes de vencimento. **[Claude: não foi pedido]**
- Uso offline. O PWA é instalável, mas precisa de internet. **[Claude]**
- Gráficos e relatórios além do total mensal. **[Claude]**
- Recuperação de senha por e-mail. Se alguém esquecer, um script troca a senha. **[Claude]**
- Várias casas ou grupos de usuários.

## 5. Anti-objetivos (falha mesmo funcionando)

- **Mais trabalho que o papel**: muitos toques para marcar como pago, formulários longos ou telas que exigem zoom no celular.
- **Valores errados**: qualquer erro de centavo, total que não bate, conta paga aparecendo como pendente ou parcela contada errado.
- **Conta que some**: uma conta recorrente que não aparece no mês, ou uma parcela que é pulada.

## 6. Comportamento

### 6.1 Contas cadastradas e lançamentos

Há dois conceitos:

- **Conta** (o "modelo"): o que se repete. Tem nome, tipo, prioridade, dia de vencimento (1–31), valor padrão (para tipo fixo e parcelado), número total de parcelas e mês da primeira parcela (para parcelada), link da segunda via e se está ativa.
- **Lançamento** (a ocorrência num mês): pertence a um mês de competência (`AAAA-MM`). Tem vencimento (data), valor (pode estar vazio no tipo variável), status (`pendente` | `paga` | `cancelada`), data do pagamento, quem marcou como paga, número da parcela (se parcelada), código PIX/linha digitável e observação.

**Mês de competência manda em tudo** **[usuário]**: um lançamento conta sempre no mês a que pertence, não no mês em que foi pago. A luz de setembro paga em 5 de outubro entra no total pago de **setembro**. Uma conta de novembro paga adiantada em outubro entra em **novembro**. Seções, resumos e histórico agregam por competência; a data do pagamento é só informativa.

**Cancelada** **[Claude]**: para um boleto que não veio no mês, uma esporádica lançada por engano ou uma pendência que não deve ser paga. Um lançamento cancelado não aparece nas listas de pendentes, não entra em nenhum total e **não é gerado de novo** (ele continua ocupando o par (conta, mês)). Pode voltar para pendente. Numa parcelada, uma parcela cancelada não conta como paga.

Uma **esporádica** é um lançamento sem conta-modelo, com nome e prioridade próprios. **[Claude]** Para listar e ordenar de forma uniforme, todo lançamento guarda nome e prioridade. Nos recorrentes, esses campos são copiados da conta no momento em que o lançamento é gerado. **[Claude]**

### 6.2 Geração dos lançamentos do mês **[Claude]**

- Quando um mês é consultado, a API gera os lançamentos que faltam daquele mês para cada conta ativa. A geração é **idempotente**: há uma restrição de unicidade em (conta, mês), então consultas repetidas ou simultâneas (os dois usuários abrindo o app juntos) nunca duplicam lançamentos.
- **Não há cron.** Uma tarefa agendada é mais uma peça para configurar e quebrar no modelo serverless.
- **Meses que ninguém abriu são preenchidos.** Ao consultar um mês, a API gera os lançamentos faltantes de **todos os meses**, desde o início de cada conta até o mês consultado (com limite no próximo mês). Se ninguém abrir o app em novembro e alguém abrir em dezembro, as contas de novembro são criadas e aparecem em "Atrasadas". O que já foi pago fora do app, o usuário marca como paga ou cancela. Isso garante o anti-objetivo "conta que some" e que nenhuma parcela seja pulada.
- Nunca se gera lançamento de um mês **anterior** ao mês em que a conta foi cadastrada (ou ao mês da primeira parcela, no caso de parcelada).
- Pode-se consultar e gerar o **próximo mês**, para quem quiser adiantar pagamentos ("posso fazer antes" **[usuário]**). Meses além do próximo não são gerados.
- **Recorrente fixa:** o valor vem do valor padrão da conta.
- **Recorrente variável:** o valor fica vazio até o usuário digitar.
- **Parcelada:** número da parcela = (meses desde o mês da primeira parcela) + 1. Se passar do total, nada é gerado. "Faltam Y" = parcelas a partir do cadastro no app que ainda não foram pagas = (total − número da primeira parcela gerada + 1) − parcelas pagas. Parcelas anteriores ao cadastro não contam como faltando; uma parcela cancelada continua contando.
- **Dia de vencimento maior que o último dia do mês** (por exemplo, dia 31 em fevereiro): usa o último dia do mês.
- Alterar uma conta (valor, prioridade, nome) afeta só os lançamentos **ainda não gerados**. Os já gerados podem ser editados individualmente.
- Desativar uma conta para de gerar lançamentos novos e não apaga o histórico.

### 6.3 Tela principal (mês atual) — mobile first

Seções, de cima para baixo **[Claude]**:

1. **Resumo do mês:** total pendente, total pago e total do mês, todos **só dos lançamentos com competência neste mês** e sem os cancelados. Atrasadas de meses anteriores não entram nesses números; a seção delas mostra o próprio total. Lançamento variável sem valor não entra na soma, e o resumo indica "N contas sem valor". **[Claude]**
2. **Atrasadas:** lançamentos pendentes de meses anteriores. Só aparece se houver algum. Ao pagar uma atrasada, ela conta no total pago do mês dela. **[Claude: uma conta não paga não pode simplesmente sumir quando o mês vira]**
3. **A pagar:** pendentes do mês, ordenados por **prioridade → valor (desc) → vencimento (asc)**. **[usuário]**
   - Lançamento variável ainda sem valor: na ordenação usa como estimativa o valor do mesmo lançamento no mês anterior, exibido como "~R$ X (mês passado)". Sem histórico, vai para o fim do seu grupo de prioridade. **[Claude]**
   - Cada item mostra: nome, valor, vencimento, prioridade, "parcela X de N, faltam Y" (se parcelada), botão de segunda via (se houver link) e botão "copiar código" (se houver código).
4. **Pagas:** lançamentos pagos **com competência neste mês** (mesmo que pagos em outro mês), com a data do pagamento e quem pagou.
5. **Canceladas:** recolhida por padrão, para poder reverter um cancelamento.

Ações:
- **Marcar como paga**: um toque. Se o valor estiver vazio (tipo variável), primeiro pede o valor, num campo único já focado com teclado numérico.
- **Desfazer**: um lançamento pago pode voltar para pendente (para corrigir toques errados).
- **Cancelar** ("não veio / remover"): leva o lançamento para `cancelada`. Pede confirmação, porque tira o lançamento dos totais.
- **Lançar esporádica**: formulário curto (nome, valor, vencimento, prioridade).
- Navegar para o **mês anterior** e para o **próximo**.

### 6.4 Histórico

- Lista de meses com total pago e total do mês, agregados por **competência**. **[usuário]** O total de um mês passado pode mudar depois, quando uma atrasada dele é paga. Isso é esperado.
- Ao tocar num mês, abre a mesma visão da tela principal para aquele mês.

### 6.5 Cadastro de contas

- Listar, criar, editar e desativar contas-modelo.
- Os campos exibidos dependem do tipo. Por exemplo, "total de parcelas" só aparece na parcelada.

### 6.6 Dinheiro e datas **[Claude]**

- Valores guardados como **inteiro em centavos** (R$ 123,45 → `12345`). Nada de `float` em lugar nenhum.
- Exibição em `pt-BR` (`R$ 1.234,56`), fuso `America/Sao_Paulo`.
- O "mês atual" é calculado no fuso de São Paulo, não em UTC.

## 7. Restrições e decisões técnicas

| Decisão | Escolha | Origem |
|---|---|---|
| Linguagem | TypeScript, front e back | [usuário] |
| Back-end | **Fastify** (para aprender), em camadas: rotas → controller → service → repository; *hooks*/plugins no lugar dos middlewares | [usuário] |
| Validação | **Zod**, com `fastify-type-provider-zod` na API; schemas compartilhados com o front | [usuário, após discutir TypeBox] |
| Banco | **PostgreSQL** no **Neon** | [usuário: Postgres; hospedagem escolhida na opção A] |
| ORM | **Prisma** | [usuário] |
| Autenticação | **Better Auth**, e-mail + senha, cadastro desligado, sessão em cookie, adaptador Prisma, integração oficial com Fastify | [usuário, após descartar o Auth.js por não ter suporte oficial ao Fastify] |
| Front-end | **React + Vite + Tailwind + shadcn/ui** | [usuário: React/Tailwind/shadcn; Claude: Vite] |
| Dados no front | TanStack Query; formulários com React Hook Form + Zod | [Claude] |
| PWA | `vite-plugin-pwa` | [Claude] |
| Repositório | Monorepo **pnpm workspaces**: `apps/api`, `apps/web`, `packages/shared` (schemas Zod e tipos) | [Claude] |
| Hospedagem | **Vercel** (front + API Fastify como serverless functions) + **Neon** | [usuário: opção A] |
| CI | **GitHub Actions**: lint, typecheck e testes a cada push/PR; deploy em produção só se passar | [usuário: GitHub Actions; Claude: o gate] |
| Testes | **Vitest**, com TDD nas regras de negócio | [Claude] |

Pontos que precisam ser **verificados na documentação atual** durante o plano, e não supostos de memória:
- como rodar Fastify na Vercel como função e os limites do plano gratuito;
- Prisma com Neon em serverless (driver/adapter e pooling de conexões);
- configuração do Better Auth com Fastify + Prisma e a opção de desligar o cadastro;
- versões compatíveis entre `fastify-type-provider-zod`, Zod e Fastify.

**Segurança mínima:** todas as rotas exceto as de autenticação exigem sessão (um *hook* de pré-handler). Segredos só em variáveis de ambiente, nunca no repositório. Limite de tentativas no login (Better Auth).

## 8. Critérios de sucesso

- No dia 6, o usuário abre o app no celular e vê, sem rolar demais, o que falta pagar na ordem certa.
- Marcar uma conta de valor fixo como paga leva **1 toque**; uma de valor variável leva **digitar o valor + 1 toque**.
- Água, luz, internet, taxa do lixo e IPTU aparecem sozinhos no mês seguinte, sem cadastrar de novo.
- O IPTU mostra corretamente quantas parcelas faltam e para de aparecer depois da última.
- Os totais do histórico batem, até o centavo, com a soma dos lançamentos pagos de cada competência.
- Se ninguém abrir o app num mês, as contas desse mês aparecem como atrasadas no mês seguinte.
- As duas pessoas usam ao mesmo tempo sem duplicar ou perder lançamentos.

## 9. Deixado para quem for construir

- Estrutura interna de pastas de cada app, nomes de arquivos e rotas exatas da API.
- Schema Prisma detalhado (nomes de tabelas e colunas, índices além da unicidade (conta, mês)).
- Componentes shadcn específicos e o visual (respeitando mobile first e alvos de toque grandes).
- Como o deploy é disparado (integração Git da Vercel com checks obrigatórios, ou deploy pelo próprio Actions), desde que o deploy de produção dependa dos testes passarem.
- Ferramentas de lint e formatação.
- O CLAUDE.md do projeto, criado junto com o usuário assim que a estrutura existir.
