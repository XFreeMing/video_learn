import fs from 'node:fs'
import path from 'node:path'
import unzipper from 'unzipper'
import { ensureDir, getUploadRawDir, isVideoFile } from '#/lib/video-storage'

export interface UnzipResult {
  uploadId: string
  videoFiles: string[]
}

/**
 * Extract a zip file to the upload's raw directory.
 * Returns list of video file paths found.
 */
export async function unzipUpload(uploadId: string, zipFilePath: string): Promise<UnzipResult> {
  const rawDir = getUploadRawDir(uploadId)
  await ensureDir(rawDir)

  // Stream-extract the zip file
  const directory = await unzipper.Open.file(zipFilePath)

  const videoFiles: string[] = []

  for (const entry of directory.files) {
    const entryPath = entry.path
    const fileName = path.basename(entryPath)

    if (entry.type === 'File' && isVideoFile(fileName)) {
      const destPath = path.join(rawDir, fileName)
      await ensureDir(path.dirname(destPath))
      await new Promise<void>((resolve, reject) => {
        entry
          .stream()
          .pipe(fs.createWriteStream(destPath))
          .on('finish', resolve)
          .on('error', reject)
      })
      videoFiles.push(destPath)
    }
  }

  return { uploadId, videoFiles }
}
