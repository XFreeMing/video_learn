import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { videos } from '#/db/schema'
import { deleteDir, getVideoDir, getVideoSegmentsPath, readJsonFile } from '#/lib/video-storage'
import type { SegmentsData } from '#/services/video-processor/types'

export const Route = createFileRoute('/api/videos/$id')({
  component: () => null,
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: async ({ params }) => {
          const { id } = params
          const video = await db.query.videos.findFirst({
            where: eq(videos.id, id),
          })
          if (!video) {
            return Response.json({ error: 'Video not found' }, { status: 404 })
          }

          const segments = await readJsonFile<SegmentsData>(getVideoSegmentsPath(id))

          return Response.json({
            video,
            segments,
          })
        },
        DELETE: async ({ params }) => {
          const { id } = params
          const video = await db.query.videos.findFirst({
            where: eq(videos.id, id),
          })
          if (!video) {
            return Response.json({ error: 'Video not found' }, { status: 404 })
          }

          await db.delete(videos).where(eq(videos.id, id))
          await deleteDir(getVideoDir(id))

          return Response.json({ ok: true })
        },
      }),
  },
})
