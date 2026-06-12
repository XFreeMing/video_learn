import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/demo/store')({
  component: DemoStore,
})

function DemoStore() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">TanStack Store</h1>
      <p className="text-muted-foreground mt-2">
        Client-side state management — store in <code>src/lib/demo-store.ts</code>
      </p>
    </div>
  )
}
