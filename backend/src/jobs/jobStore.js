import EventEmitter from "events";
import { randomUUID } from "crypto";

const jobs = new Map();
const DEFAULT_ESTIMATE_MS =
  Number(process.env.ESTIMATE_IMAGE_SECONDS ?? 20) * 1000;

const getEmitter = (job) => job.emitter;

const calculateEtaSeconds = (job) => {
  const processed = job.completed + job.failed;
  const remaining = Math.max(job.total - processed, 0);
  if (remaining <= 0) {
    return 0;
  }
  const durations = job.results
    .map((result) => result.durationMs)
    .filter((value) => typeof value === "number" && value > 0);
  const averageMs =
    durations.length > 0
      ? durations.reduce((sum, value) => sum + value, 0) / durations.length
      : DEFAULT_ESTIMATE_MS;
  return Math.max(Math.round((remaining * averageMs) / 1000), 0);
};

const sanitizeJob = (job) => {
  const processed = job.completed + job.failed;
  const progressPercent = job.total
    ? Math.round((processed / job.total) * 100)
    : 0;
  const { emitter, download, ...rest } = job;
  return {
    ...rest,
    downloadReady: Boolean(download),
    progressPercent,
    etaSeconds: calculateEtaSeconds(job),
  };
};

export const jobStore = {
  create(filesMeta) {
    const id = randomUUID();
    const job = {
      id,
      status: "queued",
      total: filesMeta.length,
      completed: 0,
      failed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: filesMeta,
      results: [],
      errors: [],
      emitter: new EventEmitter(),
      download: null,
    };
    jobs.set(id, job);
    return job;
  },

  get(jobId) {
    return jobs.get(jobId);
  },

  summary(jobId) {
    const job = jobs.get(jobId);
    if (!job) {
      return null;
    }
    return sanitizeJob(job);
  },

  setStatus(jobId, status, extra = {}) {
    const job = jobs.get(jobId);
    if (!job) {
      return;
    }
    job.status = status;
    job.updatedAt = new Date().toISOString();
    Object.assign(job, extra);
    this.emit(jobId);
  },

  markFileStatus(jobId, fileId, status, extra = {}) {
    const job = jobs.get(jobId);
    if (!job) {
      return;
    }
    const target = job.files.find((file) => file.id === fileId);
    if (target) {
      target.status = status;
      Object.assign(target, extra);
      job.updatedAt = new Date().toISOString();
      this.emit(jobId);
    }
  },

  markSuccess(jobId, fileId, payload) {
    const job = jobs.get(jobId);
    if (!job) {
      return;
    }
    job.completed += 1;
    job.results.push({ fileId, ...payload });
    this.markFileStatus(jobId, fileId, "completed", {
      durationMs: payload.durationMs,
    });
  },

  markFailure(jobId, fileId, error) {
    const job = jobs.get(jobId);
    if (!job) {
      return;
    }
    job.failed += 1;
    job.errors.push({ fileId, error });
    this.markFileStatus(jobId, fileId, "failed", { error });
  },

  finalize(jobId, { buffer, filename }) {
    const job = jobs.get(jobId);
    if (!job) {
      return;
    }
    job.download = buffer ? { buffer, filename } : null;
    if (job.completed === 0) {
      job.status = "failed";
    } else if (job.failed > 0) {
      job.status = "completed_with_errors";
    } else {
      job.status = "completed";
    }
    job.updatedAt = new Date().toISOString();
    this.emit(jobId);
  },

  emit(jobId) {
    const job = jobs.get(jobId);
    if (!job) {
      return;
    }
    const emitter = getEmitter(job);
    emitter.emit("update", sanitizeJob(job));
  },

  subscribe(jobId, listener) {
    const job = jobs.get(jobId);
    if (!job) {
      return null;
    }
    const emitter = getEmitter(job);
    emitter.on("update", listener);
    return () => emitter.off("update", listener);
  },

  getDownload(jobId) {
    const job = jobs.get(jobId);
    if (!job || !job.download) {
      return null;
    }
    return job.download;
  },
};
