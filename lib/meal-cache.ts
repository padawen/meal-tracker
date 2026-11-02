import { formatDateOnly, parseDateOnly } from './utils'
import type { HolidayRow, MealRecordRow, ProfileSummary } from './meal-domain'

export interface MealRange { start: string; end: string }
export type RangeStatus = 'loading' | 'ready' | 'error'
export interface MealRangeResult {
  records: MealRecordRow[]
  holidays: HolidayRow[]
  profiles: Map<string, ProfileSummary>
}
interface Snapshot extends MealRangeResult {
  ranges: MealRange[]
  errors: MealRange[]
}
const nextDate = (date: string, offset: number) => {
  const result = parseDateOnly(date)
  result.setDate(result.getDate() + offset)
  return formatDateOnly(result)
}
export function missingRanges(required: MealRange, covered: MealRange[]): MealRange[] {
  let cursor = required.start
  const missing: MealRange[] = []
  for (const range of [...covered].sort((a, b) => a.start.localeCompare(b.start))) {
    if (range.end < cursor || range.start > required.end) continue
    if (range.start > cursor) missing.push({ start: cursor, end: nextDate(range.start, -1) })
    if (range.end >= cursor) cursor = nextDate(range.end, 1)
    if (cursor > required.end) break
  }
  if (cursor <= required.end) missing.push({ start: cursor, end: required.end })
  return missing
}
function mergeRanges(ranges: MealRange[]) {
  const result: MealRange[] = []
  for (const range of [...ranges].sort((a, b) => a.start.localeCompare(b.start))) {
    const previous = result[result.length - 1]
    if (previous && range.start <= nextDate(previous.end, 1)) {
      previous.end = previous.end > range.end ? previous.end : range.end
    } else result.push({ ...range })
  }
  return result
}
const overlaps = (a: MealRange, b: MealRange) => a.start <= b.end && b.start <= a.end

/** One canonical record set, with independent completeness for disjoint ranges. */
export class MealCache {
  private snapshot: Snapshot = { records: [], holidays: [], profiles: new Map(), ranges: [], errors: [] }
  private listeners = new Set<() => void>()
  private pending: { range: MealRange; promise: Promise<void>; priority: number }[] = []
  private queue: { priority: number; run: () => Promise<void> }[] = []
  private running = false
  private revision = 0
  private dateRevisions = new Map<string, number>()

  constructor(private fetchRange: (range: MealRange) => Promise<MealRangeResult>) {}
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  private publish(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    this.listeners.forEach((listener) => listener())
  }
  status(range: MealRange): RangeStatus {
    if (!missingRanges(range, this.snapshot.ranges).length) return 'ready'
    return this.snapshot.errors.some((error) => overlaps(error, range)) ? 'error' : 'loading'
  }
  ensure(range: MealRange, priority = 0): Promise<void> {
    if (range.start > range.end || this.status(range) === 'ready') return Promise.resolve()
    const waiting = this.pending.filter((task) => overlaps(task.range, range)).map((task) => {
      task.priority = Math.min(task.priority, priority)
      return task.promise
    })
    const missing = missingRanges(range, [...this.snapshot.ranges, ...this.pending.map((task) => task.range)])
    for (const part of missing) {
      let resolve!: () => void
      let reject!: (error: unknown) => void
      const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail })
      const task = { range: part, promise, priority }
      this.pending.push(task)
      this.queue.push({ get priority() { return task.priority }, run: async () => {
        const revision = this.revision
        this.publish({ errors: this.snapshot.errors.filter((error) => !overlaps(error, part)) })
        try {
          const result = await this.fetchRange(part)
          this.merge(result, part, revision)
          this.publish({ ranges: mergeRanges([...this.snapshot.ranges, part]) })
          resolve()
        } catch (error) {
          this.publish({ errors: [...this.snapshot.errors, part] })
          reject(error)
        } finally {
          this.pending = this.pending.filter((pending) => pending !== task)
        }
      } })
      waiting.push(promise)
    }
    this.pump()
    return Promise.all(waiting).then(() => undefined)
  }
  private pump() {
    if (this.running || !this.queue.length) return
    this.queue.sort((a, b) => a.priority - b.priority)
    const task = this.queue.shift()!
    this.running = true
    void task.run().finally(() => { this.running = false; this.pump() })
  }
  private merge(result: MealRangeResult, range: MealRange, revision: number) {
    const canReplace = (date: string) => (this.dateRevisions.get(date) || 0) <= revision
    const records = new Map(this.snapshot.records.map((record) => [record.date, record]))
    for (const date of records.keys()) {
      if (date >= range.start && date <= range.end && canReplace(date)) records.delete(date)
    }
    result.records.forEach((record) => { if (canReplace(record.date)) records.set(record.date, record) })
    const holidays = new Map(this.snapshot.holidays.map((holiday) => [holiday.date, holiday]))
    for (const date of holidays.keys()) if (date >= range.start && date <= range.end) holidays.delete(date)
    result.holidays.forEach((holiday) => holidays.set(holiday.date, holiday))
    this.publish({
      records: [...records.values()].sort((a, b) => a.date.localeCompare(b.date)),
      holidays: [...holidays.values()], profiles: new Map([...this.snapshot.profiles, ...result.profiles]),
    })
  }
  update(date: string, update: Partial<MealRecordRow> | null | ((record: MealRecordRow | undefined) => MealRecordRow | null)) {
    this.dateRevisions.set(date, ++this.revision)
    const current = this.snapshot.records.find((record) => record.date === date)
    const next = typeof update === 'function' ? update(current) : update ? { ...current, ...update, date } as MealRecordRow : null
    const records = this.snapshot.records.filter((record) => record.date !== date)
    if (next) records.push(next)
    this.publish({ records: records.sort((a, b) => a.date.localeCompare(b.date)) })
  }
  async refresh(date: string) {
    const version = ++this.revision
    this.dateRevisions.set(date, version)
    const range = { start: date, end: date }
    const result = await this.fetchRange(range)
    // A newer mutation/refresh wins even if this request resolves last.
    if (this.dateRevisions.get(date) !== version) return
    this.merge(result, range, version)
  }
}
