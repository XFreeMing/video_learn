import path from 'node:path'
import { env } from '#/env'
import { ensureDir, readJsonFile, writeJsonFile } from '#/lib/video-storage'
import type { ProcessingJob, VideoStatus } from './types'

const QUEUE_PATH = path.join(env.VIDEO_STORAGE_PATH, '.store', 'queue.json')
const PROGRESS_DIR = path.join(env.VIDEO_STORAGE_PATH, '.store', 'progress')

// ── In-memory job queue (persisted to JSON on each mutation) ────────────

let jobQueue: ProcessingJob[] = []
let initialized = false

async function loadQueue(): Promise<void> {
  try {
    const data = await readJsonFile<ProcessingJob[]>(QUEUE_PATH)
    jobQueue = data ?? []
  } catch {
    jobQueue = []
  }
  initialized = true
}

async function persistQueue(): Promise<void> {
  await ensureDir(path.dirname(QUEUE_PATH))
  await writeJsonFile(QUEUE_PATH, jobQueue)
}

export async function enqueueJob(videoId: string, uploadId: string): Promise<void> {
  if (!initialized) await loadQueue()
  const job: ProcessingJob = {
    videoId,
    uploadId,
    status: 'pending',
    progress: 0,
    currentStep: '等待中',
    updatedAt: Date.now(),
  }
  jobQueue.push(job)
  await persistQueue()
}

export async function dequeueJob(): Promise<ProcessingJob | null> {
  if (!initialized) await loadQueue()
  if (jobQueue.length === 0) return null
  const job = jobQueue.shift()!
  await persistQueue()
  return job
}

// ── File-based progress tracking ────────────────────────────────────────

function getProgressPath(videoId: string): string {
  return path.join(PROGRESS_DIR, `${videoId}.json`)
}

export async function updateJobProgress(
  videoId: string,
  status: VideoStatus,
  progress: number,
  currentStep: string,
  error?: string,
): Promise<void> {
  await ensureDir(PROGRESS_DIR)
  const job: ProcessingJob = {
    videoId,
    uploadId: '',
    status,
    progress,
    currentStep,
    error,
    updatedAt: Date.now(),
  }
  await writeJsonFile(getProgressPath(videoId), job)
}

export async function getJobProgress(videoId: string): Promise<ProcessingJob | null> {
  return readJsonFile<ProcessingJob>(getProgressPath(videoId))
}

export async function deleteJobProgress(videoId: string): Promise<void> {
  try {
    await (await import('node:fs/promises')).unlink(getProgressPath(videoId))
  } catch {
    // File may not exist
  }
}
