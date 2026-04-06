---
name: task
description: Open a new task following the project's one-behavior-per-task standard
disable-model-invocation: true
argument-hint: <description>
---

Define a new task for: $ARGUMENTS

## Step 1 — Clarify the behavior

Answer these questions before any code:

1. **What is the exact behavior being implemented?** (one sentence)
2. **What module does it belong to?** (invoices / extraction / categorization / transactions)
3. **What are the inputs and outputs?**
4. **What is explicitly out of scope for this task?**

## Step 2 — Check task size

If the behavior requires changes to more than one public method or more than one module, it is too big.
Propose a breakdown into smaller tasks and wait for approval.

## Step 3 — Confirm before proceeding

Present the task definition to the user in this format:

```
Task: <one-sentence description>
Module: <module name>
In scope: <bullet list>
Out of scope: <bullet list>
```

Wait for approval before starting the TDD cycle.
Use /tdd to begin once the task is approved.
