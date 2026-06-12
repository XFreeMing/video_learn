# Architecture Index

A reusable, TDD-friendly full-stack foundation. Business logic depends only on
abstract **ports**; concrete infrastructure is wired in exactly one place.

## The seam (dependency flow)

```
Service  ──depends-on──▶  Ports ( abstract )
   │                         ▲           ▲
   │                         │           │
   ▼                     production    tests
Dependencies         (deps.ts wiring) (mocks + in-memory repos)
```

A service receives a `Dependencies` bundle and never imports Drizzle, Redis,
`Date`, or `console` directly. Swap one line in `deps.ts` to change runtime;
swap the repo/mocks to test.

## Key files

| Concern | Interface / Port | Production impl | Test double |
| --- | --- | --- | --- |
| Time + ids | `Clock` — [src/lib/ports.ts](src/lib/ports.ts) | [src/lib/clock.ts](src/lib/clock.ts) | `createMockClock` — [tests/mocks.ts](tests/mocks.ts) |
| Logging | `Logger` — [src/lib/ports.ts](src/lib/ports.ts) | [src/lib/logger.ts](src/lib/logger.ts) | `createMockLogger` — [tests/mocks.ts](tests/mocks.ts) |
| Events | `EventBus` — [src/lib/ports.ts](src/lib/ports.ts) | `redisEventBus` — [src/lib/container.ts](src/lib/container.ts) over [src/event/event-bus.ts](src/event/event-bus.ts) | `createMockEventBus` — [tests/mocks.ts](tests/mocks.ts) |
| Persistence | `*Repository` — [src/repositories/types.ts](src/repositories/types.ts) | `Drizzle*Repository` — [src/repositories/task-repository.drizzle.ts](src/repositories/task-repository.drizzle.ts) | `InMemory*Repository` — [tests/in-memory-repositories.ts](tests/in-memory-repositories.ts) |
| Wiring | `Dependencies` — [src/lib/ports.ts](src/lib/ports.ts) | `createProductionDeps` — [src/lib/deps.ts](src/lib/deps.ts) | `createTestDeps` — [tests/mocks.ts](tests/mocks.ts) |

## Adding a new domain capability (recipe)

1. Add a table in `src/db/schema/` and export it from the schema index.
2. Add the record + repository interface to [src/repositories/types.ts](src/repositories/types.ts)
   and put it in the `Repositories` bag.
3. Implement `Drizzle<Name>Repository` (prod) and `InMemory<Name>Repository` (tests).
4. Write the service taking `Dependencies`; use `repos`, `clock`, `eventBus`, `logger`.
5. TDD with `createTestDeps()` + `Factory` (see [src/services/task-board.test.ts](src/services/task-board.test.ts)).
6. Register the repo in [src/lib/deps.ts](src/lib/deps.ts).

## Commands

- `pnpm check` — typecheck + lint + test (the CI gate, see [.github/workflows/ci.yml](.github/workflows/ci.yml))
- `pnpm test` / `pnpm test:watch` / `pnpm test:coverage`
- `pnpm install` — peer conflicts (React 18/19) are handled via `pnpm-workspace.yaml`

## Known deferrals

- Real-time push (`/api/events` SSE + `src/websocket/server.ts`) is scaffolded
  but not wired; the SSE handler API for this TanStack Start version needs
  live verification before use.
