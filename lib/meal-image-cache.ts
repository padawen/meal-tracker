export type ImageState =
  | { status: 'idle' | 'loading'; url?: undefined }
  | { status: 'ready'; url: string | null }
  | { status: 'error'; url?: undefined }

const IDLE: ImageState = { status: 'idle' }

/** Payloads stay out of the canonical metadata and are bounded independently. */
export class MealImageCache {
  private entries = new Map<string, ImageState>()
  private listeners = new Set<() => void>()
  private pending = new Map<string, Promise<void>>()
  private versions = new Map<string, number>()
  private queue: { id: string; priority: number; run: () => Promise<void> }[] = []
  private running = 0

  constructor(private fetchImage: (id: string) => Promise<string | null>, private capacity = 12) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  get = (id?: string): ImageState => id ? this.entries.get(id) || IDLE : IDLE
  private emit() { this.listeners.forEach((listener) => listener()) }
  private trim() {
    const settled = [...this.entries].filter(([, value]) => value.status !== 'loading')
    for (const [id] of settled.slice(0, Math.max(0, settled.length - this.capacity))) this.entries.delete(id)
  }
  invalidate(id: string) {
    this.versions.set(id, (this.versions.get(id) || 0) + 1)
    this.entries.delete(id)
    this.pending.delete(id)
    this.emit()
  }
  seed(id: string, url: string | null) {
    this.invalidate(id)
    this.entries.set(id, { status: 'ready', url })
    this.trim()
    this.emit()
  }
  load(id: string, priority = 0): Promise<void> {
    const entry = this.entries.get(id)
    if (entry?.status === 'ready') {
      this.entries.delete(id)
      this.entries.set(id, entry)
      return Promise.resolve()
    }
    const pending = this.pending.get(id)
    if (pending) {
      const task = this.queue.find((task) => task.id === id)
      if (task) task.priority = Math.min(task.priority, priority)
      return pending
    }
    const version = this.versions.get(id) || 0
    this.entries.set(id, { status: 'loading' })
    let resolve!: () => void
    const promise = new Promise<void>((done) => { resolve = done })
    this.pending.set(id, promise)
    this.queue.push({ id, priority, run: async () => {
      try {
        const url = await this.fetchImage(id)
        if ((this.versions.get(id) || 0) === version) this.entries.set(id, { status: 'ready', url })
      } catch {
        if ((this.versions.get(id) || 0) === version) this.entries.set(id, { status: 'error' })
      } finally {
        if (this.pending.get(id) === promise) this.pending.delete(id)
        this.trim()
        this.emit()
        resolve()
      }
    } })
    this.emit()
    this.pump()
    return promise
  }
  private pump() {
    this.queue.sort((a, b) => a.priority - b.priority)
    while (this.running < 2 && this.queue.length) {
      const task = this.queue.shift()!
      this.running++
      void task.run().finally(() => { this.running--; this.pump() })
    }
  }
}
