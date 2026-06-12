import { and, asc, eq } from 'drizzle-orm'
import { taskReadView } from '#/db/schema/task-read-view.ts'
import type { DbOrTx } from '#/db/types.ts'
import type { TaskReadStore, TaskStatus, TaskType, TaskView } from './types.ts'

type ReadRow = typeof taskReadView.$inferSelect

function toView(row: ReadRow): TaskView {
  return {
    id: row.id,
    projectId: row.projectId,
    taskType: row.taskType,
    title: row.title,
    status: row.status,
    claimedBy: row.claimedBy ?? null,
    priorityScore: row.priorityScore,
    createdAt: row.createdAt.getTime(),
  }
}

/**
 * Drizzle-backed CQRS read model for tasks. `upsert` is called by the
 * projection; the `find*` methods serve queries. Open tasks are returned
 * highest-priority first.
 */
export class DrizzleTaskReadStore implements TaskReadStore {
  constructor(private db: DbOrTx) {}

  async upsert(view: TaskView): Promise<void> {
    const values = {
      id: view.id,
      projectId: view.projectId,
      taskType: view.taskType as TaskType,
      title: view.title,
      status: view.status as TaskStatus,
      claimedBy: view.claimedBy,
      priorityScore: view.priorityScore,
      createdAt: new Date(view.createdAt),
    }
    await this.db
      .insert(taskReadView)
      .values(values)
      .onConflictDoUpdate({
        target: taskReadView.id,
        set: {
          status: values.status,
          claimedBy: values.claimedBy,
          priorityScore: values.priorityScore,
          title: values.title,
        },
      })
  }

  async findById(id: string): Promise<TaskView | null> {
    const rows = await this.db.select().from(taskReadView).where(eq(taskReadView.id, id)).limit(1)
    return rows[0] ? toView(rows[0]) : null
  }

  async findOpenByProject(projectId: string): Promise<TaskView[]> {
    const rows = await this.db
      .select()
      .from(taskReadView)
      .where(and(eq(taskReadView.projectId, projectId), eq(taskReadView.status, 'open')))
      .orderBy(asc(taskReadView.createdAt))
    return rows.map(toView)
  }
}
