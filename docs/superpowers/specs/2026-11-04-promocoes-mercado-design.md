# Promoções de Mercado e Comparação de Preços — Design

**Data:** 2026-11-04
**Status:** rascunho, **em espera**. Não desenvolver por enquanto. A prioridade atual é colocar o app em produção e começar a usar no dia a dia. Esta feature é desejável, não necessária. **[usuário]**

Legenda das decisões:

- **[usuário]**: decidido pelo dono do projeto na conversa.
- **[Claude]**: escolha padrão feita pelo Claude; pode ser contestada na revisão.

---

## 1. Intenção e o porquê

A casa faz compras em alguns mercados da região (exemplos: **Giassi**, **Mercado Müller**, **CompFort**). **[usuário]** Esses mercados têm **dias de promoção por categoria**, como "terça da carne" no Giassi e "quinta da carne" no CompFort. **[usuário]** Eles divulgam as ofertas no **site** e no **Instagram**. **[usuário]**

Duas perguntas aparecem toda semana:

1. **"O que está em promoção hoje no mercado X?"** → feature **Promoção do dia**.
2. **"Qual é o melhor dia para comprar carne: terça no Giassi ou quinta no CompFort?"** → feature **Comparar preços**. **[usuário]**

O critério continua sendo **praticidade** (spec principal, seção 1). Se consultar o app der mais trabalho que abrir o Instagram do mercado, ele falhou.

## 2. Usuários

Os mesmos dois usuários do app, com as mesmas permissões. Os dados de mercados, promoções e preços são compartilhados, como as contas. **[Claude]**

## 3. Objetivos

### 3.1 Promoção do dia

1. Os **principais mercados da região já vêm cadastrados**: nome, unidade/cidade, link do site de ofertas e link do Instagram. A lista será levantada pelo usuário depois. **[usuário]**
1. Também é possível **cadastrar um mercado novo** pelo app (seção 6.1). **[usuário]**
2. Uma aba com um **seletor de mercado**. Ao escolher o mercado, o app mostra **a promoção do dia** dele (ex.: Giassi, terça → "Carnes"). **[usuário]**
3. Se o mercado não tiver promoção hoje, o app diz isso e mostra qual é a **próxima** (ex.: "Hoje não tem. Próxima: quinta, Hortifrúti"). **[Claude]**
4. Botões para abrir o **site de ofertas** e o **Instagram** do mercado, fora do app. **[Claude]**
5. O app **lembra o último mercado escolhido** neste aparelho. Isso é conveniência local, não dado compartilhado. **[Claude]**

### 3.2 Comparar preços

6. Escolher uma **categoria** (ex.: Carnes) e ver, lado a lado, os **dias de promoção** dessa categoria em cada mercado: Giassi terça, CompFort quinta, ... **[usuário]**
7. Para cada **produto** (ex.: "Picanha, kg"), ver o **preço** em cada mercado/dia e **destacar o mais barato**. **[usuário]**
8. Um resumo no topo com o **melhor dia para comprar** a categoria: o dia que tem **mais produtos com o melhor custo-benefício**. **[usuário]** O custo-benefício é o **preço por unidade de comparação** do mesmo produto. Exemplo: iogurte zero 1 L por R$ 20,00 num mercado e o mesmo iogurte 1 L por R$ 15,00 em outro → ganha o de R$ 15,00. **[usuário]** Tamanhos diferentes também são comparáveis depois da conversão (iogurte 500 mL por R$ 9,00 = R$ 18,00/L). **[Claude]**
9. Todo preço mostra **quando foi visto** (data) e **onde** (mercado/dia). Preço com mais de **14 dias** aparece como "antigo" e não entra no resumo. **[Claude]**

## 4. Não-objetivos (fora desta spec)

- **Ler o Instagram automaticamente.** Ver seção 7.3. O Instagram entra só como **link**. **[Claude]**
- **Registro manual de preços.** Os preços vêm da coleta automática (seção 7.2). **[usuário]** Mercado sem coleta possível mostra só os dias de promoção, sem preços.
- Lista de compras e carrinho.
- Notificação push ("hoje é dia da carne no Müller").
- Extrair texto de imagens e PDFs de folheto (OCR).
- Ligar promoções e compras às contas e lançamentos.
- Comparar produtos fora dos dias de promoção (preço de prateleira normal).

