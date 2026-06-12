import { createFileRoute } from '@tanstack/react-router'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db'
import { videos } from '#/db/schema'

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
          const offset = (page - 1) * limit

          const conditions = []
          if (status) conditions.push(eq(videos.status, status))
          if (uploadId) conditions.push(eq(videos.uploadId, uploadId))

          const where = conditions.length > 0 ? and(...conditions) : undefined

          const [items, [{ total }]] = await Promise.all([
            db
              .select()
              .from(videos)
              .where(where)
              .orderBy(desc(videos.createdAt))
              .limit(limit)
              .offset(offset),
            db.select({ total: sql<number>`count(*)` }).from(videos).where(where),
          ])

          return Response.json({
            videos: items,
            pagination: {
              page,
              limit,
              total: Number(total),
              totalPages: Math.ceil(Number(total) / limit),
            },
          })
        },
      }),
  },
})
