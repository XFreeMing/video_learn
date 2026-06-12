import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { taskStatusEnum, taskTypeEnum } from './task.ts'

/**
 * Denormalized read model (CQRS query side) for the task board.
 *
 * Maintained by the `task-read-projection` consumer from domain events.
 * Never written to by command handlers — queries read exclusively from here.
 */
export const taskReadView = pgTable(
  'task_read_view',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id').notNull(),
    taskType: taskTypeEnum('task_type').notNull(),
    title: text('title').notNull(),
    status: taskStatusEnum('status').notNull(),
    claimedBy: uuid('claimed_by'),
    priorityScore: integer('priority_score').notNull().default(0),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [index('task_read_open_idx').on(table.projectId, table.status)],
)
