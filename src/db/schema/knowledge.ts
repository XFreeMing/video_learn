import { jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

// ── Enums ──────────────────────────────────────────────────────────────

export const cardTypeEnum = pgEnum('card_type', [
  'fact',
  'evidence',
  'rule',
  'process',
  'template',
  'experience',
  'artifact',
  'decision',
])

export const cardStatusEnum = pgEnum('card_status', ['draft', 'active', 'archived'])

// ── Knowledge Cards ────────────────────────────────────────────────────

export const knowledgeCards = pgTable('knowledge_cards', {
  id: uuid('id').defaultRandom().primaryKey(),
  globalName: text('global_name').unique().notNull(),
  spaceType: varchar('space_type', {
    length: 32,
  }).notNull(), // enterprise | project | personal | agent
  spaceScope: text('space_scope').notNull(), // namespace like org_id, project_id
  cardType: cardTypeEnum('card_type').notNull(),
  status: cardStatusEnum('status').notNull().default('draft'),
  title: text('title').notNull(),
  content: jsonb('content').notNull(),
  tags: jsonb('tags').default('[]'), // MECE tag paths
  sources: jsonb('sources').default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Knowledge Card Relations (graph edges) ─────────────────────────────

export const knowledgeRelations = pgTable('knowledge_relations', {
  id: uuid('id').defaultRandom().primaryKey(),
  fromCardId: uuid('from_card_id')
    .references(() => knowledgeCards.id)
    .notNull(),
  toCardId: uuid('to_card_id')
    .references(() => knowledgeCards.id)
    .notNull(),
  relationType: varchar('relation_type', { length: 64 }).notNull(),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── MECE Tag Trees ─────────────────────────────────────────────────────

export const tagTrees = pgTable('tag_trees', {
  id: uuid('id').defaultRandom().primaryKey(),
  treeName: text('tree_name').notNull(),
  spaceType: varchar('space_type', { length: 32 }).notNull(),
  parentPath: text('parent_path'), // null = root
  fullPath: text('full_path').unique().notNull(),
  label: text('label').notNull(),
  depth: varchar('depth', { length: 8 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
