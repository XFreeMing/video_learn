import { createFileRoute } from '@tanstack/react-router'
import { deleteDir, getVideoDir, getVideoSegmentsPath, readJsonFile } from '#/lib/video-storage'
import { deleteVideo, getVideo } from '#/lib/video-store'
import type { SegmentsData } from '#/services/video-processor/types'

export const Route = createFileRoute('/api/videos/$id')({
  component: () => null,
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: async ({ params }) => {
          const { id } = params
          const video = await getVideo(id)
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
          const video = await getVideo(id)
          if (!video) {
            return Response.json({ error: 'Video not found' }, { status: 404 })
          }

          await deleteVideo(id)
          await deleteDir(getVideoDir(id))

          return Response.json({ ok: true })
        },
      }),
  },
})
