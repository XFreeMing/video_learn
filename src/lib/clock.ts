import { v4 as uuidv4 } from 'uuid'
import type { Clock } from './ports.ts'

/** Production clock backed by the system time and a real UUID generator. */
export const systemClock: Clock = {
  now: () => Date.now(),
  uuid: () => uuidv4(),
}
