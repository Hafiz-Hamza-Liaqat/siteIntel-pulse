#!/usr/bin/env node
/**
 * SiteIntel Pulse — Production Database Backup Utility
 * 
 * Creates an atomic, consistent online snapshot of the SQLite database
 * using VACUUM INTO, even under active WAL concurrent read/write operations.
 * 
 * Usage:
 *   node scripts/backup-database.mjs [destination_path]
 */

import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

function resolvePaths() {
  const sourcePath =
    process.env.DATABASE_PATH ||
    (process.env.DATABASE_URL?.replace(/^(sqlite|file):\/\//, "")) ||
    path.resolve(process.cwd(), "data", "siteintel.db");

  let destPath = process.argv[2] || process.env.BACKUP_PATH;
  if (!destPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.resolve(process.cwd(), "backups");
    destPath = path.join(backupDir, `siteintel-backup-${timestamp}.db`);
  } else {
    destPath = path.resolve(process.cwd(), destPath);
  }

  return { sourcePath, destPath };
}

export function performBackup(sourcePath, destPath) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source database does not exist at: ${sourcePath}`);
  }

  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  if (fs.existsSync(destPath)) {
    // SQLite VACUUM INTO fails if destination file already exists
    fs.unlinkSync(destPath);
  }

  console.log(`[Backup] Opening source database: ${sourcePath}`);
  const db = new DatabaseSync(sourcePath);

  try {
    // Checkpoint any pending WAL transactions if possible
    try {
      db.exec("PRAGMA wal_checkpoint(PASSIVE);");
    } catch (checkpointErr) {
      console.warn(`[Backup] Note: WAL passive checkpoint returned: ${checkpointErr.message}`);
    }

    console.log(`[Backup] Creating atomic snapshot via VACUUM INTO: ${destPath}`);
    // Escape single quotes in path for SQL string literal
    const sanitizedPath = destPath.replace(/'/g, "''");
    db.exec(`VACUUM INTO '${sanitizedPath}';`);
  } finally {
    db.close();
  }

  // Verify backup file integrity
  if (!fs.existsSync(destPath)) {
    throw new Error(`Backup failed: Destination file was not created at ${destPath}`);
  }

  const backupDb = new DatabaseSync(destPath, { readOnly: true });
  try {
    const check = backupDb.prepare("PRAGMA quick_check;").get();
    if (!check || check.quick_check !== "ok") {
      throw new Error(`Backup integrity check failed: ${JSON.stringify(check)}`);
    }
  } finally {
    backupDb.close();
  }

  const stats = fs.statSync(destPath);
  console.log(`[Backup] Successfully verified backup snapshot.`);
  console.log(`[Backup] Destination: ${destPath}`);
  console.log(`[Backup] Size: ${(stats.size / 1024).toFixed(2)} KB (${stats.size} bytes)`);
  return { destPath, size: stats.size };
}

// Run standalone if executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(decodeURI(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1"))) {
  try {
    const { sourcePath, destPath } = resolvePaths();
    performBackup(sourcePath, destPath);
    process.exit(0);
  } catch (err) {
    console.error(`[Backup Error]:`, err.message);
    process.exit(1);
  }
}
