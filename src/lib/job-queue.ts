// Semaphore to limit concurrent Chromium/Puppeteer instances
// Multiple concurrent PDF jobs → OOM killer → SIGKILL
// Limit to 1 concurrent Chromium instance to prevent OOM

class JobSemaphore {
  private running = 0
  private readonly max: number
  private queue: Array<() => void> = []

  constructor(max = 1) {
    this.max = max
  }

  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++
      return
    }
    return new Promise(resolve => {
      this.queue.push(() => {
        this.running++
        resolve()
      })
    })
  }

  release(): void {
    this.running--
    const next = this.queue.shift()
    if (next) next()
  }

  get queued(): number {
    return this.queue.length
  }

  get active(): number {
    return this.running
  }
}

export const chromiumSemaphore = new JobSemaphore(1)
