import ffmpeg from 'fluent-ffmpeg'
import { env } from '#/env'
import { ensureDir, getVideoFramesDir } from '#/lib/video-storage'

/**
 * Extract frames from video at 1fps using ffmpeg.
 * Outputs JPEG files named with frame index.
 */
export async function extractFrames(videoPath: string, videoId: string): Promise<void> {
  const framesDir = getVideoFramesDir(videoId)
  await ensureDir(framesDir)

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setFfmpegPath(env.FFMPEG_PATH)
      .outputOptions(['-vf fps=1', '-q:v 2'])
      .output(`${framesDir}/%06d.jpg`)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })
}

/**
 * Count actual frames extracted by reading the directory.
 */
export async function countFrames(videoId: string): Promise<number> {
  const fs = await import('node:fs/promises')
  const framesDir = getVideoFramesDir(videoId)
  try {
    const files = await fs.readdir(framesDir)
    return files.filter((f) => f.endsWith('.jpg')).length
  } catch {
    return 0
  }
}
