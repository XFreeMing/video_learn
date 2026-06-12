/**
 * Server entry point - starts TanStack Start dev server + video processing worker.
 * Run with: npx tsx src/server.ts
 */
import 'dotenv/config'
import { startWorker } from '#/services/video-processor/worker'

// Start the video processing worker loop
startWorker(2000)
console.log('[Server] Video worker started')

// The TanStack Start dev server is started separately via `pnpm dev`
// This file is for production use: combine with your preferred server setup
