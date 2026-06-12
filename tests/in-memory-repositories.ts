import type {
  Repositories,
  TaskReadStore,
  TaskRecord,
  TaskRepository,
  TaskView,
} from '#/repositories/types.ts'

/** Build a Map-backed TaskRepository over the given store (used for both the
 * committed store and a transaction's staging copy). */
export function mapBackedTaskRepository(store: Map<string, TaskRecord>): TaskRepository {
  return {
    async insert(task) {
      store.set(task.id, { ...task })
    },
    async findById(id) {
      const found = store.get(id)
      return found ? { ...found } : null
    },
    async findOpenByProject(projectId) {
      return [...store.values()]
        .filter((t) => t.projectId === projectId && t.status === 'open')
        .map((t) => ({ ...t }))
    },
    async save(task) {
      store.set(task.id, { ...task })
    },
  }
}

/** In-memory TaskRepository for tests — same contract as the Drizzle impl. */
export class InMemoryTaskRepository implements TaskRepository {
  private store = new Map<string, TaskRecord>()
  private impl = mapBackedTaskRepository(this.store)

  insert = this.impl.insert
  findById = this.impl.findById
  findOpenByProject = this.impl.findOpenByProject
  save = this.impl.save
}

/** In-memory read model (query side of CQRS), written only by projections. */
export class InMemoryTaskReadStore implements TaskReadStore {
  private store = new Map<string, TaskView>()

  async upsert(view: TaskView): Promise<void> {
    this.store.set(view.id, { ...view })
  }

  async findById(id: string): Promise<TaskView | null> {
    const found = this.store.get(id)
    return found ? { ...found } : null
  }

  async findOpenByProject(projectId: string): Promise<TaskView[]> {
    return [...this.store.values()]
      .filter((v) => v.projectId === projectId && v.status === 'open')
      .map((v) => ({ ...v }))
  }
}

/** Build a fresh in-memory Repositories bag for a test. */
export function createInMemoryRepositories(): Repositories {
  return {
    tasks: new InMemoryTaskRepository(),
  }
}
