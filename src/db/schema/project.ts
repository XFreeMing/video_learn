import { jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const projectPhaseEnum = pgEnum('project_phase', [
  'init',
  'problem_framing',
  'structuring',
  'evidence_gathering',
  'analysis',
  'synthesis',
  'delivery',
  'completed',
  'archived',
])

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  phase: projectPhaseEnum('phase').notNull().default('init'),
  context: jsonb('context').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const logicTrees = pgTable('logic_trees', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  treeType: varchar('tree_type', { length: 32 }).notNull(), // issue | hypothesis | decision
  phase: projectPhaseEnum('phase').notNull(),
  version: varchar('version', { length: 16 }).notNull().default('1'),
  nodes: jsonb('nodes').notNull().default('[]'),
  edges: jsonb('edges').notNull().default('[]'),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const hypotheses = pgTable('hypotheses', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  logicNodeId: text('logic_node_id'),
  statement: text('statement').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'), // pending | supported | refuted | mixed | inconclusive
  confidence: varchar('confidence', { length: 16 }).default('unknown'), // low | medium | high
  evidence: jsonb('evidence').default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id),
  eventType: varchar('event_type', { length: 128 }).notNull(),
  aggregateId: uuid('aggregate_id'),
  payload: jsonb('payload').notNull(),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
