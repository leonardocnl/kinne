---
name: docs-writing
description: Rules for README, docs pages, comments and changelog that stay accurate. Use when writing or updating documentation.
---

# Docs writing

## README

Order: what it is (one or two sentences) → stack → how to run locally → useful commands →
how to deploy (if relevant) → mandatory notices (attributions, licenses).

## Accuracy

- Every command, path, env var and number must exist in the repo. Check before writing.
- Describe current behavior. Plans go in a clearly marked "Next steps" section, if at all.

## Comments

- Explain why, not what. Remove comments that just restate the code.

## Changelog

- Group by Added / Changed / Fixed / Removed, written for a user of the project, newest first.

## Kinne specifics

- README keeps the TMDB attribution sentence. Never create a LICENSE.
- Never hand-edit `docs/generated/`. Threat analyses go to `docs/threats/<feature>.md`.

## Style

- Short sentences, plain words, explain terms the first time they appear.
- Keep the existing tone and language of each file.
