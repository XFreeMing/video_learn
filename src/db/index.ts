import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '../env.ts'
import * as schema from './schema/index.ts'

// DB is optional — only initialized if DATABASE_URL is set
const dbUrl = (env as Record<string, unknown>).DATABASE_URL as string | undefined

export const db = dbUrl ? drizzle(dbUrl, { schema }) : null
export { schema }
