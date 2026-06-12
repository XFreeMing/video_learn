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
import { projects } from './project.ts'

export const taskStatusEnum = pgEnum('task_status', [
  'open',
  'claimed',
  'submitted',
  'accepted',
  'rejected',
  'revision_required',
  'completed',
  'failed',
])

export const taskTypeEnum = pgEnum('task_type', [
  'validation',
  'evidence',
  'research',
  'analysis',
  'delivery',
  'review',
  'conflict',
  'human',
])

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  taskType: taskTypeEnum('task_type').notNull(),
  title: text('title').notNull(),
  purpose: text('purpose').notNull(),
  linkedHypothesisId: uuid('linked_hypothesis_id'),
  linkedLogicNodeId: text('linked_logic_node_id'),
  knowledgeContextRefs: jsonb('knowledge_context_refs').default('[]'),
  requiredCapabilities: jsonb('required_capabilities').default('[]'),
  requiredPermissions: jsonb('required_permissions').default('[]'),
  expectedOutputSchema: jsonb('expected_output_schema'),
  acceptanceCriteria: jsonb('acceptance_criteria'),
  priorityScore: integer('priority_score').default(0),
  deadline: timestamp('deadline'),
  dependsOn: jsonb('depends_on').default('[]'),
  claimPolicy: varchar('claim_policy', { length: 32 }).default('exclusive'),
  reviewPolicy: varchar('review_policy', { length: 32 }).default('auto'),
  riskLevel: varchar('risk_level', { length: 16 }).default('low'),
  status: taskStatusEnum('status').notNull().default('open'),
  assignedTo: uuid('assigned_to'),
  claimedBy: uuid('claimed_by'),
  claimedAt: timestamp('claimed_at'),
  leaseExpiresAt: timestamp('lease_expires_at'),
  heartbeatAt: timestamp('heartbeat_at'),
  result: jsonb('result'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
