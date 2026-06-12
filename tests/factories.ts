/**
 * Test data factories - create domain objects with sensible defaults.
 * Override only what matters for your test case.
 *
 * Usage:
 *   const card = Factory.knowledgeCard({ title: 'SLA Policy' })
 *   const task = Factory.task({ taskType: 'validation', status: 'open' })
 */

import { v4 as uuidv4 } from 'uuid'

// ── Knowledge Domain ───────────────────────────────────────────────────

export interface KnowledgeCardData {
  id: string
  globalName: string
  spaceType: string
  spaceScope: string
  cardType: string
  status: string
  title: string
  content: Record<string, unknown>
  tags: string[]
  sources: unknown[]
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeRelationData {
  id: string
  fromCardId: string
  toCardId: string
  relationType: string
  metadata: Record<string, unknown>
  createdAt: Date
}

// ── Project Domain ─────────────────────────────────────────────────────

export interface ProjectData {
  id: string
  name: string
  description: string | null
  phase: string
  context: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface HypothesisData {
  id: string
  projectId: string
  logicNodeId: string | null
  statement: string
  status: string
  confidence: string
  evidence: unknown[]
  createdAt: Date
  updatedAt: Date
}

// ── Task Domain ────────────────────────────────────────────────────────

export interface TaskData {
  id: string
  projectId: string
  taskType: string
  title: string
  purpose: string
  linkedHypothesisId: string | null
  linkedLogicNodeId: string | null
  knowledgeContextRefs: unknown[]
  requiredCapabilities: string[]
  priorityScore: number
  status: string
  assignedTo: string | null
  claimedBy: string | null
  createdAt: Date
  updatedAt: Date
}

// ── Participant Domain ─────────────────────────────────────────────────

export interface ParticipantData {
  id: string
  type: string
  name: string
  capabilities: string[]
  permissions: string[]
  rating: Record<string, unknown>
  trustLevel: string
  status: string
  createdAt: Date
  updatedAt: Date
}

// ── Factory ────────────────────────────────────────────────────────────

export const Factory = {
  knowledgeCard(overrides: Partial<KnowledgeCardData> = {}): KnowledgeCardData {
    const now = new Date()
    return {
      id: uuidv4(),
      globalName: `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      spaceType: 'project',
      spaceScope: 'test-project-1',
      cardType: 'fact',
      status: 'active',
      title: 'Test Knowledge Card',
      content: { body: 'Test content' },
      tags: ['test/general'],
      sources: [],
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  },

  knowledgeRelation(overrides: Partial<KnowledgeRelationData> = {}): KnowledgeRelationData {
    return {
      id: uuidv4(),
      fromCardId: uuidv4(),
      toCardId: uuidv4(),
      relationType: 'supports',
      metadata: {},
      createdAt: new Date(),
      ...overrides,
    }
  },

  project(overrides: Partial<ProjectData> = {}): ProjectData {
    const now = new Date()
    return {
      id: uuidv4(),
      name: 'Test Project',
      description: 'A test project for TDD',
      phase: 'init',
      context: {},
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  },

  hypothesis(overrides: Partial<HypothesisData> = {}): HypothesisData {
    const now = new Date()
    return {
      id: uuidv4(),
      projectId: uuidv4(),
      logicNodeId: null,
      statement: 'The system supports 7x24 service',
      status: 'pending',
      confidence: 'unknown',
      evidence: [],
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  },

  task(overrides: Partial<TaskData> = {}): TaskData {
    const now = new Date()
    return {
      id: uuidv4(),
      projectId: uuidv4(),
      taskType: 'validation',
      title: 'Validate service capability',
      purpose: 'Verify hypothesis about 7x24 support',
      linkedHypothesisId: null,
      linkedLogicNodeId: null,
      knowledgeContextRefs: [],
      requiredCapabilities: ['research'],
      priorityScore: 50,
      status: 'open',
      assignedTo: null,
      claimedBy: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  },

  participant(overrides: Partial<ParticipantData> = {}): ParticipantData {
    const now = new Date()
    return {
      id: uuidv4(),
      type: 'internal_agent',
      name: 'Research Agent',
      capabilities: ['research', 'analysis'],
      permissions: ['read:enterprise', 'write:project'],
      rating: { score: 0.8 },
      trustLevel: 'trusted',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  },
}
