/**
 * Test utilities barrel export.
 *
 * Import everything you need for TDD:
 *   import { createTestDeps, Factory } from '../../tests'
 */

export { Factory } from './factories'
export { InMemoryProcessedEventStore, InMemoryUnitOfWork } from './in-memory-messaging'
export {
  createInMemoryRepositories,
  InMemoryTaskReadStore,
  InMemoryTaskRepository,
  mapBackedTaskRepository,
} from './in-memory-repositories'
export type { TestDeps } from './mocks'
export { createMockClock, createMockEventBus, createMockLogger, createTestDeps } from './mocks'
