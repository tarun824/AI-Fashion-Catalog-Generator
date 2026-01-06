import os from "os";
import { fileURLToPath } from "url";
import { Worker } from "worker_threads";
import { jobStore } from "../jobs/jobStore.js";
import { buildWorkbookBuffer } from "./excel.js";

const CONCURRENCY =
  Number.parseInt(process.env.WORKER_CONCURRENCY ?? "4", 10) ||
  Math.max(2, Math.min(6, os.cpus().length));

const workerPath = fileURLToPath(
  new URL("../workers/processImage.js", import.meta.url)
);

const releaseFileBuffers = (job) => {
  if (!job?.files) {
    return;
  }
  job.files.forEach((file) => {
    if (file && file.buffer) {
      file.buffer = null;
    }
  });
};

class WorkerQueue {
  constructor(limit) {
    this.limit = limit;
    this.active = 0;
    this.queue = [];
  }

  push(task) {
    return new Promise((resolve, reject) => {
      const execute = () => {
        this.active += 1;
        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.active -= 1;
            this.next();
          });
      };
      if (this.active < this.limit) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  next() {
    if (this.queue.length === 0 || this.active >= this.limit) {
      return;
    }
    const task = this.queue.shift();
    task();
  }
}

const queue = new WorkerQueue(CONCURRENCY);

const runWorkerTask = (payload) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: payload,
    });

    worker.once("message", (message) => {
      if (message.error) {
        reject(new Error(message.error));
      } else {
        resolve(message);
      }
    });

    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });

export const startJobProcessing = (job, tasks) => {
  jobStore.setStatus(job.id, "processing");

  const taskPromises = tasks.map((task) =>
    queue.push(async () => {
      jobStore.markFileStatus(job.id, task.fileId, "processing");
      const startedAt = Date.now();
      try {
        const result = await runWorkerTask(task);
        jobStore.markSuccess(job.id, task.fileId, {
          description: result.description,
          tokens: result.tokens,
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        jobStore.markFailure(job.id, task.fileId, error.message);
      }
    })
  );

  Promise.allSettled(taskPromises).then(async () => {
    const latestJob = jobStore.get(job.id);
    if (!latestJob) {
      return;
    }
    try {
      const buffer = await buildWorkbookBuffer(latestJob);
      const filename = `fashion-catalog-${job.id}.xlsx`;
      releaseFileBuffers(latestJob);
      jobStore.finalize(job.id, { buffer, filename });
    } catch (error) {
      releaseFileBuffers(latestJob);
      jobStore.finalize(job.id, {
        buffer: null,
        filename: null,
      });
      console.error("Failed to build workbook", error);
    }
  });
};
