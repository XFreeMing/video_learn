import fs from 'node:fs/promises'
import path from 'node:path'
import { createFileRoute } from '@tanstack/react-router'
import { v4 as uuidv4 } from 'uuid'
import { db } from '#/db'
import { uploads, videos } from '#/db/schema'
import { env } from '#/env'
import { ensureDir, isVideoFile } from '#/lib/video-storage'
import { enqueueJob } from '#/services/video-processor/queue'

export const Route = createFileRoute('/api/videos/upload')({
  component: () => null,
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        POST: async ({ request }) => {
          const formData = await request.formData()
          const zipFile = formData.get('zip') as File | null
          if (!zipFile) {
            return Response.json({ error: 'No zip file provided' }, { status: 400 })
          }

          if (!zipFile.name.endsWith('.zip')) {
            return Response.json({ error: 'File must be a .zip' }, { status: 400 })
          }

          const maxSize = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024
          if (zipFile.size > maxSize) {
            return Response.json(
              { error: `File too large. Max: ${env.MAX_UPLOAD_SIZE_MB}MB` },
              { status: 413 },
            )
          }

          const uploadId = uuidv4()

          // Save zip to temp location
          const tempDir = path.join(env.VIDEO_STORAGE_PATH, '.temp')
          await ensureDir(tempDir)
          const zipPath = path.join(tempDir, `${uploadId}.zip`)
          const zipBuffer = await zipFile.arrayBuffer()
          await fs.writeFile(zipPath, Buffer.from(zipBuffer))

          // Unzip and find video files
          const unzipper = await import('unzipper')
          const directory = await unzipper.Open.file(zipPath)

          const videoFiles: string[] = []
          for (const entry of directory.files) {
            const fileName = path.basename(entry.path)
            if (entry.type === 'File' && isVideoFile(fileName)) {
              videoFiles.push(entry.path)
            }
          }

          if (videoFiles.length === 0) {
            await fs.unlink(zipPath)
            return Response.json({ error: 'No video files found in zip' }, { status: 400 })
          }

          // Create upload record
          await db.insert(uploads).values({
            id: uploadId,
            originalFilename: zipFile.name,
            videoCount: videoFiles.length,
            status: 'processing',
          })

          // Create video records + queue jobs
          const createdVideos: Array<{ id: string; filename: string; status: string }> = []
          for (const entryPath of videoFiles) {
            const videoId = uuidv4()
            const fileName = path.basename(entryPath)

            await db.insert(videos).values({
              id: videoId,
              uploadId,
              filename: fileName,
              outputPath: `${env.VIDEO_STORAGE_PATH}/${videoId}`,
            })

            await enqueueJob(videoId, uploadId)

            createdVideos.push({
              id: videoId,
              filename: fileName,
              status: 'pending',
            })
          }

          // Clean up zip file
          await fs.unlink(zipPath)

          return Response.json({
            uploadId,
            videoCount: createdVideos.length,
            videos: createdVideos,
          })
        },
      }),
  },
})
