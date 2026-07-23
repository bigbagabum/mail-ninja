import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, "drizzle");
const outputPath = path.join(rootDir, "docs", "database-structure.sql");
const checkOnly = process.argv.includes("--check");

function isMigrationFile(fileName: string) {
  return /^\d{4}_.+\.sql$/.test(fileName);
}

async function buildStructureSql() {
  const migrationFiles = (await readdir(migrationsDir))
    .filter(isMigrationFile)
    .sort((a, b) => a.localeCompare(b));

  if (migrationFiles.length === 0) {
    throw new Error("No Drizzle migration SQL files found.");
  }

  const parts = await Promise.all(
    migrationFiles.map(async (fileName) => {
      const content = await readFile(
        path.join(migrationsDir, fileName),
        "utf8",
      );
      return [
        `-- ============================================================`,
        `-- Migration: ${fileName}`,
        `-- ============================================================`,
        content.trim(),
      ].join("\n");
    }),
  );

  const header = [
    `-- Mail Ninja database structure`,
    `-- Generated from Drizzle migrations.`,
    `-- Source directory: drizzle/`,
    `--`,
    `-- Regenerate with: npm run db:structure`,
    `-- Verify freshness with: npm run db:structure:check`,
    `--`,
    `-- This file is intended for creating a fresh PostgreSQL database schema,`,
    `-- for example by pasting it into a SQL editor during manual setup.`,
    ``,
  ].join("\n");

  return [header, ...parts, ""].join("\n\n");
}

const structureSql = await buildStructureSql();

if (checkOnly) {
  const current = await readFile(outputPath, "utf8").catch(() => null);
  if (current !== structureSql) {
    console.error(
      `Database structure file is out of date. Run npm run db:structure.`,
    );
    process.exit(1);
  }
  console.log(`Database structure file is up to date: ${outputPath}`);
} else {
  await writeFile(outputPath, structureSql);
  console.log(`Database structure written: ${outputPath}`);
}
