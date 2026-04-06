# Claude Code in Real Engineering
### From spec to code without losing control

---

## The problem

- You ask for a CRUD, you get a CRUD
- You ask for a feature, you get code that "seems to work"
- Two days later: bug in production, no tests, no documentation

**Vibe coding isn't the enemy. Skipping the reasoning is.**
— Owain Lewis, *Stop Vibe Coding*

---

## What happens when you use AI with process

Akita, 2026 — real project, 8 days:

- 274 commits
- 4 applications
- 1,323 tests
- Complete system in production

> It wasn't a prompt. It was pair programming with process.

---

## The 7 pillars of AI-assisted development

1. Requirements
2. Technical Design
3. Task Breakdown
4. Build
5. Review
6. Deploy
7. Monitor

**AI accelerates every step. It doesn't replace any.**

---

## 1. Requirements

**What we're building, for whom, and what's out of scope.**

- Prototyping is now fast enough to be a planning tool
- Defines the boundary of what the agent can decide on its own

*In Luppa:* problem defined before any line of code —
invoice upload → LLM extraction → categorization → analytics

---

## 2. Technical Design

**Architectural decisions belong to you, not to the agent.**

> "Use AI to think through trade-offs. But own the decisions."
— Owain Lewis

*In Luppa:* 6 RFCs written before the first `npm install`

→ **[demo: open docs/rfcs/ in the repository]**

---

## What an RFC is here

- Not bureaucracy — it's decision traceability
- Written *in conversation* with the agent, not alone
- Lives in the repository, becomes permanent context

**Example:** RFC 002 decided to use native PDF support in Claude
instead of bank-specific parsers.
That decision is documented, traceable, and the agent
will never question or revert it without you knowing.

→ **[demo: open RFC 002]**

---

## 3. Task Breakdown

**Don't hand the agent an entire application.**

- One task = one function or one specific behavior
- If it feels big, break it down before starting
- Each GitHub issue is an autonomous deliverable: build → review → merge

→ **[demo: show GitHub issues]**

---

## 4. Build — the TDD cycle with AI

```
proposed test cases → approval
→ write only the tests → confirm red
→ minimal implementation → confirm green
→ review together before moving on
```

**Why TDD becomes more important with AI, not less:**
the agent generates code too fast to test manually.
Tests are your safety net.

---

## The layer that enables everything: CLAUDE.md

- Persistent context file in the repository
- The agent reads it before any session
- Three levels: global → project → auto-memory

**It's the documentation you should have written anyway.**
Now it has immediate value — it doesn't sit in a wiki nobody reads.

→ **[demo: open CLAUDE.md live]**

---

## What's in Luppa's CLAUDE.md

- Product description and stack
- Module structure
- TypeScript conventions
- Consolidated architectural decisions
- **The mandatory development workflow**
- Useful commands

The agent never forgets anything that's here.

---

## 5. Review

**The step most devs skip.**

- Ask the agent to review its own work
- Then: human review + automated checks
- Edge cases, security, and validation gaps surface here

*In our workflow:* no line of code without prior approach approval.
"Decisions belong to the user. Propose, never assume."

---

## 6 and 7. Deploy and Monitor

**Deploy:** automated via pipeline — no manual deploys
- Railway (API) + Vercel (frontend) + Supabase (DB)
- `prisma migrate deploy` as an explicit CI step

**Monitor:** configured before it reaches the user
- Sentry from day 1
- No user finds an error before you do

*Decided in RFC 005 — before any infra code.*

---

## What AI doesn't do for you

- Doesn't decide architecture — it presents trade-offs, you decide
- Doesn't validate whether the solution solves the real problem
- Doesn't replace judgement on security, sensitive data, compliance
- Doesn't maintain the process — you maintain the process

**The quality of the output reflects the quality of the context you provide.**

---

## The context stack as investment

```
Global CLAUDE.md      → rules that apply across all projects
Project CLAUDE.md     → living spec, updated with every decision
RFCs                  → architectural traceability
GitHub issues         → self-contained, auditable tasks
Custom skills         → team process as code
```

The better this stack, the faster you move —
and the easier it is to onboard new devs (human or agent).

---

## For managers

- Decision traceability without extra overhead
- Faster onboarding: CLAUDE.md is the project manual
- Workflow standardization via shared skills
- TDD ensures the agent's speed doesn't become technical debt

**AI doesn't reduce the need for good practices.
It amplifies the consequences of not having them.**

---

## Call to action

1. **Today:** create your next project's CLAUDE.md before opening the editor
2. **On your next feature:** write an RFC for an important technical decision
3. **With your team:** discuss which custom skills would make sense for your workflow

> "The tools are free. The judgement isn't."

---

## References

- Owain Lewis — *Stop Vibe Coding: The 7 Stages of Software Development With AI*
  github.com/owainlewis/youtube-tutorials
- Akita — *From Zero to Production in 1 Week*
  akitaonrails.com/2026/02/20/...
- Luppa (example project for this presentation)
  github.com/[your-username]/meus-cartoes
