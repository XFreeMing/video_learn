import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { computePHash, hammingDistance, DEDUP_THRESHOLD } from '#/lib/image-hash'
import {
  ensureDir,
  isVideoFile,
} from '#/lib/video-storage'

const ZIP_PATH = path.join(process.cwd(), '优秀视频下载.zip')
const TEST_DIR = path.join(process.cwd(), 'test-output')
const EXTRACT_DIR = path.join(TEST_DIR, 'extracted')

// Helper: extract zip using system unzip (handles Chinese filenames)
function extractZip() {
  execSync('unzip -o "' + ZIP_PATH + '" -d "' + EXTRACT_DIR + '"', { stdio: 'pipe' })
}

// Helper: get video files from extracted directory
async function getVideoFiles(): Promise<string[]> {
  const files = await fs.readdir(EXTRACT_DIR)
  return files.filter(isVideoFile).map((f) => path.join(EXTRACT_DIR, f)).sort()
}

describe('video processor tests', () => {
  beforeAll(async () => {
    await ensureDir(TEST_DIR)
    // Clean up any previous run
    await fs.rm(EXTRACT_DIR, { recursive: true, force: true }).catch(() => {})
    await ensureDir(EXTRACT_DIR)
    extractZip()
  })

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {})
  })

  describe('zip file validation', () => {
    it('zip file exists', async () => {
      const stat = await fs.stat(ZIP_PATH)
      expect(stat.isFile()).toBe(true)
      expect(stat.size).toBeGreaterThan(0)
    })

    it('zip contains 4 video files', async () => {
      const videos = await getVideoFiles()
      expect(videos.length).toBe(4)

      // Check all are mp4
      const names = videos.map((v) => path.basename(v))
      expect(names.some((n) => n.startsWith('QQ2026524-142835'))).toBe(true)
      expect(names.some((n) => n.startsWith('QQ2026524-14437'))).toBe(true)
      expect(names.some((n) => n.startsWith('抖音2026524-135951'))).toBe(true)
      expect(names.some((n) => n.startsWith('抖音2026524-159782'))).toBe(true)
    })
  })

  describe('frame extraction', () => {
    it('extract 1fps frames from short video', async () => {
      const videos = await getVideoFiles()
      // Find the shortest video (抖音2026524-135951.mp4 ~154s)
      const shortVideo = videos.find((v) => path.basename(v).startsWith('抖音2026524-135951'))!
      expect(shortVideo).toBeDefined()

      const testId = uuidv4()
      const testDir = path.join(TEST_DIR, 'frame-extract-' + testId)
      const framesDir = path.join(testDir, 'frames')
      await ensureDir(framesDir)

      // Extract frames at 1fps
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg')
        ffmpeg(shortVideo)
          .outputOptions(['-vf fps=1', '-q:v 2'])
          .output(framesDir + '/%06d.jpg')
          .on('end', resolve)
          .on('error', reject)
          .run()
      })

      const frameFiles = (await fs.readdir(framesDir)).filter((f) => f.endsWith('.jpg'))

      // 154s video should have ~154 frames
      expect(frameFiles.length).toBeGreaterThan(140)
      expect(frameFiles.length).toBeLessThan(170)

      // Verify frames are valid
      for (const frame of frameFiles.slice(0, 3)) {
        const stat = await fs.stat(path.join(framesDir, frame))
        expect(stat.size).toBeGreaterThan(0)
      }

      console.log('  Frame extraction: ' + frameFiles.length + ' frames from 154s video')

      await fs.rm(testDir, { recursive: true, force: true })
    })
  })

  describe('audio extraction', () => {
    it('extract WAV audio from video', async () => {
      const videos = await getVideoFiles()
      const shortVideo = videos.find((v) => path.basename(v).startsWith('抖音2026524-135951'))!

      const testId = uuidv4()
      const testDir = path.join(TEST_DIR, 'audio-extract-' + testId)
      const audioPath = path.join(testDir, 'audio.wav')
      await ensureDir(testDir)

      // Extract audio as WAV
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg')
        ffmpeg(shortVideo)
          .noVideo()
          .audioCodec('pcm_s16le')
          .output(audioPath)
          .on('end', resolve)
          .on('error', reject)
          .run()
      })

      const stat = await fs.stat(audioPath)
      expect(stat.size).toBeGreaterThan(1_000_000) // > 1MB for 154s WAV

      // Verify RIFF header (first 4 bytes)
      const header = Buffer.alloc(4)
      const fd = await fs.open(audioPath, 'r')
      await fd.read(header, 0, 4, 0)
      await fd.close()
      expect(header.toString('ascii', 0, 4)).toBe('RIFF')

      console.log('  Audio extraction: ' + (stat.size / 1024 / 1024).toFixed(1) + 'MB')

      await fs.rm(testDir, { recursive: true, force: true })
    })
  })

  describe('pHash computation', () => {
    it('compute pHash for frames', async () => {
      const videos = await getVideoFiles()
      const shortVideo = videos.find((v) => path.basename(v).startsWith('抖音2026524-135951'))!

      const testId = uuidv4()
      const testDir = path.join(TEST_DIR, 'phash-' + testId)
      const framesDir = path.join(testDir, 'frames')
      await ensureDir(framesDir)

      // Extract a few frames
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg')
        ffmpeg(shortVideo)
          .outputOptions(['-vf fps=1'])
          .output(framesDir + '/%06d.jpg')
          .on('end', resolve)
          .on('error', reject)
          .run()
      })

      const frameFiles = (await fs.readdir(framesDir))
        .filter((f) => f.endsWith('.jpg'))
        .slice(0, 5)

      // Compute pHash for each frame
      const hashes: string[] = []
      for (const frame of frameFiles) {
        const hash = await computePHash(path.join(framesDir, frame))
        expect(hash).toBeDefined()
        expect(hash.length).toBeGreaterThanOrEqual(1)
        hashes.push(hash)
      }

      // Consecutive frames may be similar but not identical
      for (let i = 1; i < hashes.length; i++) {
        const dist = hammingDistance(hashes[i - 1], hashes[i])
        expect(dist).toBeGreaterThanOrEqual(0)
        expect(dist).toBeLessThanOrEqual(64)
      }

      console.log('  pHash: computed for ' + hashes.length + ' frames, sample: ' + hashes.slice(0, 3).join(', '))

      await fs.rm(testDir, { recursive: true, force: true })
    })

    it('hamming distance edge cases', () => {
      // Same hash = distance 0
      expect(hammingDistance('a1b2c3d4e5f6a7b8', 'a1b2c3d4e5f6a7b8')).toBe(0)

      // Completely different
      expect(hammingDistance('0000000000000000', 'ffffffffffffffff')).toBe(64)

      // 1 bit different
      expect(hammingDistance('0000000000000000', '0000000000000001')).toBe(1)
    })
  })

  describe('frame deduplication', () => {
    it('deduplicate frames from real video', async () => {
      const videos = await getVideoFiles()
      const shortVideo = videos.find((v) => path.basename(v).startsWith('抖音2026524-135951'))!

      const testId = uuidv4()
      const testDir = path.join(TEST_DIR, 'dedup-' + testId)
      const framesDir = path.join(testDir, 'frames')
      await ensureDir(framesDir)

      // Extract frames
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg')
        ffmpeg(shortVideo)
          .outputOptions(['-vf fps=1'])
          .output(framesDir + '/%06d.jpg')
          .on('end', resolve)
          .on('error', reject)
          .run()
      })

      const frameFiles = (await fs.readdir(framesDir))
        .filter((f) => f.endsWith('.jpg'))
        .sort()

      const totalFrames = frameFiles.length
      expect(totalFrames).toBeGreaterThan(0)

      // Compute pHash and count dedup results
      let lastHash: string | null = null
      let keptCount = 0
      let removedCount = 0
      for (const filename of frameFiles) {
        const hash = await computePHash(path.join(framesDir, filename))
        const isDuplicate = lastHash !== null && hammingDistance(hash, lastHash) < DEDUP_THRESHOLD
        if (!isDuplicate) {
          keptCount++
          lastHash = hash
        } else {
          removedCount++
        }
      }

      expect(keptCount).toBeGreaterThan(0)
      expect(keptCount + removedCount).toBe(totalFrames)

      const removalPct = ((removedCount / totalFrames) * 100).toFixed(1)
      console.log('  Dedup: ' + totalFrames + ' -> ' + keptCount + ' kept, ' + removedCount + ' removed (' + removalPct + '%)')

      await fs.rm(testDir, { recursive: true, force: true })
    })
  })

  describe('full pipeline integration', () => {
    it('full pipeline on shortest video (frames + audio + dedup)', async () => {
      const videos = await getVideoFiles()
      const shortVideo = videos.find((v) => path.basename(v).startsWith('抖音2026524-135951'))!

      const testId = uuidv4()
      const testDir = path.join(TEST_DIR, 'pipeline-' + testId)
      const framesDir = path.join(testDir, 'frames')
      const audioPath = path.join(testDir, 'audio.wav')
      await ensureDir(framesDir)

      // Step 1: Extract frames at 1fps
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg')
        ffmpeg(shortVideo)
          .outputOptions(['-vf fps=1', '-q:v 2'])
          .output(framesDir + '/%06d.jpg')
          .on('end', resolve)
          .on('error', reject)
          .run()
      })

      const frameFiles = (await fs.readdir(framesDir)).filter((f) => f.endsWith('.jpg')).sort()
      const frameCount = frameFiles.length
      expect(frameCount).toBeGreaterThan(100)
      console.log('  Step 1 - Frames: ' + frameCount)

      // Step 2: Extract audio
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg')
        ffmpeg(shortVideo)
          .noVideo()
          .audioCodec('pcm_s16le')
          .output(audioPath)
          .on('end', resolve)
          .on('error', reject)
          .run()
      })

      const audioStat = await fs.stat(audioPath)
      expect(audioStat.size).toBeGreaterThan(1_000_000)
      console.log('  Step 2 - Audio: ' + (audioStat.size / 1024 / 1024).toFixed(1) + 'MB')

      // Step 3: Deduplicate frames
      let lastHash: string | null = null
      let keptCount = 0

      for (const filename of frameFiles) {
        const hash = await computePHash(path.join(framesDir, filename))
        const isDuplicate = lastHash !== null && hammingDistance(hash, lastHash) < DEDUP_THRESHOLD

        if (!isDuplicate) {
          keptCount++
          lastHash = hash
        } else {
          await fs.unlink(path.join(framesDir, filename))
        }
      }

      const remainingFrames = (await fs.readdir(framesDir)).filter((f) => f.endsWith('.jpg')).length
      expect(remainingFrames).toBe(keptCount)

      const removalPct = ((1 - keptCount / frameCount) * 100).toFixed(1)
      console.log('  Step 3 - Dedup: ' + frameCount + ' -> ' + keptCount + ' (' + removalPct + '% removed)')

      await fs.rm(testDir, { recursive: true, force: true })
    })
  })

  describe('whisper transcription verification', () => {
    it('verify whisper output format and content', async () => {
      const whisperOutputPath = '/tmp/video_test/whisper_out/test_audio.json'

      // Check whisper output file exists
      const stat = await fs.stat(whisperOutputPath)
      expect(stat.size).toBeGreaterThan(0)

      const content = await fs.readFile(whisperOutputPath, 'utf-8')
      const output = JSON.parse(content)

      // Verify structure
      expect(output).toHaveProperty('language')
      expect(output.language).toBe('zh')
      expect(output).toHaveProperty('segments')
      expect(Array.isArray(output.segments)).toBe(true)
      expect(output.segments.length).toBeGreaterThan(0)

      // Verify segment structure
      const firstSegment = output.segments[0]
      expect(firstSegment).toHaveProperty('start')
      expect(firstSegment).toHaveProperty('end')
      expect(firstSegment).toHaveProperty('text')
      expect(typeof firstSegment.start).toBe('number')
      expect(typeof firstSegment.end).toBe('number')
      expect(typeof firstSegment.text).toBe('string')
      expect(firstSegment.start).toBeLessThanOrEqual(firstSegment.end)

      // Print sample segments
      const samples = output.segments.slice(0, 5).map((s: { start: number; end: number; text: string }) => {
        return '[' + s.start.toFixed(1) + '-' + s.end.toFixed(1) + '] ' + s.text.trim().substring(0, 40)
      })
      console.log('  Whisper segments (first 5):')
      for (const sample of samples) {
        console.log('    ' + sample)
      }

      // Verify total duration is reasonable (audio was 154s)
      const lastSegment = output.segments[output.segments.length - 1]
      expect(lastSegment.end).toBeGreaterThan(100)
      expect(lastSegment.end).toBeLessThan(200)

      console.log('  Whisper: ' + output.segments.length + ' segments, duration up to ' + lastSegment.end.toFixed(1) + 's')
    })
  })
})
