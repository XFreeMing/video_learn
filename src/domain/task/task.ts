/**
 * Task aggregate root.
 *
 * Encapsulates state + invariants + the domain events it produces. Application
 * services NEVER mutate task fields directly — they call behavior methods
 * (`post`, `claim`) which protect the invariants and `raise` domain events.
 * Events are collected internally and drained via `pullEvents()` so the
 * application layer can persist them to the outbox in the same transaction.
 */

import type { DomainEvent } from '#/event/event-types.ts'
import type { Clock } from '#/lib/ports.ts'
import type { TaskRecord, TaskType } from '#/repositories/types.ts'

/** Raised when an operation would violate a Task business rule. */
export class TaskInvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TaskInvariantError'
  }
}

export interface PostTaskProps {
  projectId: string
  taskType: TaskType
  title: string
  purpose: string
  linkedHypothesisId?: string | null
  requiredCapabilities?: string[]
  priorityScore?: number
}

export class Task {
  private pendingEvents: DomainEvent[] = []

  private constructor(private state: TaskRecord) {}

  // ── Factory (creation is a behavior that emits an event) ─────────────

  static post(props: PostTaskProps, clock: Clock): Task {
    if (!props.title.trim()) {
      throw new TaskInvariantError('Task title must not be empty')
    }
    if (!props.projectId) {
      throw new TaskInvariantError('Task must belong to a project')
    }

    const now = clock.now()
    const id = clock.uuid()
    const task = new Task({
      id,
      projectId: props.projectId,
      taskType: props.taskType,
      title: props.title,
      purpose: props.purpose,
      linkedHypothesisId: props.linkedHypothesisId ?? null,
      requiredCapabilities: props.requiredCapabilities ?? [],
      priorityScore: props.priorityScore ?? 50,
      status: 'open',
      claimedBy: null,
      claimedAt: null,
      createdAt: now,
    })

    task.raise(clock, 'task.posted', id, {
      taskId: id,
      title: props.title,
      taskType: props.taskType,
    })

    return task
  }

  /** Rehydrate an aggregate from its persisted snapshot (no events emitted). */
  static fromSnapshot(state: TaskRecord): Task {
    return new Task({ ...state })
  }

  // ── Behavior ─────────────────────────────────────────────────────────

  claim(participantId: string, clock: Clock): void {
    if (!participantId) {
      throw new TaskInvariantError('participantId is required to claim a task')
    }
    if (this.state.status !== 'open') {
      throw new TaskInvariantError(`Task is not claimable, current status: ${this.state.status}`)
    }

    this.state.status = 'claimed'
    this.state.claimedBy = participantId
    this.state.claimedAt = clock.now()

    this.raise(clock, 'task.claimed', this.state.id, {
      taskId: this.state.id,
      participantId,
    })
  }

  // ── Accessors ────────────────────────────────────────────────────────

  get id(): string {
    return this.state.id
  }

  /** Immutable copy of the persistence snapshot. */
  get snapshot(): TaskRecord {
    return { ...this.state }
  }

  /** Drain the uncommitted domain events (clears the internal buffer). */
  pullEvents(): DomainEvent[] {
    const events = this.pendingEvents
    this.pendingEvents = []
    return events
  }

  // ── Internals ────────────────────────────────────────────────────────

  private raise(
    clock: Clock,
    type: DomainEvent['type'],
    aggregateId: string,
    payload: unknown,
  ): void {
    this.pendingEvents.push({
      id: clock.uuid(),
      type,
      timestamp: clock.now(),
      projectId: this.state.projectId,
      aggregateId,
      payload,
    })
  }
}
