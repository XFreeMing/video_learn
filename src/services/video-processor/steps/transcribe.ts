import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { env } from '#/env'
import { getVideoAudioPath, getVideoTranscriptPath } from '#/lib/video-storage'
import type { TranscriptData } from '../types'

/**
 * Transcribe audio using local Whisper CLI.
 * Outputs JSON with timestamps for each segment.
 */
export async function transcribeAudio(videoId: string): Promise<TranscriptData> {
  const audioPath = getVideoAudioPath(videoId)
  const transcriptPath = getVideoTranscriptPath(videoId)
  const outputDir = path.dirname(transcriptPath)

  return new Promise((resolve, reject) => {
    const proc = spawn(env.WHISPER_PATH, [
      audioPath,
      '--model',
      env.WHISPER_MODEL,
      '--language',
      'zh',
      '--output_format',
      'json',
      '--output_dir',
      outputDir,
    ])

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', async (code) => {
      if (code !== 0) {
        return reject(new Error(`Whisper exited with code ${code}: ${stderr}`))
      }

      // Whisper outputs JSON as {result: [{text, start, end}, ...]} or similar format
      // Read the output JSON file
      const baseName = path.basename(audioPath, path.extname(audioPath))
      const jsonFile = path.join(outputDir, `${baseName}.json`)

      try {
        const content = await fs.readFile(jsonFile, 'utf-8')
        const whisperOutput = JSON.parse(content)

        // Parse Whisper output format
        const segments: TranscriptData['segments'] = []

        if (whisperOutput.result) {
          for (const item of whisperOutput.result) {
            segments.push({
              start: item.start ?? 0,
              end: item.end ?? 0,
              text: item.text?.trim() ?? '',
            })
          }
        } else if (whisperOutput.segments) {
          for (const seg of whisperOutput.segments) {
            segments.push({
              start: seg.start ?? 0,
              end: seg.end ?? 0,
              text: seg.text?.trim() ?? '',
            })
          }
        }

        const transcriptData: TranscriptData = {
          language: whisperOutput.language ?? 'zh',
          segments,
        }

        await fs.writeFile(transcriptPath, JSON.stringify(transcriptData, null, 2), 'utf-8')
        resolve(transcriptData)
      } catch (err) {
        // If JSON parsing fails, fall back to stdout text
        reject(new Error(`Failed to parse Whisper output: ${err}`))
      }
    })

    proc.on('error', reject)
  })
}
