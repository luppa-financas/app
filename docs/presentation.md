# Claude Code in Real Engineering
### From spec to code without losing control

---

## The problem

- You ask for a CRUD, you get code that "seems to work"
- Two days later: bug in production, no tests, no documentation

**Vibe coding isn't the enemy. Skipping the reasoning is.**
— Owain Lewis

---

## What happens when you use AI with process

Akita, 2026 — real project, 8 days:
274 commits · 4 apps · 1,323 tests · system in production

> It wasn't a prompt. It was pair programming with process.

---

## The 7 pillars of AI-assisted development

| # | Pillar | AI does | You do |
|---|---|---|---|
| 1 | Requirements | suggests scope | defines the problem |
| 2 | Technical Design | presents trade-offs | decides the architecture |
| 3 | Task Breakdown | breaks into subtasks | approves the plan |
| 4 | Build | writes the code | guides and reviews |
| 5 | Review | reviews its own work | validates and approves |
| 6 | Deploy | runs the pipeline | configures and monitors |
| 7 | Monitor | suggests alerts | defines what matters |

**AI accelerates every step. It doesn't replace any.**

---

## The layer that enables everything: CLAUDE.md

Three levels of persistent context:
- **Global** — rules that apply across all projects
- **Project** — living spec: stack, conventions, workflow, decisions
- **Auto-memory** — accumulated learnings across sessions

**It's the documentation you should have written anyway.**

→ **[demo: open Luppa's CLAUDE.md]**

---

## RFCs: architectural decisions as code

- Written *in conversation* with the agent, not alone
- Stored in the repository — permanent context for the agent
- Traceability without overhead: why this decision was made

*In Luppa:* 6 RFCs before the first `npm install`

→ **[demo: open docs/rfcs/]**

---

## Task Breakdown + Build: the TDD cycle with AI

GitHub issues → one task = one specific behavior

```
proposed test cases → approval
→ red tests → minimal implementation → green
```

TDD becomes *more* important with AI: the agent generates too fast to test manually.

→ **[demo: show GitHub issues]**

---

## What AI doesn't do for you

- Doesn't decide architecture
- Doesn't validate whether it solves the real problem
- Doesn't maintain the process — **you maintain the process**

**The quality of the output reflects the quality of the context you provide.**

> "The tools are free. The judgement isn't."

---

## Call to action

1. Create your next project's CLAUDE.md **before** opening the editor
2. Write an RFC for the next important technical decision
3. Define your team's workflow in custom skills

---

## References

- Owain Lewis — *Stop Vibe Coding* · github.com/owainlewis/youtube-tutorials
- Akita — *From Zero to Production in 1 Week* · akitaonrails.com/2026/02/20/...
- Luppa (example project) · github.com/[your-username]/meus-cartoes
