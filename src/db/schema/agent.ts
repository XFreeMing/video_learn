import { jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const participantTypeEnum = pgEnum('participant_type', [
  'internal_agent',
  'external_agent',
  'human_contributor',
  'human_decision_maker',
  'tool_worker',
])

export const participants = pgTable('participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: participantTypeEnum('type').notNull(),
  name: text('name').notNull(),
  capabilities: jsonb('capabilities').default('[]'),
  permissions: jsonb('permissions').default('[]'),
  rating: jsonb('rating').default('{}'),
  trustLevel: varchar('trust_level', { length: 16 }).default('unrated'),
  maxConcurrency: jsonb('max_concurrency').default('1'),
  status: varchar('status', { length: 16 }).notNull().default('active'), // active | idle | busy | offline
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const agentInstances = pgTable('agent_instances', {
  id: uuid('id').defaultRandom().primaryKey(),
  baseAgentId: uuid('base_agent_id')
    .references(() => participants.id)
    .notNull(),
  projectId: uuid('project_id').notNull(),
  taskId: uuid('task_id').notNull(),
  runtimeSessionKey: text('runtime_session_key'),
  status: varchar('status', { length: 16 }).notNull().default('idle'), // idle | running | failed | terminated
  createdAt: timestamp('created_at').defaultNow().notNull(),
  terminatedAt: timestamp('terminated_at'),
})
