export type EventType =
  // Project lifecycle
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'

  // Knowledge space
  | 'knowledge.card.created'
  | 'knowledge.card.updated'
  | 'knowledge.card.archived'
  | 'knowledge.relation.created'
  | 'knowledge.relation.updated'
  | 'knowledge.tag.updated'

  // Logic tree & hypothesis
  | 'logic.tree.created'
  | 'logic.tree.updated'
  | 'logic.node.created'
  | 'logic.node.updated'
  | 'hypothesis.created'
  | 'hypothesis.updated'
  | 'hypothesis.validated'

  // Task board
  | 'task.posted'
  | 'task.claimed'
  | 'task.released'
  | 'task.submitted'
  | 'task.reviewed'
  | 'task.completed'
  | 'task.failed'

  // Agent collaboration
  | 'agent.registered'
  | 'agent.instance.spawned'
  | 'agent.instance.terminated'
  | 'agent.heartbeat'

  // Evidence & delivery
  | 'evidence.submitted'
  | 'delivery.generated'
  | 'delivery.self_checked'

  // System
  | 'system.error'

  // Video processing
  | 'video.uploaded'
  | 'video.processing.started'
  | 'video.progress.updated'
  | 'video.processing.completed'
  | 'video.processing.failed'
  | 'video.deleted'

export interface DomainEvent<T = unknown> {
  id: string
  type: EventType
  timestamp: number
  projectId?: string
  aggregateId?: string
  payload: T
  metadata?: {
    source?: string
    correlationId?: string
    causationId?: string
  }
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>
