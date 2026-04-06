---
name: rfc
description: Create a new RFC document for an architectural decision
disable-model-invocation: true
argument-hint: <rfc-number> <title>
---

Create a new RFC file at `docs/rfcs/$ARGUMENTS[0]-$ARGUMENTS[1].md` following the project standard.

## RFC structure

```markdown
# RFC $ARGUMENTS[0] — <title>

## Context

What problem or decision triggered this RFC?
What constraints or requirements are in play?

## Decision

What was decided? State it clearly and directly.

## Alternatives considered

What other approaches were evaluated?
Why were they rejected?

## Consequences

What becomes easier or harder as a result of this decision?
Any trade-offs to be aware of?
```

## Rules

- Write in English
- Be direct: state the decision first, reasoning second
- No hypotheticals — only decisions that are actually being made
- After writing, summarize the key decision in one sentence for the user to confirm
