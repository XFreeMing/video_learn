import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/demo/drizzle')({
  component: DemoDrizzle,
})

function DemoDrizzle() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Drizzle ORM</h1>
      <p className="text-muted-foreground mt-2">
        PostgreSQL via Drizzle ORM — schema in <code>src/db/schema/</code>
      </p>
      <p className="text-sm text-muted-foreground mt-4">
        Configure <code>DATABASE_URL</code> in <code>.env.local</code>, then run{' '}
        <code>npm run db:push</code>.
      </p>
    </div>
  )
}
