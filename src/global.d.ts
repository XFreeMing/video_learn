declare module 'unzipper' {
  import type { Readable } from 'node:stream'

  interface DirectoryEntry {
    path: string
    type: 'File' | 'Directory'
    stream: () => Readable
  }

  interface Open {
    file(path: string): Promise<{ files: DirectoryEntry[] }>
  }

  export const Open: Open
  export default { Open }
}

declare module 'sharp' {
  interface SharpOptions {
    // Empty for now - we use the default export
  }

  interface SharpInstance {
    grayscale(): SharpInstance
    resize(width: number, height: number, options?: { fit?: string }): SharpInstance
    raw(): SharpInstance
    toBuffer(options?: {
      resolveWithObject?: boolean
    }): Promise<Buffer | { data: Buffer; info: { width: number; height: number } }>
  }

  function sharp(input?: Buffer | string): SharpInstance
  export default sharp
}
