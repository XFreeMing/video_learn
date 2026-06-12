import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const domains = [
    {
      name: 'Knowledge Space',
      desc: 'Cards, relations, MECE tags, multi-space gateway',
      schema: 'src/db/schema/knowledge.ts',
    },
    {
      name: 'Problem Solving',
      desc: 'Projects, logic trees, hypotheses, events',
      schema: 'src/db/schema/project.ts',
    },
    {
      name: 'Task Board',
      desc: 'Tasks, participants, agent instances',
      schema: 'src/db/schema/task.ts',
    },
    {
      name: 'Event Bus',
      desc: 'Redis pub/sub, WebSocket broadcast',
      module: 'src/event/ · src/websocket/',
    },
  ]

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">Baiying Channel</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Event-Driven Multi-Agent System
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Knowledge space, hypothesis-driven problem solving, and task board collaboration — powered
          by TanStack Start, PostgreSQL, Redis, and WebSocket.
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {domains.map((d) => (
          <article key={d.name} className="island-shell feature-card rise-in rounded-2xl p-5">
            <h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">{d.name}</h2>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)] mb-2">{d.desc}</p>
            <code className="text-xs text-[var(--lagoon)] opacity-70">
              {'schema' in d ? d.schema : d.module}
            </code>
          </article>
        ))}
      </section>
    </main>
  )
}
