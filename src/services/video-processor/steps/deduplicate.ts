import fs from 'node:fs/promises'
import path from 'node:path'
import { computePHash, DEDUP_THRESHOLD, hammingDistance } from '#/lib/image-hash'
import { getVideoFramesDir, getVideoPhashIndexPath, writeJsonFile } from '#/lib/video-storage'
import type { FrameInfo } from '../types'

/**
 * Deduplicate frames using perceptual hashing.
 * Removes frames that are too similar to the previous kept frame.
 * Returns list of kept frames with their pHash values.
 */
export async function deduplicateFrames(videoId: string): Promise<FrameInfo[]> {
  const framesDir = getVideoFramesDir(videoId)
  const files = await fs.readdir(framesDir)
  const jpgFiles = files.filter((f) => f.endsWith('.jpg')).sort()

  if (jpgFiles.length === 0) {
    return []
  }

  const keptFrames: FrameInfo[] = []
  const phashIndex: Array<{ filename: string; pHash: string; kept: boolean }> = []
  let lastHash: string | null = null

  for (const filename of jpgFiles) {
    const filePath = path.join(framesDir, filename)
    const pHash = await computePHash(filePath)

    // Extract timestamp from filename (e.g., "000001.jpg" -> 1.0 seconds)
    const frameIndex = parseInt(path.basename(filename, '.jpg'), 10)
    const timestamp = frameIndex // 1fps, so index = seconds

    const isDuplicate = lastHash !== null && hammingDistance(pHash, lastHash) < DEDUP_THRESHOLD

    phashIndex.push({ filename, pHash, kept: !isDuplicate })

    if (!isDuplicate) {
      keptFrames.push({
        timestamp,
        path: `frames/${filename}`,
        pHash,
      })
      lastHash = pHash
    } else {
      // Remove duplicate file to save disk space
      await fs.unlink(filePath)
    }
  }

  // Save pHash index for debugging
  await writeJsonFile(getVideoPhashIndexPath(videoId), {
    totalFrames: jpgFiles.length,
    keptFrames: keptFrames.length,
    removedFrames: phashIndex.filter((p) => !p.kept).length,
    index: phashIndex,
  })

  return keptFrames
}
