import WorkerPool from "./workerPool.js";
import { jobStore } from "./jobStore.js";
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

const scheduleExcelIfNeeded = async (jobId) => {
  const job = await jobStore.get(jobId);
  if (!job) return;

  const isComplete =
    job.progress.completed + job.progress.failed >= job.progress.total;
  if (!isComplete) return;

  if (job.export.ready || job.export.building) return;

  // Mark as building
  await jobStore.setStatus(jobId, job.status, { "export.building": true });

  try {
    const { buffer, filename } = await buildExcelForJob(job);
    await jobStore.finalize(jobId, { buffer, filename });
  } catch (error) {
    console.error("Excel export error:", error);
    await jobStore.setStatus(jobId, job.status, {
      "export.building": false,
      "export.error": error.message || "Excel export failed",
    });
  }
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
        onStart: () => jobStore.markFileStatus(jobId, task.id, "processing"),
      },
    )
    .then(async (result) => {
      await jobStore.markSuccess(jobId, task.id, {
        description: result.description ?? "",
        colors: result.colors ?? [],
        tokens: result.tokens ?? 0,
        durationMs: result.durationMs ?? 0,
      });
      await scheduleExcelIfNeeded(jobId);
    })
    .catch(async (error) => {
      await jobStore.markFailure(
        jobId,
        task.id,
        error?.message ?? "Processing failed",
      );
      await scheduleExcelIfNeeded(jobId);
    });
};

export const processJobTasks = (job, tasks) => {
  const systemPrompt = process.env.SYSTEM_PROMPT || "";

  tasks.forEach((task) => dispatchTask(job.id, task, systemPrompt));
};

export const getJobSummary = async (jobId) => {
  return await jobStore.summary(jobId);
};
