import {
  getVideoMetadataPath,
  getVideoSegmentsPath,
  readJsonFile,
  writeJsonFile,
} from '#/lib/video-storage'
import type { FrameInfo, SegmentsData, TranscriptData, VideoMetadata, VideoSegment } from '../types'

/**
 * Assemble final segments.json by combining transcript segments with deduplicated frames.
 * Each transcript segment gets the frames that fall within its time range.
 */
export async function assembleSegments(
  videoId: string,
  transcript: TranscriptData,
  frames: FrameInfo[],
  metadata: Partial<VideoMetadata>,
): Promise<SegmentsData> {
  const segments: VideoSegment[] = []

  // For each transcript segment, find frames within its time range
  for (let i = 0; i < transcript.segments.length; i++) {
    const ts = transcript.segments[i]
    const nextStart =
      i + 1 < transcript.segments.length ? transcript.segments[i + 1].start : Infinity

    const images = frames.filter((f) => f.timestamp >= ts.start && f.timestamp < nextStart)

    segments.push({
      startTime: ts.start,
      endTime: ts.end,
      transcript: ts.text,
      images,
    })
  }

  // Handle frames that fall outside any transcript segment
  const lastEnd =
    transcript.segments.length > 0 ? transcript.segments[transcript.segments.length - 1].end : 0
  const orphanFrames = frames.filter((f) => f.timestamp >= lastEnd)

  if (orphanFrames.length > 0) {
    // Group orphan frames into 10-second chunks
    const chunkSize = 10
    for (let i = 0; i < orphanFrames.length; i += chunkSize) {
      const chunk = orphanFrames.slice(i, i + chunkSize)
      const start = chunk[0].timestamp
      const end = chunk[chunk.length - 1].timestamp + 1
      segments.push({
        startTime: start,
        endTime: end,
        transcript: '',
        images: chunk,
      })
    }
  }

  const segmentsData: SegmentsData = {
    videoId,
    version: 1,
    segments,
  }

  // Write segments.json
  await writeJsonFile(getVideoSegmentsPath(videoId), segmentsData)

  // Write metadata.json
  const metadataPath = getVideoMetadataPath(videoId)
  const existingMetadata = (await readJsonFile<VideoMetadata>(metadataPath)) ?? {}
  await writeJsonFile(metadataPath, {
    ...existingMetadata,
    ...metadata,
    videoId,
    processedAt: new Date().toISOString(),
  })

  return segmentsData
}
