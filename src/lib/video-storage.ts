import fs from 'node:fs/promises'
import path from 'node:path'
import { env } from '#/env'

const STORAGE_BASE = env.VIDEO_STORAGE_PATH

export function getUploadRawDir(uploadId: string): string {
  return path.join(STORAGE_BASE, uploadId, 'raw')
}

export function getVideoDir(videoId: string): string {
  return path.join(STORAGE_BASE, videoId)
}

export function getVideoFramesDir(videoId: string): string {
  return path.join(STORAGE_BASE, videoId, 'frames')
}

export function getVideoAudioPath(videoId: string): string {
  return path.join(STORAGE_BASE, videoId, 'audio.wav')
}

export function getVideoSegmentsPath(videoId: string): string {
  return path.join(STORAGE_BASE, videoId, 'segments.json')
}

export function getVideoTranscriptPath(videoId: string): string {
  return path.join(STORAGE_BASE, videoId, 'transcript.json')
}

export function getVideoMetadataPath(videoId: string): string {
  return path.join(STORAGE_BASE, videoId, 'metadata.json')
}

export function getVideoPhashIndexPath(videoId: string): string {
  return path.join(STORAGE_BASE, videoId, 'phash-index.json')
}

export function getVideoProgressPath(videoId: string): string {
  return path.join(STORAGE_BASE, '.store', 'progress', `${videoId}.json`)
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export async function deleteDir(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true })
}

export const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.webm', '.mov', '.flv', '.wmv'])

export function isVideoFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return VIDEO_EXTENSIONS.has(ext)
}