## 5. Anti-objetivos (falha mesmo funcionando)

- **Comparar coisas diferentes.** "Carne R$ 39,90" no Giassi contra "Picanha R$ 59,90/kg" no CompFort não é comparação. Só se compara o **mesmo produto na mesma unidade** (seção 6.4).
- **Preço velho apresentado como atual.** Um preço de um mês atrás decidindo o "melhor dia" é pior que não decidir.
- **Coleta que quebra em silêncio.** Se a coleta automática parar, o app precisa avisar, não mostrar uma lista vazia que parece "sem promoção".
- **Cadastro de mercado trabalhoso.** Cadastrar um mercado novo deve levar menos de um minuto.

## 6. Comportamento

### 6.1 Mercado **[usuário]**

Os principais mercados vêm pré-cadastrados (seção 8.3), e **um mercado novo pode ser cadastrado pelo app**. **[usuário]**

| Campo                | Obrigatório                     | Exemplo                           |
| -------------------- | ------------------------------- | --------------------------------- |
| Nome                 | **sim**                         | Giassi                            |
| Link de promoções    | sim, **ou** pelo menos um dia ↓ | `https://...` (página de ofertas) |
| Dias de promoção     | sim, **ou** o link ↑            | terça · Carnes                    |
| Unidade / cidade     | não                             | a definir (questão 10.1)          |
| Link do Instagram    | não                             | `https://instagram.com/...`       |
| Ativo                | padrão `true`                   | desativar esconde do seletor      |

**Regra de validação** **[usuário]**: nome obrigatório **e** (link de promoções **ou** pelo menos um dia de promoção cadastrado pelo usuário). Um mercado sem nenhum dos dois não teria o que mostrar.

**Importante sobre o link** **[Claude]**: cadastrar o link **não** liga a coleta automática sozinho. Cada site tem um formato, e a coleta precisa de um adaptador escrito para aquele mercado (seção 7.2). Até existir o adaptador, o link funciona como atalho, e a promoção do dia vem dos dias cadastrados. A tela de cadastro deve deixar isso claro (ex.: "Coleta automática: indisponível para este mercado").

Os links aceitam só `https://` e abrem fora do app, com `target="_blank"` e `rel="noopener noreferrer"`.

### 6.2 Dia fixo de promoção **[Claude]**

- Pertence a um mercado.
- **Dia da semana** (domingo a sábado) + **categoria** (ex.: Carnes, Hortifrúti, Padaria) + descrição opcional (ex.: "até 30% off").
- **Categorias vêm de uma lista fixa**, não de texto livre. Sem lista fixa, o Giassi teria "Carnes", o CompFort "Açougue" e a comparação da seção 6.4 não conseguiria juntar os dois.
- O mesmo mercado pode ter vários dias, e o mesmo dia pode ter mais de uma categoria.
- Os dias fixos dos mercados principais vêm pré-cadastrados. Depois, podem ser editados pelo app (seção 6.1).

### 6.3 Aba Mercados: Promoção do dia (mobile first)

- **"Hoje" é calculado em `America/Sao_Paulo`**, nunca em UTC, como o mês atual na spec principal. Exemplo: às 22h de terça em São Paulo ainda é terça, embora em UTC já seja quarta.
- Topo: **seletor de mercado** (`NativeSelect`, como os outros selects do app).
- Abaixo: o cartão **Hoje (terça-feira)** com as categorias em promoção e, se houver, os produtos e preços coletados para hoje (seção 6.4).
- Sem promoção hoje: "Hoje não tem promoção no Giassi. Próxima: quinta, Hortifrúti."
- Botões **Site** e **Instagram**, só os que estiverem cadastrados.

### 6.4 Comparar preços

**Produto comparável** **[Claude]**: para comparar, os preços precisam ser do **mesmo produto na mesma unidade**. Por isso existe um catálogo simples de produtos:

