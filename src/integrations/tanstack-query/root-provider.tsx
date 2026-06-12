import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import type { ReactNode } from 'react'

function makeContext() {
  return { queryClient: new QueryClient() }
}

let browserContext:
  | {
      queryClient: QueryClient
    }
  | undefined

export function getContext() {
  // On the server, return a fresh client per request so cache is never
  // shared across users. In the browser, reuse a single client.
  if (typeof window === 'undefined') {
    return makeContext()
  }
  if (!browserContext) {
    browserContext = makeContext()
  }
  return browserContext
}

export default function TanStackQueryProvider({ children }: { children: ReactNode }) {
  // Reuse the exact queryClient created for this router/request (see
  // router.tsx context), so SSR dehydration and client hydration match.
  const { queryClient } = useRouteContext({ from: '__root__' })

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
