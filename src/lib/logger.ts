import type { Logger } from './ports.ts'

function emit(level: 'info' | 'warn' | 'error', msg: string, ctx?: Record<string, unknown>) {
  const line = ctx ? `${msg} ${JSON.stringify(ctx)}` : msg
  // biome-ignore lint/suspicious/noConsole: this is the single sanctioned logger sink
  console[level](`[${level}] ${line}`)
}

/** Production logger that writes structured lines to the console. */
export const consoleLogger: Logger = {
  info: (msg, ctx) => emit('info', msg, ctx),
  warn: (msg, ctx) => emit('warn', msg, ctx),
  error: (msg, ctx) => emit('error', msg, ctx),
}
