# 0011: Streaming profile learned by use

## Context

Kinne recommends only among the streamings a person subscribes to, so it needs to know which ones they are. Asking before the first recommendation puts a form between a new visitor and the one thing the product promises. Story: [US018](../../requisitos/us018-streamings-pelo-uso.md).

## Decision

There is no mandatory step. The profile is learned while the product is used.

- With no streaming marked, the draw uses the main ones.
- On the "where to watch" line, for a service not answered yet: "Disponível na **X** · Você assina? **Sim** · **Não**".
  - **Sim** saves the service.
  - **Não** removes it and replaces the recommendation at once.
  - Ignoring the question does nothing.
- A summary is always visible near the actions: "Todos os streamings · escolher os meus" or "Netflix, Max · alterar".
- The answer is saved where streamings are already saved: the browser for a visitor, the account for someone signed in. Nothing goes in the URL.

## Alternatives

- **A mandatory onboarding step.** Rejected: friction before the first recommendation.
- **Ask in a dialog on the first visit.** Rejected: it interrupts, and the question has no context until a title is on screen.
- **Never ask; always show every streaming.** Rejected: it recommends what the person cannot watch, which is the problem Kinne exists to solve.

## Consequences

- The first recommendations may be on a service the person does not have. One tap on "Não" corrects it and teaches the profile.
- The profile is always partial: a service is known as subscribed, known as not subscribed, or not answered yet, and the draw has to handle all three.
- The summary line is the way to review or change everything at once, so it must stay visible.
- Interface text stays in Portuguese ([ADR 0007](0007-documentation-language.md)); the wording above is the approved one.

## Status

Accepted, 2026-11-01. Implemented and in production (US018).
