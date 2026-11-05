# Receitas e Gráficos na Home — Design

**Data:** 2026-11-05
**Status:** aprovado pelo usuário em 2026-11-05.

Legenda das decisões:

- **[usuário]**: decidido pelo dono do projeto na conversa.
- **[Claude]**: escolha padrão feita pelo Claude; pode ser contestada na revisão.

Mockups da conversa: `.superpowers/brainstorm/369-1793847794/content/layout-home.html` (opção A escolhida) e `gastos-saldo.html` (versão 2 escolhida). Estão no `.gitignore`, então servem só de referência local.

---

## 1. Intenção e o porquê

Hoje o app só conhece **saídas** (`Conta` e `Lancamento`). A casa também tem **entradas**, como o aluguel pago pela inquilina, que chega todo mês. **[usuário]** O casal quer abrir a home e ver, num relance:

1. **de onde veio o dinheiro** do mês (gráfico de pizza de receitas); **[usuário]**
2. **no que ele foi gasto** (gráfico de pizza de gastos: luz, água, telefone, internet...); **[usuário]**
3. **quanto ainda falta pagar**, com um atalho para essas contas; **[usuário]**
4. um **saldo** que **vai deduzindo** conforme as contas são marcadas como pagas. **[usuário]**

O critério do app continua sendo **praticidade** (spec principal). A receita fixa precisa ser cadastrada **uma vez só** e aparecer sozinha todo mês. **[usuário]**

## 2. Objetivos

### 2.1 Cadastro de receitas

1. A tela **Nova** (barra inferior) passa a oferecer **Receita** além de conta. **[usuário]** Formato **[Claude]**: a tela `/nova` ganha duas opções novas na mesma lista, abaixo das três de conta, separadas por um subtítulo:
   - Seção "Conta": "Só este mês", "Todo mês", "Parcelada" (como hoje).
   - Seção "Receita": **"Receita fixa"** (todo mês, ex.: aluguel da inquilina) e **"Receita só deste mês"** (ex.: uma venda).
   O título da tela muda de "Com que frequência?" para "O que você quer lançar?". **[Claude]**
2. **Receita fixa** **[usuário]**: nome, valor (obrigatório, > 0) e dia do recebimento (1–31). Ela aparece sozinha todo mês, a partir do mês de cadastro, como uma conta `RECORRENTE_FIXA`.
3. **Receita só deste mês** **[Claude]**: nome, valor e data em que entrou. Conta só no mês dessa data (competência = `AAAA-MM` da data).
4. **Não existe "marcar como recebido".** Uma receita cadastrada já conta como dinheiro que entrou no mês. **[Claude]**
5. **Editar o valor de uma receita fixa** (ex.: aumento do aluguel) passa a valer **a partir do mês atual**. **[usuário]** Os meses passados guardam o valor antigo. **[Claude]** Regra exata **[Claude]**: a edição atualiza o cadastro **e** as ocorrências já geradas com competência ≥ mês atual (fuso SP). Isso difere das contas, em que a edição só afeta ocorrências ainda não geradas. A diferença é proposital: o usuário espera ver o novo valor já no mês corrente.
   - **Ajuste manual sobrevive** **[Claude]**: só são atualizadas as ocorrências (competência ≥ mês atual) cujo valor ainda é **igual ao valor antigo do cadastro**. Uma ocorrência ajustada à mão (regra 7) fica como está. Exemplo: novembro foi ajustado para R$ 1.200 e o aluguel sobe de R$ 1.500 para R$ 1.600. Novembro fica com R$ 1.200, e dezembro (se já gerado com R$ 1.500) passa a R$ 1.600. Assim não é preciso uma coluna nova.
   - Mudar o **nome** também se espalha para as ocorrências de competência ≥ mês atual. Mudar o **dia** recalcula a `data` delas. **[Claude]**
6. **Desativar** uma receita fixa (ex.: a inquilina saiu) para de gerá-la nos meses futuros e remove as ocorrências de competência > mês atual. As do mês atual e anteriores ficam. **[Claude]**
   - **Reativar** **[Claude]**: ao reativar, `inicioCompetencia` passa a ser o mês atual (fuso SP). A geração recomeça dali, sem preencher os meses em que ela ficou desligada. Exemplo: a inquilina sai em novembro e uma nova chega em março. Dezembro a fevereiro continuam sem receita. Por isso a geração de recebimentos parte de `inicioCompetencia`, e não do `createdAt`.
7. **Corrigir erro** **[Claude]**: uma receita só deste mês pode ser editada (nome, valor, data) ou excluída. Uma ocorrência de receita fixa pode ter o **valor daquele mês** ajustado (ex.: a inquilina pagou a menos) sem mudar o cadastro.
   - **Mês sem pagamento** **[usuário]**: se a inquilina não pagar num mês, ajusta-se o valor daquela ocorrência para **R$ 0,00**. Por isso o ajuste por mês aceita `valorCentavos >= 0`, enquanto o cadastro da fixa e a receita só deste mês continuam exigindo `> 0`. O mês seguinte volta ao valor do cadastro normalmente. Uma ocorrência de R$ 0,00 não vira fatia, mas continua na legenda como "R$ 0,00 · não recebido", para poder ser tocada e corrigida. **[Claude]**

