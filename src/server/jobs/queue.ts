import { and, eq, lte, or, sql as drizzleSql } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { env } from "@/lib/env";

export async function enqueueJob(input: {
  workspaceId: string;
  type: typeof jobs.$inferInsert.type;
  payload: Record<string, unknown>;
  priority?: number;
  maxAttempts?: number;
}) {
  const [job] = await db
    .insert(jobs)
    .values({
      workspaceId: input.workspaceId,
      type: input.type,
      payload: input.payload,
      priority: input.priority ?? 100,
      maxAttempts: input.maxAttempts ?? 5
    })
    .returning();
  return job;
}

export async function claimJobs(limit = env.WORKER_CONCURRENCY) {
  const rows = await db.execute(drizzleSql`
    update jobs
    set status = 'running',
        locked_at = now(),
        locked_by = ${env.WORKER_ID},
        attempts = attempts + 1,
        started_at = coalesce(started_at, now()),
        updated_at = now()
    where id in (
      select id from jobs
      where status in ('pending', 'retrying')
        and run_after <= now()
      order by priority asc, created_at asc
      for update skip locked
      limit ${limit}
    )
    returning *
  `);
  return rows as unknown as (typeof jobs.$inferSelect)[];
}

export async function recoverStaleJobs() {
  const timeout = new Date(Date.now() - env.JOB_LOCK_TIMEOUT_MINUTES * 60 * 1000);
  await db
    .update(jobs)
    .set({ status: "retrying", lockedAt: null, lockedBy: null, runAfter: new Date(), updatedAt: new Date() })
    .where(and(eq(jobs.status, "running"), lte(jobs.lockedAt, timeout)));
}

export async function completeJob(id: string, result: Record<string, unknown> = {}) {
  await db.update(jobs).set({ status: "completed", result, completedAt: new Date(), lockedAt: null, lockedBy: null, updatedAt: new Date() }).where(eq(jobs.id, id));
}

export async function failJob(id: string, error: unknown, runAfter: Date) {
  const message = error instanceof Error ? error.message : String(error);
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, id) });
  const terminal = job ? job.attempts >= job.maxAttempts : false;
  await db
    .update(jobs)
    .set({ status: terminal ? "failed" : "retrying", lastError: message, runAfter, lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(or(eq(jobs.id, id)));
}
