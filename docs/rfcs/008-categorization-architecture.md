# RFC 008 — Categorization Architecture

## Status

**Parcialmente implementado** — MVP em andamento (issue #32). Decisões pós-MVP documentadas aqui para não se perderem.

## Contexto

Transações extraídas de faturas precisam ser categorizadas para que o produto entregue analytics de gastos úteis. A categorização envolve três camadas: inferência via LLM, aprendizado por estabelecimento, e customização por usuário.

## Decisão MVP (issue #32)

### Categorias como constantes TypeScript

Categorias e subcategorias definidas em `src/categorization/categories.ts`. Não estão no banco de dados.

**Motivo:** o produto está em fase de validação com ~100 usuários. As categorias vão mudar enquanto aprendemos o que faz sentido. Constantes permitem ajustes rápidos sem migration. Deploy é automatizado, então o custo de uma mudança é baixo.

**Sinal para migrar:** quando o primeiro usuário pedir "quero criar minha própria categoria". Esse é o momento em que a complexidade do banco passa a ter um caso de uso real.

### Fluxo de categorização

```
1. Consulta MerchantRule pelo nome do estabelecimento
   └─ Hit com confidence >= 0.9 → usa a regra, pula Claude
2. Claude categoriza no mesmo tool_use da extração
   └─ Retorna category + subcategory + confidence por transação
3. Valida categoria/subcategory contra enum fixo
   └─ Inválido → Outros + needs_review = true
4. confidence < 0.7 → Outros + needs_review = true
```

### Schema adicionado em Transaction

```prisma
category      String   @default("Outros")
subcategory   String?
confidence    Float?
needs_review  Boolean  @default(false)
```

### MerchantRule — aprendizado individual

Quando o usuário corrige uma categoria manualmente, fazemos upsert em `MerchantRule`:

```prisma
model MerchantRule {
  id          String   @id @default(cuid())
  pattern     String   @unique
  category    String
  subcategory String?
  confidence  Float
  voteCount   Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## Decisões pós-MVP (não implementar agora)

### 1. Categorias editáveis por usuário

**O que muda:** `categories.ts` deixa de ser a fonte da verdade. As categorias passam a viver no banco.

**Migration necessária:**
- Criar tabelas `Category` e `Subcategory` com `userId` opcional
  - `userId = null` → categoria global (default para todos)
  - `userId` preenchido → categoria personalizada do usuário
- Seed com as categorias atuais de `categories.ts`
- Endpoint `GET /categories` para o frontend buscar as opções disponíveis
- Remoção do arquivo `categories.ts`

**Impacto em Transaction:** nenhum — `category` e `subcategory` continuam como `String`. Não há FK para a tabela de categorias (mantém flexibilidade).

### 2. Aprendizado coletivo entre usuários (merchant learning)

**O problema:** hoje cada usuário parte do zero. Se 5 usuários diferentes categorizarem `ZE DA ESQUINA` como `Moradia → Manutenção`, essa informação fica isolada em cada `MerchantRule` individual.

**A solução:** quando `voteCount` de um padrão atingir um threshold (ex: 3 usuários independentes), a regra é promovida para **global** — passa a beneficiar todos os usuários sem que eles precisem categorizar aquele estabelecimento.

**O que muda em MerchantRule:**

```prisma
model MerchantRule {
  ...
  userId      String?  // null = regra global (promovida)
  voteCount   Int      @default(1)
  isGlobal    Boolean  @default(false)
}
```

**Fluxo de promoção:**
1. Usuário corrige categoria → upsert em `MerchantRule` com seu `userId`
2. Conta quantos usuários distintos têm a mesma regra para o mesmo padrão
3. Se `count >= 3` com mesma `category` + `subcategory` → cria/atualiza regra global (`userId = null`, `isGlobal = true`)
4. Regras globais têm prioridade na consulta antes das individuais

**Consulta atualizada:**
```
1. MerchantRule global (isGlobal = true) → prioridade máxima
2. MerchantRule do usuário (userId = current) → prioridade média
3. Claude → fallback
```

**Benefício:** reduz custo de API ao longo do tempo e melhora acertividade progressivamente sem esforço adicional do usuário.

### 3. Modal de revisão em massa no frontend

Interface para o usuário resolver todas as transações com `needs_review = true` de uma vez:
- Lista de transações com sugestão do Claude
- Usuário confirma, corrige ou deixa como Outros
- Cada interação alimenta `MerchantRule`
- Sugestão padrão: manter Outros se não lembrar

**Endpoint necessário:** `GET /transactions?needs_review=true` e `PATCH /transactions/:id` para atualização de categoria.

### 4. Threshold ajustável

Hoje o threshold de confiança é hardcoded em `0.7`. No futuro pode ser uma configuração por usuário ou até aprendida automaticamente com base na taxa de correções do usuário.

---

## O que NÃO muda entre MVP e pós-MVP

- `category` e `subcategory` em `Transaction` são sempre `String` — sem FK para tabela de categorias. Isso garante que renomear ou deletar uma categoria não quebra dados históricos.
- O fluxo de categorização (consulta MerchantRule → Claude → fallback) é o mesmo. Só a fonte das categorias válidas muda (constantes → banco).
- `needs_review` e `confidence` continuam com o mesmo significado.
