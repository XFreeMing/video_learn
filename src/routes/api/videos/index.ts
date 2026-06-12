import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { listVideos } from '#/lib/video-store'

const searchSchema = z.object({
  status: z
    .enum(['pending', 'extracting', 'transcribing', 'deduplicating', 'completed', 'failed'])
    .optional(),
  uploadId: z.string().uuid().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
})

export const Route = createFileRoute('/api/videos/')({
  component: () => null,
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: async ({ request }) => {
          const url = new URL(request.url)
          const params = Object.fromEntries(url.searchParams)
          const search = searchSchema.parse(params)

          const { status, uploadId, page, limit } = search
          const { items, total } = await listVideos({ status, uploadId, page, limit })

          return Response.json({
            videos: items,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          })
        },
      }),
  },
})
