import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const videoStatusEnum = pgEnum('video_status', [
  'pending',
  'extracting',
  'transcribing',
  'deduplicating',
  'completed',
  'failed',
])

export const uploads = pgTable('uploads', {
  id: uuid('id').defaultRandom().primaryKey(),
  originalFilename: text('original_filename').notNull(),
  videoCount: integer('video_count').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('processing'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const videos = pgTable('videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  uploadId: uuid('upload_id').notNull(),
  filename: text('filename').notNull(),
  title: text('title'),
  duration: integer('duration'),
  resolution: text('resolution'),
  status: videoStatusEnum('status').notNull().default('pending'),
  progress: integer('progress').notNull().default(0),
  outputPath: text('output_path').notNull(),
  metadata: jsonb('metadata').default('{}'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
