#!/usr/bin/env node
/**
 * SiteIntel Pulse — Production Database Restoration Utility
 * 
 * Safely restores a verified SQLite backup snapshot to the active database location,
 * cleaning up stale WAL/SHM artifacts and verifying schema integrity.
 * 
 * Usage:
 *   node scripts/restore-database.mjs <backup_file_path> [target_database_path]
 */

import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

function resolvePaths() {
  const backupPath = process.argv[2] || process.env.BACKUP_PATH;
  if (!backupPath) {
    throw new Error("Usage: node scripts/restore-database.mjs <backup_file_path> [target_database_path]");
  }

  const targetPath =
    process.argv[3] ||
    process.env.DATABASE_PATH ||
    (process.env.DATABASE_URL?.replace(/^(sqlite|file):\/\//, "")) ||
    path.resolve(process.cwd(), "data", "siteintel.db");

  return {
    backupPath: path.resolve(process.cwd(), backupPath),
    targetPath: path.resolve(process.cwd(), targetPath),
  };
}

export function performRestore(backupPath, targetPath) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file does not exist: ${backupPath}`);
  }

  const resolvedBackup = path.resolve(backupPath);
  const resolvedTarget = path.resolve(targetPath);
  if (resolvedBackup === resolvedTarget) {
    throw new Error(`Invalid restore operation: Source backup and destination database path are identical (${backupPath}).`);
  }

  console.log(`[Restore] Verifying backup snapshot integrity: ${backupPath}`);
  const verifyDb = new DatabaseSync(backupPath, { readOnly: true });
  let tableCount = 0;
  try {
    const check = verifyDb.prepare("PRAGMA quick_check;").get();
    if (!check || check.quick_check !== "ok") {
      throw new Error(`Backup integrity validation failed: ${JSON.stringify(check)}`);
    }

    const tables = verifyDb.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();
    tableCount = tables.length;
    console.log(`[Restore] Snapshot verified ok (${tableCount} tables present).`);
  } finally {
    verifyDb.close();
  }

  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Remove existing WAL/SHM files to prevent WAL corruption or mismatch
  const walPath = `${targetPath}-wal`;
  const shmPath = `${targetPath}-shm`;
  if (fs.existsSync(walPath)) {
    console.log(`[Restore] Removing stale target WAL file: ${walPath}`);
    fs.unlinkSync(walPath);
  }
  if (fs.existsSync(shmPath)) {
    console.log(`[Restore] Removing stale target SHM file: ${shmPath}`);
    fs.unlinkSync(shmPath);
  }

  console.log(`[Restore] Copying verified backup to target: ${targetPath}`);
  fs.copyFileSync(backupPath, targetPath);

  // Validate the newly restored database
  const targetDb = new DatabaseSync(targetPath);
  try {
    targetDb.exec("PRAGMA busy_timeout = 5000;");
    targetDb.exec("PRAGMA foreign_keys = ON;");
    targetDb.exec("PRAGMA journal_mode = WAL;");

    const check = targetDb.prepare("PRAGMA quick_check;").get();
    if (!check || check.quick_check !== "ok") {
      throw new Error(`Restored database check failed: ${JSON.stringify(check)}`);
    }

    const tables = targetDb.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();
    console.log(`[Restore] Restored database is healthy and ready (${tables.length} tables confirmed).`);
  } finally {
    targetDb.close();
  }

  return { targetPath, tablesCount: tableCount };
}

// Run standalone if executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(decodeURI(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1"))) {
  try {
    const { backupPath, targetPath } = resolvePaths();
    performRestore(backupPath, targetPath);
    console.log(`[Restore] Database restoration successfully completed.`);
    process.exit(0);
  } catch (err) {
    console.error(`[Restore Error]:`, err.message);
    process.exit(1);
  }
}
