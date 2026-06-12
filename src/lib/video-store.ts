import fs from 'node:fs/promises'
import path from 'node:path'
import { env } from '#/env'
import { ensureDir, readJsonFile, writeJsonFile } from './video-storage'

const STORE_DIR = path.join(env.VIDEO_STORAGE_PATH, '.store')

function getUploadPath(uploadId: string): string {
  return path.join(STORE_DIR, 'uploads', `${uploadId}.json`)
}

function getVideoPath(videoId: string): string {
  return path.join(STORE_DIR, 'videos', `${videoId}.json`)
}

async function ensureStoreDirs(): Promise<void> {
  await ensureDir(path.join(STORE_DIR, 'uploads'))
  await ensureDir(path.join(STORE_DIR, 'videos'))
}

// ── Upload records ──────────────────────────────────────────────────────

export interface UploadRecord {
  id: string
  originalFilename: string
  videoCount: number
  status: string
  createdAt: string
  updatedAt: string
}

export async function saveUpload(record: UploadRecord): Promise<void> {
  await ensureStoreDirs()
  await writeJsonFile(getUploadPath(record.id), record)
}

export async function getUpload(uploadId: string): Promise<UploadRecord | null> {
  return readJsonFile<UploadRecord>(getUploadPath(uploadId))
}

// ── Video records ───────────────────────────────────────────────────────

export interface VideoRecord {
  id: string
  uploadId: string
  filename: string
  duration?: number
  resolution?: string
  status: string
  progress: number
  outputPath?: string
  metadata?: Record<string, unknown>
  error?: string
  createdAt: string
  updatedAt: string
}

export async function saveVideo(record: VideoRecord): Promise<void> {
  await ensureStoreDirs()
  await writeJsonFile(getVideoPath(record.id), record)
}

export async function getVideo(videoId: string): Promise<VideoRecord | null> {
  return readJsonFile<VideoRecord>(getVideoPath(videoId))
}

export async function deleteVideo(videoId: string): Promise<void> {
  const videoPath = getVideoPath(videoId)
  try {
    await fs.unlink(videoPath)
  } catch {
    // File may not exist
  }
}

export async function updateVideo(
  videoId: string,
  updates: Partial<Pick<VideoRecord, 'status' | 'progress' | 'error' | 'duration' | 'resolution' | 'outputPath' | 'metadata' | 'updatedAt'>>,
): Promise<VideoRecord | null> {
  const video = await getVideo(videoId)
  if (!video) return null
  const updated = { ...video, ...updates, updatedAt: new Date().toISOString() }
  await writeJsonFile(getVideoPath(videoId), updated)
  return updated
}

export async function listVideos(
  options: {
    status?: string
    uploadId?: string
    page?: number
    limit?: number
  } = {},
): Promise<{ items: VideoRecord[]; total: number }> {
  await ensureStoreDirs()
  const videosDir = path.join(STORE_DIR, 'videos')

  let files: string[]
  try {
    files = await fs.readdir(videosDir)
  } catch {
    return { items: [], total: 0 }
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json'))
  const allVideos: VideoRecord[] = []
  for (const file of jsonFiles) {
    const video = await readJsonFile<VideoRecord>(path.join(videosDir, file))
    if (video) allVideos.push(video)
  }

  // Filter
  let filtered = allVideos
  if (options.status) {
    filtered = filtered.filter((v) => v.status === options.status)
  }
  if (options.uploadId) {
    filtered = filtered.filter((v) => v.uploadId === options.uploadId)
  }

  // Sort by createdAt descending
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const total = filtered.length

  // Paginate
  const page = options.page ?? 1
  const limit = options.limit ?? 20
  const offset = (page - 1) * limit
  const items = filtered.slice(offset, offset + limit)

  return { items, total }
}
