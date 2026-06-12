import { and, eq } from 'drizzle-orm'
import { tasks } from '#/db/schema/task.ts'
import type { DbOrTx } from '#/db/types.ts'
import type { TaskRecord, TaskRepository, TaskStatus, TaskType } from './types.ts'

type Db = DbOrTx
type TaskRow = typeof tasks.$inferSelect

function toRecord(row: TaskRow): TaskRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    taskType: row.taskType,
    title: row.title,
    purpose: row.purpose,
    linkedHypothesisId: row.linkedHypothesisId ?? null,
    requiredCapabilities: (row.requiredCapabilities as string[] | null) ?? [],
    priorityScore: row.priorityScore ?? 0,
    status: row.status,
    claimedBy: row.claimedBy ?? null,
    claimedAt: row.claimedAt ? row.claimedAt.getTime() : null,
    createdAt: row.createdAt.getTime(),
  }
}

/** Drizzle-backed TaskRepository for production. */
export class DrizzleTaskRepository implements TaskRepository {
  constructor(private db: Db) {}

  async insert(task: TaskRecord): Promise<void> {
    await this.db.insert(tasks).values({
      id: task.id,
      projectId: task.projectId,
      taskType: task.taskType as TaskType,
      title: task.title,
      purpose: task.purpose,
      linkedHypothesisId: task.linkedHypothesisId,
      requiredCapabilities: task.requiredCapabilities,
      priorityScore: task.priorityScore,
      status: task.status as TaskStatus,
      claimedBy: task.claimedBy,
      claimedAt: task.claimedAt ? new Date(task.claimedAt) : null,
      createdAt: new Date(task.createdAt),
    })
  }

  async findById(id: string): Promise<TaskRecord | null> {
    const rows = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    return rows[0] ? toRecord(rows[0]) : null
  }

  async findOpenByProject(projectId: string): Promise<TaskRecord[]> {
    const rows = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), eq(tasks.status, 'open')))
    return rows.map(toRecord)
  }

  async save(task: TaskRecord): Promise<void> {
    await this.db
      .update(tasks)
      .set({
        status: task.status as TaskStatus,
        claimedBy: task.claimedBy,
        claimedAt: task.claimedAt ? new Date(task.claimedAt) : null,
        priorityScore: task.priorityScore,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id))
  }
}
