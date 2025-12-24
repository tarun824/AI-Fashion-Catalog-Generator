import os from "os";
import { Worker } from "worker_threads";
import { randomUUID } from "crypto";

export default class WorkerPool {
  constructor({ size, workerPath, workerData }) {
    if (!workerPath) {
      throw new Error("workerPath is required");
    }

    this.size =
      Number(size) ||
      Math.max(1, Math.min(8, Math.floor(os.cpus().length / 2))) ||
      1;
    this.workerPath = workerPath;
    this.workerData = workerData;

    this.queue = [];
    this.idleWorkers = [];
    this.tasks = new Map();

    for (let index = 0; index < this.size; index += 1) {
      this.spawnWorker();
    }
  }

  spawnWorker() {
    const worker = new Worker(this.workerPath, {
      workerData: this.workerData,
    });

    worker.currentTaskId = null;

    worker.on("message", (message) => this.handleMessage(worker, message));
    worker.on("error", (error) => this.handleWorkerFailure(worker, error));
    worker.on("exit", (code) => this.handleWorkerExit(worker, code));

    this.idleWorkers.push(worker);
    this.processQueue();
  }

  handleMessage(worker, message) {
    const { taskId, status, result, error } = message;
    const task = this.tasks.get(taskId);

    worker.currentTaskId = null;

    if (task) {
      this.tasks.delete(taskId);
      if (status === "success") {
        task.resolve(result);
      } else {
        const err = new Error(error?.message || "Worker task failed");
        err.detail = error?.detail;
        task.reject(err);
      }
    }

    this.idleWorkers.push(worker);
    this.processQueue();
  }

  handleWorkerFailure(worker, error) {
    if (worker.currentTaskId) {
      const task = this.tasks.get(worker.currentTaskId);
      if (task) {
        task.reject(error);
        this.tasks.delete(worker.currentTaskId);
      }
    }
    this.replaceWorker(worker);
  }

  handleWorkerExit(worker, code) {
    if (worker.currentTaskId) {
      const task = this.tasks.get(worker.currentTaskId);
      if (task) {
        task.reject(new Error(`Worker exited with code ${code}`));
        this.tasks.delete(worker.currentTaskId);
      }
    }
    this.replaceWorker(worker);
  }

  replaceWorker(worker) {
    const idleIndex = this.idleWorkers.indexOf(worker);
    if (idleIndex >= 0) {
      this.idleWorkers.splice(idleIndex, 1);
    }
    this.spawnWorker();
  }

  processQueue() {
    while (this.idleWorkers.length > 0 && this.queue.length > 0) {
      const worker = this.idleWorkers.pop();
      const task = this.queue.shift();

      if (!worker || !task) {
        continue;
      }

      this.tasks.set(task.id, task);
      worker.currentTaskId = task.id;
      task.hooks?.onStart?.();
      worker.postMessage({ taskId: task.id, payload: task.payload });
    }
  }

  runTask(payload, hooks = {}) {
    return new Promise((resolve, reject) => {
      const task = {
        id: randomUUID(),
        payload,
        resolve,
        reject,
        hooks,
      };
      this.queue.push(task);
      this.processQueue();
    });
  }
}

