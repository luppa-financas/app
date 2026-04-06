---
name: review
description: Review current changes before committing
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(git diff)
---

Review the current changes using the git diff and flag any issues before committing.

## Step 1 — Get the diff

!`git diff HEAD`

## Step 2 — Review checklist

Go through each changed file and check:

**Correctness**
- Does the implementation match the intended behavior?
- Are there edge cases not covered by tests?

**Tests**
- Is there a `*.spec.ts` for every changed source file?
- Do the tests cover the happy path, edge cases, and errors?

**Security**
- Any risk of injection (SQL, command, XSS)?
- Are inputs validated at system boundaries?
- No secrets or sensitive data hardcoded?

**Conventions (per CLAUDE.md)**
- Errors thrown with descriptive messages, caught and wrapped at service boundaries
- Interfaces defined in the consuming module
- No unhandled promise rejections
- All code and variable names in English

**Scope**
- Does this change do only what was asked?
- Any accidental changes or leftover debug code?

## Step 3 — Report

List issues found grouped by severity:
- **Blocker** — must fix before committing
- **Warning** — should fix, but not a blocker
- **Suggestion** — optional improvement

If no issues are found, confirm the changes are ready to commit.
