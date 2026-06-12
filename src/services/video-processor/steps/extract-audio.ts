import ffmpeg from 'fluent-ffmpeg'
import { env } from '#/env'
import { getVideoAudioPath } from '#/lib/video-storage'

/**
 * Extract audio track from video as WAV (Whisper-compatible format).
 */
export async function extractAudio(videoPath: string, videoId: string): Promise<void> {
  const audioPath = getVideoAudioPath(videoId)

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setFfmpegPath(env.FFMPEG_PATH)
      .noVideo()
      .audioCodec('pcm_s16le')
      .output(audioPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })
}
