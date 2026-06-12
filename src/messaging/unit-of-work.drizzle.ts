import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '#/db/schema/index.ts'
import { DrizzleTaskRepository } from '#/repositories/task-repository.drizzle.ts'
import { DrizzleOutboxStore } from './outbox.drizzle.ts'
import type { TxContext, UnitOfWork } from './types.ts'

/**
 * Drizzle-backed Unit of Work.
 *
 * Runs the command's work inside a single `db.transaction`, binding both the
 * aggregate repository and the outbox store to the SAME transaction handle.
 * Aggregate state and the outbox row therefore commit (or roll back)
 * atomically — the core guarantee of the transactional outbox pattern.
 */
export class DrizzleUnitOfWork implements UnitOfWork {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  run<T>(work: (ctx: TxContext) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => {
      const ctx: TxContext = {
        tasks: new DrizzleTaskRepository(tx),
        outbox: new DrizzleOutboxStore(tx),
      }
      return work(ctx)
    })
  }
}
