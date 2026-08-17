import { monitorEventLoopDelay } from "node:perf_hooks";

const MAX_DURATION_SAMPLES = 200;

type JobOutcome = "completed" | "failed";

export type WorkerMetricsSnapshot = {
  process: {
    uptimeSec: number;
    pid: number;
    cpuPercent: number;
    memory: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
      externalMb: number;
    };
    eventLoopLagMs: {
      mean: number;
      p99: number;
      max: number;
    };
  };
  concurrency: {
    active: number;
    max: number;
    display: string;
  };
  jobs: {
    completed: number;
    failed: number;
    retried: number;
    successRate: number | null;
    durationMs: {
      count: number;
      avg: number | null;
      p50: number | null;
      p95: number | null;
      last: number | null;
    };
  };
  collectedAt: string;
};

function bytesToMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) {
    return null;
  }
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? null;
}

class WorkerMetrics {
  private completed = 0;
  private failed = 0;
  private retried = 0;
  private active = 0;
  private maxConcurrency = 1;
  private durationsMs: number[] = [];
  private lastDurationMs: number | null = null;

  private prevCpu = process.cpuUsage();
  private prevHr = process.hrtime.bigint();

  private readonly eventLoop = monitorEventLoopDelay({ resolution: 20 });

  constructor() {
    this.eventLoop.enable();
  }

  setMaxConcurrency(max: number): void {
    this.maxConcurrency = Math.max(1, max);
  }

  jobStarted(): void {
    this.active += 1;
  }

  jobFinished(): void {
    this.active = Math.max(0, this.active - 1);
  }

  recordJob(outcome: JobOutcome, durationMs: number, attemptsMade: number): void {
    this.jobFinished();

    if (outcome === "completed") {
      this.completed += 1;
    } else {
      this.failed += 1;
    }

    if (attemptsMade > 1) {
      this.retried += 1;
    }

    this.lastDurationMs = durationMs;
    this.durationsMs.push(durationMs);
    if (this.durationsMs.length > MAX_DURATION_SAMPLES) {
      this.durationsMs.shift();
    }
  }

  private cpuPercent(): number {
    const cpu = process.cpuUsage(this.prevCpu);
    const nowHr = process.hrtime.bigint();
    const elapsedUs = Number((nowHr - this.prevHr) / 1000n);

    this.prevCpu = process.cpuUsage();
    this.prevHr = nowHr;

    if (elapsedUs <= 0) {
      return 0;
    }

    const percent = ((cpu.user + cpu.system) / elapsedUs) * 100;
    return Math.round(percent * 100) / 100;
  }

  async snapshot(): Promise<WorkerMetricsSnapshot> {
    const mem = process.memoryUsage();
    const sorted = [...this.durationsMs].sort((a, b) => a - b);
    const total = this.completed + this.failed;
    const sum = this.durationsMs.reduce((acc, n) => acc + n, 0);

    const nsToMs = (ns: number) => Math.round((ns / 1e6) * 100) / 100;

    return {
      process: {
        uptimeSec: Math.round(process.uptime()),
        pid: process.pid,
        cpuPercent: this.cpuPercent(),
        memory: {
          rssMb: bytesToMb(mem.rss),
          heapUsedMb: bytesToMb(mem.heapUsed),
          heapTotalMb: bytesToMb(mem.heapTotal),
          externalMb: bytesToMb(mem.external),
        },
        eventLoopLagMs: {
          mean: nsToMs(this.eventLoop.mean),
          p99: nsToMs(this.eventLoop.percentile(99)),
          max: nsToMs(this.eventLoop.max),
        },
      },
      concurrency: {
        active: this.active,
        max: this.maxConcurrency,
        display: `${this.active}/${this.maxConcurrency}`,
      },
      jobs: {
        completed: this.completed,
        failed: this.failed,
        retried: this.retried,
        successRate:
          total === 0
            ? null
            : Math.round((this.completed / total) * 10_000) / 10_000,
        durationMs: {
          count: this.durationsMs.length,
          avg:
            this.durationsMs.length === 0
              ? null
              : Math.round(sum / this.durationsMs.length),
          p50: percentile(sorted, 50),
          p95: percentile(sorted, 95),
          last: this.lastDurationMs,
        },
      },
      collectedAt: new Date().toISOString(),
    };
  }
}

export const workerMetrics = new WorkerMetrics();

export function jobDurationMs(job: {
  processedOn?: number;
  finishedOn?: number;
}): number {
  const start = job.processedOn ?? Date.now();
  const end = job.finishedOn ?? Date.now();
  return Math.max(0, end - start);
}
