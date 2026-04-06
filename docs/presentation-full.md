# Claude Code na Engenharia Real
### Do spec ao código sem perder o controle

---

## O problema

- Você pede um CRUD, recebe um CRUD
- Pede uma feature, recebe código que "parece funcionar"
- Dois dias depois: bug em produção, sem testes, sem documentação

**Vibe coding não é o inimigo. Pular o raciocínio é.**
— Owain Lewis, *Stop Vibe Coding*

---

## O que acontece quando você usa AI com processo

Akita, 2026 — projeto real, 8 dias:

- 274 commits
- 4 aplicações
- 1.323 testes
- Sistema completo em produção

> Não foi um prompt. Foi pair programming com processo.

---

## Os 7 pilares do desenvolvimento com AI

1. Requirements
2. Technical Design
3. Task Breakdown
4. Build
5. Review
6. Deploy
7. Monitor

**AI acelera cada etapa. Não substitui nenhuma.**

---

## 1. Requirements

**O que estamos construindo, para quem, e o que está fora do escopo.**

- Prototipagem agora é rápida o suficiente para ser ferramenta de planejamento
- Define o limite do que o agente pode decidir sozinho

*No Luppa:* problema definido antes de qualquer linha de código —
upload de fatura → extração via LLM → categorização → analytics

---

## 2. Technical Design

**Decisões arquiteturais pertencem a você, não ao agente.**

> "Use AI para pensar nos trade-offs. Mas seja dono das decisões."
— Owain Lewis

*No Luppa:* 6 RFCs escritas antes do primeiro `npm install`

→ **[demo: abrir docs/rfcs/ no repositório]**

---

## O que é uma RFC aqui

- Não é burocracia — é rastreabilidade de decisão
- Escrita *em conversa* com o agente, não sozinho
- Fica no repositório, vira contexto permanente

**Exemplo:** RFC 002 decidiu usar PDF nativo no Claude
em vez de parsers específicos por banco.
Essa decisão está documentada, rastreável, e o agente
nunca vai questionar ou reverter sem você saber.

→ **[demo: abrir RFC 002]**

---

## 3. Task Breakdown

**Não entregue uma aplicação inteira para o agente.**

- Uma tarefa = uma função ou um comportamento específico
- Se parece grande, quebre antes de começar
- Cada issue do GitHub é uma entrega autônoma: build → review → merge

→ **[demo: mostrar issues no GitHub]**

---

## 4. Build — o ciclo TDD com AI

```
proposta de casos de teste → aprovação
→ escreve só os testes → confirma vermelho
→ implementação mínima → confirma verde
→ review juntos antes de seguir
```

**Por que TDD fica mais importante com AI, não menos:**
o agente gera código rápido demais para testar na mão.
Os testes são sua rede de segurança.

---

## A camada que viabiliza tudo: CLAUDE.md

- Arquivo de contexto persistente no repositório
- O agente lê antes de qualquer sessão
- Três níveis: global → projeto → memória automática

**É a documentação que você deveria ter escrito de qualquer jeito.**
Agora ela tem valor imediato — não fica em uma wiki que ninguém lê.

→ **[demo: abrir CLAUDE.md ao vivo]**

---

## O que está no CLAUDE.md do Luppa

- Descrição do produto e stack
- Estrutura de módulos
- Convenções de TypeScript
- Decisões arquiteturais consolidadas
- **O workflow de desenvolvimento obrigatório**
- Comandos úteis

O agente nunca esquece nada que está aqui.

---

## 5. Review

**O passo que a maioria dos devs pula.**

- Peça ao agente para revisar o próprio trabalho
- Depois: review humano + checks automáticos
- Edge cases, segurança e gaps de validação aparecem aqui

*No nosso workflow:* nenhuma linha de código sem aprovação prévia da abordagem.
"Decisões pertencem ao usuário. Propor, nunca assumir."

---

## 6 e 7. Deploy e Monitor

**Deploy:** automatizado via pipeline — sem deploy manual
- Railway (API) + Vercel (frontend) + Supabase (DB)
- `prisma migrate deploy` como step explícito no CI

**Monitor:** configurado antes de chegar ao usuário
- Sentry from day 1
- Sem usuário encontrando erro antes de você

*Decidido no RFC 005 — antes de qualquer código de infra.*

---

## O que AI não faz por você

- Não decide arquitetura — ela apresenta trade-offs, você decide
- Não valida se a solução resolve o problema real
- Não substitui julgamento sobre segurança, dados sensíveis, LGPD
- Não mantém o processo — você mantém o processo

**A qualidade do output reflete a qualidade do contexto que você dá.**

---

## O stack de contexto como investimento

```
CLAUDE.md global      → regras que valem em todos os projetos
CLAUDE.md do projeto  → spec viva, atualizada a cada decisão
RFCs                  → rastreabilidade arquitetural
Issues do GitHub      → tarefas autocontidas, auditáveis
Skills customizadas   → processo do time como código
```

Quanto melhor esse stack, mais rápido você anda —
e mais fácil é onboarding de novos devs (humanos ou agentes).

---

## Para gestores

- Rastreabilidade de decisão sem overhead extra
- Onboarding mais rápido: o CLAUDE.md é o manual do projeto
- Padronização de workflow via skills compartilhadas
- TDD garante que a velocidade do agente não vira dívida técnica

**AI não reduz a necessidade de boas práticas.
Ela amplifica as consequências de não tê-las.**

---

## Call to action

1. **Hoje:** crie o CLAUDE.md do seu próximo projeto antes de abrir o editor
2. **Na próxima feature:** escreva uma RFC de uma decisão técnica importante
3. **No time:** discuta quais skills customizadas fariam sentido para o workflow de vocês

> "The tools are free. The judgement isn't."

---

## Referências

- Owain Lewis — *Stop Vibe Coding: The 7 Stages of Software Development With AI*
  github.com/owainlewis/youtube-tutorials
- Akita — *Do Zero à Pós-Produção em 1 Semana*
  akitaonrails.com/2026/02/20/...
- Luppa (projeto exemplo desta apresentação)
  github.com/[seu-usuario]/meus-cartoes
