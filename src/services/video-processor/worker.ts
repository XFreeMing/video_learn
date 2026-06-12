import { eq } from 'drizzle-orm'
import ffmpeg from 'fluent-ffmpeg'
import { db } from '#/db'
import { videos } from '#/db/schema'
import { createEvent, publishEvent } from '#/event'
import { ensureDir, getUploadRawDir, getVideoDir } from '#/lib/video-storage'
import { dequeueJob, updateJobProgress } from './queue'
import { assembleSegments } from './steps/assemble'
import { deduplicateFrames } from './steps/deduplicate'
import { extractAudio } from './steps/extract-audio'
import { countFrames, extractFrames } from './steps/extract-frames'
import { transcribeAudio } from './steps/transcribe'
import type { VideoMetadata } from './types'

/**
 * Process a single video through the full pipeline.
 * Called by the worker loop for each queued job.
 */
export async function processVideo(
  videoId: string,
  uploadId: string,
  videoPath: string,
): Promise<void> {
  const startTime = Date.now()

  try {
    // Create output directory
    await ensureDir(getVideoDir(videoId))

    // Step 1: Extract frames + audio
    await updateJobProgress(videoId, 'extracting', 10, '提取帧和音频...')
    await updateDbStatus(videoId, 'extracting', 10)
    await publishEvent(
      createEvent({ type: 'video.processing.started', payload: { videoId, step: 'extracting' } }),
    )

    await Promise.all([extractFrames(videoPath, videoId), extractAudio(videoPath, videoId)])

    // Step 2: Transcribe audio
    await updateJobProgress(videoId, 'transcribing', 40, '语音转写中...')
    await updateDbStatus(videoId, 'transcribing', 40)
    await publishEvent(
      createEvent({ type: 'video.processing.started', payload: { videoId, step: 'transcribing' } }),
    )

    const transcript = await transcribeAudio(videoId)

    // Step 3: Deduplicate frames
    await updateJobProgress(videoId, 'deduplicating', 70, '图片去重中...')
    await updateDbStatus(videoId, 'deduplicating', 70)
    await publishEvent(
      createEvent({
        type: 'video.processing.started',
        payload: { videoId, step: 'deduplicating' },
      }),
    )

    const frames = await deduplicateFrames(videoId)

    // Step 4: Assemble segments
    await updateJobProgress(videoId, 'deduplicating', 90, '组装输出...')

    // Get video metadata using ffprobe
    const probeResult = await probeVideo(videoPath)
    const frameCount = await countFrames(videoId)

    const metadata: Partial<VideoMetadata> = {
      uploadId,
      duration: probeResult.duration ?? 0,
      resolution: `${probeResult.width ?? 0}x${probeResult.height ?? 0}`,
      fps: probeResult.fps ?? 1,
      codec: probeResult.codec ?? 'unknown',
      audioCodec: probeResult.audioCodec ?? 'unknown',
      processingTimeMs: Date.now() - startTime,
      totalFramesExtracted: frameCount,
      totalFramesAfterDedup: frames.length,
    }

    const segments = await assembleSegments(videoId, transcript, frames, metadata)

    // Step 5: Complete
    await updateJobProgress(videoId, 'completed', 100, '处理完成')
    await updateDbStatus(videoId, 'completed', 100)
    await publishEvent(
      createEvent({
        type: 'video.processing.completed',
        payload: {
          videoId,
          segmentCount: segments.segments.length,
          frameCount: frames.length,
        },
      }),
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await updateJobProgress(videoId, 'failed', 0, '处理失败', errorMsg)
    await updateDbStatus(videoId, 'failed', 0, errorMsg)
    await publishEvent(
      createEvent({
        type: 'video.processing.failed',
        payload: { videoId, error: errorMsg },
      }),
    )
  }
}

async function updateDbStatus(
  videoId: string,
  status: 'extracting' | 'transcribing' | 'deduplicating' | 'completed' | 'failed',
  progress: number,
  error?: string,
) {
  await db
    .update(videos)
    .set({
      status,
      progress,
      error: error ?? null,
      updatedAt: new Date(),
    })
    .where(eq(videos.id, videoId))
}

function probeVideo(videoPath: string): Promise<{
  duration?: number
  width?: number
  height?: number
  fps?: number
  codec?: string
  audioCodec?: string
}> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return resolve({})

      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video')
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio')

      resolve({
        duration: metadata.format.duration,
        width: videoStream?.width,
        height: videoStream?.height,
        fps: videoStream?.r_frame_rate
          ? eval(videoStream.r_frame_rate.replace('/', '/'))
          : undefined,
        codec: videoStream?.codec_name,
        audioCodec: audioStream?.codec_name,
      })
    })
  })
}

/**
 * Start the worker loop. Continuously polls Redis for jobs.
 */
export function startWorker(pollIntervalMs = 2000): void {
  console.log('[VideoWorker] Starting worker loop...')

  async function poll() {
    try {
      const job = await dequeueJob()
      if (job) {
        console.log(`[VideoWorker] Processing job: ${job.videoId}`)
        const video = await db.query.videos.findFirst({
          where: eq(videos.id, job.videoId),
        })
        if (!video) {
          console.error(`[VideoWorker] Video ${job.videoId} not found in DB`)
          await updateJobProgress(job.videoId, 'failed', 0, '视频记录不存在')
        } else {
          const rawPath = `${getUploadRawDir(job.uploadId)}/${video.filename}`
          await processVideo(job.videoId, job.uploadId, rawPath)
        }
      }
    } catch (err) {
      console.error('[VideoWorker] Error processing job:', err)
    }

    setTimeout(poll, pollIntervalMs)
  }

  poll()
}
