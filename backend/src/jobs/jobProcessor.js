import WorkerPool from "./workerPool.js";
import {
  appendImagesToJob,
  createJob,
  getJob,
  isJobComplete,
  markExcelBuilding,
  markExcelError,
  markExcelReady,
  markImageCompleted,
  markImageFailed,
  markImageProcessing,
  serializeJob,
} from "./jobStore.js";
import { buildExcelForJob } from "./excelExporter.js";

const workerPath = new URL("../workers/imageWorker.js", import.meta.url);
const workerPool = new WorkerPool({
  size: process.env.WORKER_POOL_SIZE,
  workerPath,
  workerData: {
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
  },
});

const scheduleExcelIfNeeded = (jobId) => {
  const job = getJob(jobId);
  if (!job || !isJobComplete(jobId)) {
    return;
  }

  if (job.excel.ready || job.excel.building) {
    return;
  }

  markExcelBuilding(jobId);
  const snapshot = JSON.parse(JSON.stringify(job));

  buildExcelForJob(snapshot)
    .then((filePath) => markExcelReady(jobId, filePath))
    .catch((error) => markExcelError(jobId, error.message || "Excel export failed"));
};

const dispatchTask = (jobId, task, systemPrompt) => {
  workerPool
    .runTask(
      {
        imageBase64: task.imageBase64,
        mimeType: task.mimeType,
        filename: task.filename,
        systemPrompt,
      },
      {
        onStart: () => markImageProcessing(jobId, task.id),
      },
    )
    .then((result) => {
      markImageCompleted(jobId, task.id, result.description ?? "");
      scheduleExcelIfNeeded(jobId);
    })
    .catch((error) => {
      markImageFailed(jobId, task.id, error?.message ?? "Processing failed");
      scheduleExcelIfNeeded(jobId);
    });
};

const queueFilesForJob = (jobId, files, systemPrompt) => {
  const { job, tasks, rejected } = appendImagesToJob(jobId, files);

  tasks.forEach((task) => dispatchTask(job.id, task, systemPrompt));

  return {
    jobId: job.id,
    accepted: tasks.length,
    rejected,
    status: serializeJob(getJob(job.id)),
  };
};

export const upsertJobWithFiles = ({ jobId, files, systemPrompt }) => {
  let job = jobId ? getJob(jobId) : createJob();

  if (jobId && !job) {
    const error = new Error("Job not found");
    error.status = 404;
    throw error;
  }

  if (!job) {
    job = createJob();
  }

  return queueFilesForJob(job.id, files, systemPrompt);
};

export const getJobSummary = (jobId) => {
  const job = getJob(jobId);
  return serializeJob(job);
};