### 2.2 Onde as receitas são vistas e editadas **[Claude]**

8. A aba **Contas** ganha uma segunda seção, **"Receitas fixas"**, abaixo das contas, com o mesmo formato de linha ("Aluguel da inquilina · R$ 1.500,00 · dia 5"). Tocar abre a edição (`/receitas/:id`). Inativas aparecem esmaecidas, como as contas inativas.
9. Na home, cada linha da **legenda do gráfico de receitas** é tocável e abre a edição daquela ocorrência do mês (valor do mês; para receita só deste mês também nome, data e excluir).

### 2.3 Home: gráficos (layout escolhido)

Ordem na tela do mês (`/mes/:competencia`), de cima para baixo **[usuário: opção A, um embaixo do outro]**:

10. Cabeçalho "‹ Novembro 2026 ›" (como hoje).
11. **Saldo do mês** em destaque **[Claude]**: `receitas do mês − gastos pagos do mês`. Linha de apoio: "Entrou R$ X − pago R$ Y". Saldo negativo aparece em vermelho com sinal de menos. **[Claude]**
12. **Card Receitas**: título "Receitas · R$ total", pizza (rosca) com uma fatia por receita do mês, legenda com cor, nome e valor. **[usuário]**
13. **Card Gastos pagos**: título "Gastos pagos · R$ total", pizza **pequena à esquerda** com uma fatia por conta **já paga** no mês e, **à direita**, a caixa **"Ainda a pagar: N contas · R$ total"**. **[usuário: versão 2, resumo no canto direito]** A legenda das fatias fica embaixo.
    - **"N contas" é um link** **[usuário]**: ao tocar, a tela **rola suavemente até a seção "A pagar"** da própria home (âncora `#a-pagar`). **[Claude, aceito pelo usuário]** Não há tela nova.
    - Pendentes **sem valor** entram na contagem N, mas não somam ao total. Exemplo: "3 contas · R$ 190,00 + 1 sem valor". **[Claude]**
    - "Ainda a pagar" considera **só a competência exibida** (não inclui as atrasadas de meses anteriores, que já têm seção própria). **[Claude]**
14. Abaixo, tudo o que existe hoje: o card `ResumoMes` ("A pagar / Pago / Total do mês") fica **[Claude]**, e depois as seções Atrasadas, A pagar, Pagas e Canceladas, sem mudança.

### 2.4 Regras de cálculo

15. Tudo agrega **por competência** (convenção do projeto). Uma receita fixa com dia 5 conta em novembro mesmo que tenha caído dia 7.
16. **Gastos pagos** = lançamentos `PAGA` da competência exibida. Contas `CANCELADA` nunca entram. Uma conta paga com valor nulo não vira fatia (não tem tamanho). **[Claude]**
17. **Fatias demais** **[Claude]**: no máximo 6 fatias por gráfico (uma por cor do tema). Com mais de 6 itens, ficam os 5 maiores (por valor desc) e o resto se junta numa fatia "Outros". A legenda lista todas.
18. **Mês futuro** (mês atual + 1, o limite da navegação): as receitas fixas já aparecem (a geração vai até o próximo mês). Os gastos pagos normalmente estão vazios.
19. **Estados vazios** **[Claude]**:
    - Sem receitas no mês: o card mostra "Nenhuma receita neste mês" e um link "Cadastrar receita" para `/nova`. Sem pizza.
    - Sem gastos pagos: um círculo cinza vazio com "Nada pago ainda". A caixa "Ainda a pagar" continua aparecendo.
    - Nada pendente: a caixa mostra "Tudo pago 🎉", sem link.

## 3. Não-objetivos

- Categorias de gasto (agrupar "luz + água" em "Moradia"). Cada fatia é uma conta. **[Claude]**
- Receita parcelada ou com valor variável que pede confirmação mensal.
- Marcar uma receita como "recebida ou pendente".
- Gráficos no Histórico ou comparação entre meses.
- Saldo acumulado entre meses (o que sobrou em outubro não passa para novembro). **[Claude]**
- Uma tela nova ou rolagem infinita para as contas a pagar. **[Claude, aceito pelo usuário]**

## 4. Anti-objetivos (falha mesmo funcionando)

- **Saldo que mente.** Se o saldo contar uma conta cancelada, contar duas vezes uma conta paga nos dois celulares ao mesmo tempo ou usar o mês UTC, ele perde a razão de existir.
- **Gráfico que empurra a lista para longe sem servir de atalho.** O link "N contas" precisa funcionar, porque é a ponte entre o resumo e a ação.
- **Aumento do aluguel que não aparece.** Editar o valor e continuar vendo o valor antigo no mês atual é exatamente o que o usuário pediu para evitar.
- **Gráfico ilegível no modo escuro** ou cores de fatia indistinguíveis.

## 5. Restrições

