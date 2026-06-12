import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/demo/tanstack-query')({
  component: TanStackQueryDemo,
})

function TanStackQueryDemo() {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: () => Promise.resolve({ status: 'ok' }),
    initialData: { status: 'ok' },
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">TanStack Query</h1>
      <p className="text-muted-foreground mt-2">
        Server-state management — query status: <code>{data?.status}</code>
      </p>
    </div>
  )
}
