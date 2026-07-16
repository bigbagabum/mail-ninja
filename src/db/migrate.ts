import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, sql } from "@/db";
import { logger } from "@/lib/logger";

await migrate(db, { migrationsFolder: "drizzle" });
logger.info("database migrations applied");
await sql.end();
