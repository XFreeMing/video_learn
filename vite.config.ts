import contentCollections from '@content-collections/vite'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const config = defineConfig({
  plugins: [
    devtools(),
    contentCollections(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    // Start video processing worker during dev
    {
      name: 'video-worker',
      configureServer(server) {
        server.httpServer?.once('listening', async () => {
          const { startWorker } = await import('./src/services/video-processor/worker.ts')
          startWorker(2000)
          console.log('[VideoWorker] Started in dev mode')
        })
      },
    },
  ],
})

export default config
