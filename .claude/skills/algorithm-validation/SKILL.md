---
name: algorithm-validation
description: How to change recommendation, ranking or scoring logic and prove the effect with reference tests and measurements. Use for algorithm and data pipeline work.
---

# Algorithm validation

## Before changing

- Write the current behavior in plain words and with one concrete example input/output.
- State the hypothesis: "changing X should make Y happen for inputs like Z".

## Keep it testable

- Pure functions for scoring and ranking; inject the clock, randomness and data sources.
- Seeded randomness so results are reproducible.

## Reference (golden) tests

- A small set of realistic inputs with the expected output, reviewed by Leonardo.
- When behavior changes on purpose, update the expected outputs in the same change and
  explain each difference.

## Kinne specifics

- Golden tests: `src/domain/feelings-golden.ts` and `src/domain/feelings-golden.test.ts`.
- Calibration scripts (`feelings:calibrate`, `graph:build`, `daily:pick`) touch shared data:
  run them only with Leonardo's ok for that run.

## Measure

- Compare before and after on the same inputs: what moved, by how much, any regressions.
- Report numbers, not impressions. Magic constants need a comment with their justification.

## Ask

- What a "good" result is (what to favor, what to avoid) is a product decision for Leonardo.
