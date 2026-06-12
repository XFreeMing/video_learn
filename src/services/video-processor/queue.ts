import Redis from 'ioredis'
import type { ProcessingJob, VideoStatus } from './types'

const QUEUE_KEY = 'video:queue'
const PROGRESS_PREFIX = 'video:progress:'

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL
    if (!url) {
      // Fallback: use in-memory queue via simple array (for dev without Redis)
      throw new Error('REDIS_URL is not set. Redis is required for the video processing queue.')
    }
    redis = new Redis(url)
  }
  return redis
}

export async function enqueueJob(videoId: string, uploadId: string): Promise<void> {
  const r = getRedis()
  const job: ProcessingJob = {
    videoId,
    uploadId,
    status: 'pending',
    progress: 0,
    currentStep: '等待中',
    updatedAt: Date.now(),
  }
  await r.lpush(QUEUE_KEY, JSON.stringify(job))
}

export async function dequeueJob(): Promise<ProcessingJob | null> {
  const r = getRedis()
  const result = await r.rpop(QUEUE_KEY)
  if (!result) return null
  return JSON.parse(result) as ProcessingJob
}

export async function updateJobProgress(
  videoId: string,
  status: VideoStatus,
  progress: number,
  currentStep: string,
  error?: string,
): Promise<void> {
  const r = getRedis()
  const job: ProcessingJob = {
    videoId,
    uploadId: '', // not needed for progress lookup
    status,
    progress,
    currentStep,
    error,
    updatedAt: Date.now(),
  }
  await r.hset(`${PROGRESS_PREFIX}${videoId}`, JSON.stringify(job))
}

export async function getJobProgress(videoId: string): Promise<ProcessingJob | null> {
  const r = getRedis()
  const result = await r.hget(`${PROGRESS_PREFIX}${videoId}`, 'job')
  if (!result) return null
  return JSON.parse(result) as ProcessingJob
}

export async function deleteJobProgress(videoId: string): Promise<void> {
  const r = getRedis()
  await r.del(`${PROGRESS_PREFIX}${videoId}`)
}
