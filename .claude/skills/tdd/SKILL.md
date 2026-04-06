---
name: tdd
description: Guide the TDD cycle step by step for the current task
disable-model-invocation: true
---

Follow this TDD rhythm strictly. Do not skip or merge steps.

## Step 1 — Propose test cases

List the test cases in plain text for the behavior described in $ARGUMENTS.
Cover: happy path, edge cases, and error scenarios.

Wait for approval before writing any code.

## Step 2 — Write the tests only

Write only the test file (`*.spec.ts`) with the proposed cases.
Do not write any implementation yet.
Confirm the tests are red (failing) before proceeding.

## Step 3 — Write the minimal implementation

Write the minimum code needed to make the tests pass.
Do not add anything beyond what the tests require.

## Step 4 — Confirm green and review

Show the passing test output.
Review the implementation together before moving on.

## Rules

- One behavior per cycle. If the task feels big, break it down first.
- Tests are colocated with source: `foo.service.spec.ts` next to `foo.service.ts`
- No unhandled promise rejections
- All code and variable names in English
