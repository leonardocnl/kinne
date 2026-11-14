---
name: acceptance-check
description: How to trace acceptance criteria to code and tests and classify each one. Use when checking whether a story is done.
---

# Acceptance check

1. List every criterion of the story with its ID, word for word.
2. For each, search for the implementation and for a test that proves it.
3. Classify:
   - **met**: code and test exist and match the criterion;
   - **partly met**: code exists but misses a case, or there is no test;
   - **not met**: nothing implements it;
   - **contradicted**: code does something the criterion forbids.
4. Evidence is always file:line. "Seems to work" is not evidence.
5. Ambiguous criterion: write the two or more possible readings and ask which one is meant.
6. Non-functional requirements (performance, accessibility, privacy) count too; check
   `docs/requisitos/02-requisitos-nao-funcionais.md` (RNF01–RNF11).
7. The story's "Segurança" criteria count like any other; their source is the threat analysis
   in `docs/threats/`.
