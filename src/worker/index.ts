import { sql } from "@/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { retryBackoffMs } from "@/server/jobs/backoff";
import { claimJobs, completeJob, failJob, recoverStaleJobs } from "@/server/jobs/queue";
import { handleJob } from "./handlers";

let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

logger.info("worker started", { worker_id: env.WORKER_ID, concurrency: env.WORKER_CONCURRENCY });

while (!stopping) {
  await recoverStaleJobs();
  const jobs = await claimJobs(env.WORKER_CONCURRENCY);
  if (jobs.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, env.JOB_POLL_INTERVAL_MS));
    continue;
  }
  await Promise.all(jobs.map(async (job) => {
    try {
      await handleJob(job.type, job.payload);
      await completeJob(job.id);
    } catch (error) {
      logger.error("job failed", { job_id: job.id, type: job.type, error: error instanceof Error ? error.message : String(error) });
      await failJob(job.id, error, new Date(Date.now() + retryBackoffMs(job.attempts)));
    }
  }));
}

logger.info("worker stopping", { worker_id: env.WORKER_ID });
await sql.end();
