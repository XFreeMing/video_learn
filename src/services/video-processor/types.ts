export type VideoStatus =
  | 'pending'
  | 'extracting'
  | 'transcribing'
  | 'deduplicating'
  | 'completed'
  | 'failed'

export interface ProcessingJob {
  videoId: string
  uploadId: string
  status: VideoStatus
  progress: number
  currentStep: string
  error?: string
  updatedAt: number
}

export interface FrameInfo {
  timestamp: number
  path: string
  pHash: string
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptData {
  language: string
  segments: TranscriptSegment[]
}

export interface VideoSegment {
  startTime: number
  endTime: number
  transcript: string
  images: FrameInfo[]
}

export interface SegmentsData {
  videoId: string
  version: number
  segments: VideoSegment[]
}

export interface VideoMetadata {
  videoId: string
  uploadId: string
  originalFilename: string
  duration: number
  resolution: string
  fps: number
  codec: string
  audioCodec: string
  processedAt: string
  processingTimeMs: number
  totalFramesExtracted: number
  totalFramesAfterDedup: number
}

export interface UploadResult {
  uploadId: string
  videoCount: number
  videos: {
    id: string
    filename: string
    status: VideoStatus
  }[]
}

export interface ProgressResponse {
  videoId: string
  status: VideoStatus
  progress: number
  currentStep: string
  error?: string
  updatedAt: number
}
