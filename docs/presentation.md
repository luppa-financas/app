# Claude Code na Engenharia Real
### Do spec ao código sem perder o controle

---

## O problema

- Você pede um CRUD, recebe código que "parece funcionar"
- Dois dias depois: bug em produção, sem testes, sem documentação

**Vibe coding não é o inimigo. Pular o raciocínio é.**
— Owain Lewis

---

## O que acontece quando você usa AI com processo

Akita, 2026 — projeto real, 8 dias:
274 commits · 4 apps · 1.323 testes · sistema em produção

> Não foi um prompt. Foi pair programming com processo.

---

## Os 7 pilares do desenvolvimento com AI

| # | Pilar | AI faz | Você faz |
|---|---|---|---|
| 1 | Requirements | sugere escopo | define o problema |
| 2 | Technical Design | apresenta trade-offs | decide a arquitetura |
| 3 | Task Breakdown | quebra em subtarefas | aprova o plano |
| 4 | Build | escreve o código | guia e revisa |
| 5 | Review | revisa o próprio trabalho | valida e aprova |
| 6 | Deploy | executa o pipeline | configura e monitora |
| 7 | Monitor | sugere alertas | define o que importa |

**AI acelera cada etapa. Não substitui nenhuma.**

---

## A camada que viabiliza tudo: CLAUDE.md

Três níveis de contexto persistente:
- **Global** — regras que valem em todos os projetos
- **Projeto** — spec viva: stack, convenções, workflow, decisões
- **Memória automática** — aprendizados acumulados entre sessões

**É a documentação que você deveria ter escrito de qualquer jeito.**

→ **[demo: abrir CLAUDE.md do Luppa]**

---

## RFCs: decisões arquiteturais como código

- Escritas *em conversa* com o agente, não sozinho
- Ficam no repositório — contexto permanente para o agente
- Rastreabilidade sem overhead: por que essa decisão foi tomada

*No Luppa:* 6 RFCs antes do primeiro `npm install`

→ **[demo: abrir docs/rfcs/]**

---

## Task Breakdown + Build: o ciclo TDD com AI

Issues do GitHub → uma tarefa = um comportamento específico

```
proposta de casos de teste → aprovação
→ testes vermelhos → implementação mínima → verde
```

TDD fica *mais* importante com AI: o agente gera rápido demais para testar na mão.

→ **[demo: mostrar issues no GitHub]**

---

## O que AI não faz por você

- Não decide arquitetura
- Não valida se resolve o problema real
- Não mantém o processo — **você mantém o processo**

**A qualidade do output reflete a qualidade do contexto que você dá.**

> "The tools are free. The judgement isn't."

---

## Call to action

1. Crie o CLAUDE.md do seu próximo projeto **antes** de abrir o editor
2. Escreva uma RFC para a próxima decisão técnica importante
3. Defina o workflow do time em skills customizadas

---

## Referências

- Owain Lewis — *Stop Vibe Coding* · github.com/owainlewis/youtube-tutorials
- Akita — *Do Zero à Pós-Produção em 1 Semana* · akitaonrails.com/2026/02/20/...
- Luppa (projeto exemplo) · github.com/[seu-usuario]/meus-cartoes
