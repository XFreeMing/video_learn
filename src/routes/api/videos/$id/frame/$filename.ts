import fs from 'node:fs'
import path from 'node:path'
import { createFileRoute } from '@tanstack/react-router'
import { getVideoFramesDir } from '#/lib/video-storage'

export const Route = createFileRoute('/api/videos/$id/frame/$filename')({
  component: () => null,
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: async ({ params }) => {
          const { id, filename } = params

          // Security: prevent path traversal
          const safeFilename = path.basename(filename)
          const framePath = path.join(getVideoFramesDir(id), safeFilename)

          if (!fs.existsSync(framePath)) {
            return Response.json({ error: 'Frame not found' }, { status: 404 })
          }

          const fileBuffer = await fs.promises.readFile(framePath)
          return new Response(fileBuffer, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=86400',
            },
          })
        },
      }),
  },
})
