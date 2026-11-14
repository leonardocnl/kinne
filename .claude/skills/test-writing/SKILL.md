---
name: test-writing
description: How to write useful automated tests and when to escalate. Use when adding or fixing tests.
---

# Test writing

## What to test

- The behavior the task promised, through the public interface of the unit.
- Edge cases: empty, one item, many, boundaries, invalid input, missing data.
- Failure paths: what happens when a dependency fails or input is rejected.

## How

- Arrange, act, assert. One behavior per test; the name says the behavior in plain words.
- Prefer real objects for pure logic; fake only I/O (network, database, clock, randomness).
- Fix time and randomness so tests are deterministic.
- Follow the style of the tests next to the code (file naming, helpers, language of names).

## When a test fails

1. Read the failure. Decide whether the test or the code is wrong.
2. If the code is wrong: report it with the failing input. Do not change application code.
3. Never loosen an assertion, add a skip or a retry just to make it green.

## Escalate instead of guessing

Return `ESCALATE: <reason>` when the same test fails after two attempts, or when the logic
is complex (algorithms, concurrency, money, security). Say what you tried.

## Never

- Screenshots, videos or visual regression tests: Leonardo checks screens manually.
- Running `npm run test:visual` or `npm run test:visual:update`, or touching
  `e2e/visual-baseline/`.
- Pointing database tests at anything but a disposable local Postgres.