- Produto = nome + categoria + **unidade de comparação** (`kg`, `un`, `L`). Exemplo: "Picanha" · Carnes · kg.
- Um preço registrado sempre aponta para um produto do catálogo, nunca para um texto livre.
- Preço em embalagem (ex.: bandeja de 500 g por R$ 29,90) é convertido para a unidade de comparação (R$ 59,80/kg) na hora de registrar. A conta é feita em centavos inteiros, com arredondamento definido no código e testado.

**Tela** (dentro da mesma aba, ver 6.5):

1. Escolhe a **categoria** (ex.: Carnes).
2. Colunas = os **dias de promoção** dessa categoria (Giassi · terça, CompFort · quinta). Linhas = **produtos**.
3. Cada célula mostra o preço por unidade e a data em que foi visto. O menor preço de cada linha fica destacado.
4. Célula vazia = sem preço registrado (não é "mais caro" nem "mais barato").
5. Resumo no topo: **"Melhor dia para Carnes: terça no Giassi (mais barato em 4 de 6 produtos)"**, ou "Dados insuficientes" se houver poucos preços recentes.

No celular, com 2 ou 3 mercados, as colunas cabem. Com mais, o layout vira uma lista por produto. Isso fica a cargo de quem for construir, validando com o Playwright em 390 px.

**De onde vêm os preços**: da coleta automática (seção 7.2). **[usuário]** Sem coleta, não há preços e a comparação daquele mercado fica vazia, com o motivo visível.

### 6.5 Navegação **[Claude]**