- Convenções do `CLAUDE.md`: centavos inteiros, competência `AAAA-MM`, datas `AAAA-MM-DD` em string, mês atual em `America/Sao_Paulo`, `pt-BR` na exibição, nomes de domínio em português sem acento, TDD com Vitest e teste no navegador com o MCP do Playwright (390x844, claro e escuro).
- Toda rota nova exige sessão (`requireAuth`).
- **Migração retrocompatível** (deploy roda `migrate deploy` antes do código novo): só tabelas e colunas novas, nada removido ou renomeado.
- A geração nunca passa de mês atual + 1, igual às contas.

## 6. O "como" já decidido

### 6.1 Modelo de dados **[Claude]**

O modelo espelha o par `Conta` / `Lancamento`, que o time já entende:

```prisma
model Receita {            // cadastro de receita fixa
  id                String  @id @default(cuid())
  nome              String
  diaRecebimento    Int     // 1–31; meses curtos usam o último dia (mesma regra de vencimentoNoMes)
  valorCentavos     Int
  inicioCompetencia String  // AAAA-MM do cadastro (fuso SP)
  ativa             Boolean @default(true)
  recebimentos      Recebimento[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Recebimento {        // ocorrência no mês (fixa gerada ou só deste mês)
  id            String   @id @default(cuid())
  receitaId     String?  // null = receita só deste mês
  receita       Receita? @relation(fields: [receitaId], references: [id])
  nome          String
  competencia   String   // AAAA-MM
  data          String   // AAAA-MM-DD
  valorCentavos Int
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([receitaId, competencia])
  @@index([competencia])
}
```

- A geração de recebimentos fica numa função pura em `apps/api/src/domain/` (ex.: `planejarRecebimentos`), no mesmo estilo de `planejarLancamentos`, idempotente pelo `@@unique`. Ela roda junto com `garantirLancamentos` quando o mês é carregado.
- Exclusão de uma receita só deste mês é exclusão real (`delete`), porque não há histórico de pagamento a preservar.

### 6.2 API **[Claude]**

- `GET /api/meses/:competencia` ganha o campo `receitas` no `MesView` (já calculado no servidor, para o front só desenhar):
  ```ts
  receitas: {
    itens: { id, receitaId: string | null, nome, data, valorCentavos }[]; // ordenados por valor desc
    totalCentavos: number;
  };
  saldo: {
    receitasCentavos: number;
    pagoCentavos: number;      // = resumo.totalPagoCentavos
    saldoCentavos: number;     // receitas − pago (pode ser negativo)
    depoisDeTudoCentavos: number; // receitas − (pago + pendente com valor)
  };
  ```
  Adicionar campos ao `mesViewSchema` é retrocompatível para o web, que ignora o que não conhece.
- Módulo novo `apps/api/src/modules/receitas/` em camadas (routes → controller → service → repository), como `contas`:
  - `GET /api/receitas`: lista as fixas (ativas e inativas).
  - `POST /api/receitas`: cria uma fixa.
  - `PATCH /api/receitas/:id`: edita a fixa (regra 2.1.5) ou ativa/desativa (regra 2.1.6).
  - `POST /api/recebimentos`: cria uma receita só deste mês.
  - `PATCH /api/recebimentos/:id`: ajusta uma ocorrência (valor; para avulsa também nome e data).
  - `DELETE /api/recebimentos/:id`: só para avulsas (`receitaId` nulo); em ocorrência de fixa, 400.
- Schemas Zod de entrada e saída em `packages/shared/src/schemas/receita.ts`.

### 6.3 Front-end **[Claude]**

- Feature nova `apps/web/src/features/receitas/` (formulários, queries do TanStack Query, página de edição).
- Componentes da home em `apps/web/src/features/mes/`: `SaldoMes`, `GraficoReceitas`, `GraficoGastos`.
- Biblioteca de gráfico: **componente Chart do shadcn (Recharts por baixo)**, porque o projeto já usa shadcn e os tokens de cor do tema. Antes de instalar, conferir a versão estável atual e a API no Context7 (convenção do projeto). O desenho é de rosca (`PieChart` com `innerRadius`).
- Cores das fatias vêm de tokens CSS (`--chart-1` … `--chart-6` do shadcn), definidos para o tema claro e o escuro.
- Acessibilidade: cada gráfico tem `aria-label` com o resumo em texto ("Receitas: Aluguel da inquilina R$ 1.500,00, Salário R$ 3.000,00"), e a legenda em texto sempre aparece. O gráfico nunca é a única forma de ler os números.
- A seção "A pagar" em `MesPage` ganha `id="a-pagar"`. O link "N contas" usa `scrollIntoView({ behavior: 'smooth' })`, compensando o cabeçalho, se ele for fixo.
- Depois de criar ou editar uma receita, invalidar a query do mês afetado para a home atualizar. Marcar uma conta como paga já invalida o mês hoje, e o saldo vem junto.

## 7. O que fica para quem implementar

- Cor exata de cada fatia e do saldo positivo/negativo, desde que haja contraste nos dois temas (verificar com `getComputedStyle` + `browser_emulate_media`).
- Animação do gráfico (pode ser nenhuma).
- Textos de validação dos formulários (seguir o padrão de `EsporadicaForm`).
- Divisão em tarefas e a ordem de implementação (o plano).
