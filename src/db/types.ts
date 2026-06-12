import type { ExtractTablesWithRelations } from 'drizzle-orm'
import type { NodePgDatabase, NodePgQueryResultHKT } from 'drizzle-orm/node-postgres'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import type * as schema from './schema/index.ts'

/** The Drizzle transaction handle yielded by `db.transaction(...)`. */
export type Tx = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

/**
 * A query executor that is either the root connection or an open
 * transaction. Repositories accept this so the same code runs inside or
 * outside a Unit of Work.
 */
export type DbOrTx = NodePgDatabase<typeof schema> | Tx