- **Uma aba só**, chamada **Mercados**, com duas visões no topo: **Hoje** | **Comparar**. **[usuário: "uma aba selecionando o mercado"; a comparação entrar na mesma aba é escolha do Claude]**
- A barra passa a ter 5 itens: `Mês | Nova | Mercados | Histórico | Contas`. Duas abas novas (6 itens) apertariam demais a barra em 390 px.
- O botão **Nova** continua só para contas (issue #4).

## 7. Fontes de dados e riscos

### 7.1 Seed e cadastro pelo app **[usuário + Claude]**

- Mercados principais, dias fixos, categorias e o catálogo inicial de produtos entram por **seed** (como os usuários).
- Mercados novos e seus dias de promoção podem ser cadastrados pelo app (seção 6.1).

### 7.2 Coleta automática no site do mercado **[usuário: preços vêm da coleta automática; detalhes: Claude]**

É a **única fonte de preços** (sem registro manual). **[usuário]** Sem coleta funcionando, a comparação de preços daquele mercado fica vazia, e o app mostra o motivo ("coleta indisponível" ou "coleta falhou em DD/MM").

Cada site tem um formato, então a busca seria um **adaptador por mercado** atrás de uma interface comum:

```ts
interface FonteOfertas {
  mercadoId: string;
  buscar(): Promise<OfertaColetada[]>; // lança erro se o formato mudou
}
```

Riscos:

- **Formato muda sem aviso** e o adaptador quebra. Mitigação: testes com HTML salvo (fixture) e aviso visível de falha.
- **Ofertas em imagem/PDF** (folheto/tabloide): sem OCR, não dá para ler.
- **Nome do produto no site ≠ catálogo** ("PICANHA BOV RESF KG" vs "Picanha"): exige uma tabela de equivalência por mercado, mantida à mão.
- **Termos de uso**: verificar `robots.txt` e termos antes de escrever o adaptador. Se proibirem, o mercado fica só com link e dias de promoção, sem preços.
- **Frequência**: uma busca por dia, com User-Agent do app.
- **Tamanho/embalagem**: o adaptador precisa extrair o tamanho (1 L, 500 g, bandeja ~1 kg) para calcular o preço por unidade. Produto sem tamanho legível é descartado da comparação (e contado no aviso), nunca comparado "no chute".

**Agendamento** **[Claude]**: um job diário (Vercel Cron ou GitHub Actions agendado) chama uma rota protegida por segredo (`CRON_SECRET`). Falha de um mercado não impede os outros. Cada execução vira um registro de coleta (mercado, quando, sucesso/erro, quantos produtos) para a tela mostrar "atualizado em" e os avisos. Os limites de cron do plano Hobby da Vercel **não foram verificados**.

**Investigação obrigatória antes de escrever o plano:** para cada mercado da lista, anotar se as ofertas estão em texto ou imagem, se há API/JSON por trás da página, o que dizem `robots.txt` e os termos, e se os preços variam por unidade.

### 7.3 Instagram **[Claude]**

- Raspar o Instagram (scraping) **viola os termos de uso**, exige login e é bloqueado com frequência. Fora de questão.
- O caminho oficial seria a API do Meta (Instagram Graph API). Pelo que se sabe hoje, ela exige uma **conta profissional** ligada a uma página do Facebook e um **app cadastrado no Meta**. Isso **não foi verificado na documentação atual**.
- Mesmo com acesso, os posts de promoção costumam ser **imagens**, o que cai no OCR (não-objetivo).
- Conclusão: Instagram entra **só como link**.

## 8. Restrições e decisões técnicas

Seguem as convenções do projeto (`CLAUDE.md`):

- Nomes de domínio em português sem acento: `Mercado`, `PromocaoFixa`, `Categoria`, `Produto`, `PrecoVisto`, `diaSemana`.
- Dinheiro em **centavos inteiros** (`precoCentavos`). Datas como `AAAA-MM-DD` (string).
- Rotas da API exigem sessão.
- Testes: TDD com Vitest. No front-end, validar também com o Playwright.
- Regras de comparação (conversão para unidade, preço "antigo", melhor dia) ficam em **funções puras** em `@casa/shared`, testadas sem banco.

### 8.1 Modelo de dados (rascunho) **[Claude]**

```prisma
enum UnidadeComparacao {
  KG
  UN
  L
}

model Mercado {
  id           String         @id @default(uuid())
  nome         String
  unidade      String?
  urlOfertas   String?
  urlInstagram String?
  ativo        Boolean        @default(true)
  promocoes    PromocaoFixa[]
  precos       PrecoVisto[]
}

model Categoria {
  id        String         @id @default(uuid())
  nome      String         @unique // Carnes, Hortifrúti, ...
  promocoes PromocaoFixa[]
  produtos  Produto[]
}

model PromocaoFixa {
  id          String    @id @default(uuid())
  mercadoId   String
  mercado     Mercado   @relation(fields: [mercadoId], references: [id])
  categoriaId String
  categoria   Categoria @relation(fields: [categoriaId], references: [id])
  diaSemana   Int       // 0 = domingo ... 6 = sábado (convenção do JS Date.getDay)
  descricao   String?
  ativa       Boolean   @default(true)

  @@index([mercadoId])
}

model Produto {
  id          String            @id @default(uuid())
  nome        String            // "Picanha"
  categoriaId String
  categoria   Categoria         @relation(fields: [categoriaId], references: [id])
  unidade     UnidadeComparacao // preços sempre comparados nesta unidade
  precos      PrecoVisto[]

  @@unique([nome, categoriaId])
}

model PrecoVisto {
  id            String   @id @default(uuid())
  produtoId     String
  produto       Produto  @relation(fields: [produtoId], references: [id])
  mercadoId     String
  mercado       Mercado  @relation(fields: [mercadoId], references: [id])
  precoCentavos Int      // já convertido para a unidade do produto (R$/kg, R$/un, R$/L)
  vistoEm       String   // AAAA-MM-DD, dia em que o preço valia
  origem        String   // nome do adaptador que coletou
  urlOrigem     String?  // página onde o preço foi visto
  criadoEm      DateTime @default(now())

  @@index([produtoId, mercadoId, vistoEm])
}

model ColetaOfertas {
  id         String   @id @default(uuid())
  mercadoId  String
  iniciadaEm DateTime @default(now())
  sucesso    Boolean
  produtos   Int      // quantos preços foram gravados
  descartados Int     // sem tamanho legível ou sem equivalente no catálogo
  erro       String?

  @@index([mercadoId, iniciadaEm])
}
```

No `Mercado`, a regra "link **ou** pelo menos um dia" (seção 6.1) não cabe numa restrição do banco. Ela é validada no schema Zod de criação, compartilhado entre o front e a API.

O "dia de promoção" de um preço sai de `vistoEm` (dia da semana) cruzado com `PromocaoFixa`. Não é guardado de novo.

### 8.2 API (rascunho) **[Claude]**

- `GET /api/mercados`: mercados ativos (para o seletor).
- `POST /api/mercados`, `PATCH /api/mercados/:id`: cadastrar e editar mercado, já com os dias de promoção (seção 6.1).
- `POST /api/cron/coletar-ofertas`: chamada pelo agendador, protegida por `CRON_SECRET` (não por sessão).
- `GET /api/mercados/:id/hoje`: promoção do dia (ou a próxima) + preços recentes de hoje. "Hoje" é calculado no servidor em `America/Sao_Paulo`.
- `GET /api/comparar?categoria=:id`: matriz produto × (mercado, dia), preço mais recente de cada célula, data e o resumo de melhor dia.
- Validação com Zod em `@casa/shared`.

### 8.3 Dados iniciais **[usuário + Claude]**

- A lista de mercados, links e dias fixos vem do usuário (questão 10.1). Ela entra por um **script de seed idempotente** (rodar duas vezes não duplica), como o `seed:users`.
- O catálogo inicial de produtos por categoria (ex.: Carnes → Picanha, Alcatra, Patinho, Frango inteiro...; Laticínios → Iogurte zero 1 L...) também entra por seed. Como ampliar o catálogo depois está na questão 10.3.

## 9. Critérios de sucesso

Promoção do dia:

1. Escolher um mercado e ver a promoção do dia leva no máximo 2 toques a partir da barra.
2. Numa terça às 22h (São Paulo), o Giassi mostra a promoção de terça.
3. Sem promoção hoje, aparece a próxima, com dia e categoria.
4. O app reabre no último mercado escolhido.
5. Cadastrar um mercado novo exige nome e (link ou um dia de promoção). Sem os dois, o formulário mostra o erro e não salva.

Comparar preços:

6. Iogurte zero 1 L a R$ 20,00 num mercado e a R$ 15,00 em outro: o de R$ 15,00 aparece destacado como melhor custo-benefício.
7. Iogurte 500 mL a R$ 9,00 é comparado como R$ 18,00/L. Unidades diferentes nunca aparecem na mesma linha sem conversão.
8. O "melhor dia" é o dia com mais produtos de melhor custo-benefício. Com dados insuficientes, o resumo diz isso em vez de apontar um dia.
9. Preço com mais de 14 dias aparece como "antigo" e fica fora do resumo.
10. Se a coleta de um mercado falhar, a tela mostra o aviso daquele mercado ("coleta falhou em DD/MM") e os outros continuam aparecendo.

## 10. Questões em aberto (decidir antes do plano)

Já decididas em 2026-11-04 **[usuário]**: mercado novo pode ser cadastrado (nome + link ou dias); preços vêm da **coleta automática**; "melhor dia" = dia com mais produtos de **melhor custo-benefício** (preço por unidade).

Ainda em aberto:

1. **Lista de mercados**: nomes, unidade/cidade, links e dias fixos de cada um. O usuário vai trazer. Confirmar também o nome "CompFort".
2. **Investigação dos sites** (seção 7.2): feita depois de ter a lista. Mercado cujo site não permitir coleta fica sem preços. Aceitável?
3. **Catálogo de produtos**: só pelo seed, ou o app deve permitir adicionar produto novo? Com coleta automática, produto que o site oferece e não está no catálogo é descartado.
4. **Validade do preço**: 14 dias para considerar "antigo" está bom?

## 11. Deixado para quem for construir

- Nome exato das rotas e componentes.
- Layout da matriz de comparação no celular com muitos mercados.
- Ordem dos produtos e mercados (sugestão: alfabética; mercado mais barato primeiro no resumo).
- Texto exato dos estados vazios e avisos.
