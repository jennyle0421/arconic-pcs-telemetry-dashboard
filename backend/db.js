import sqlite3 from "sqlite3";

const DB_PATH = process.env.DB_PATH || "./telemetry.db";
sqlite3.verbose();
export const db = new sqlite3.Database(DB_PATH);

// run at startup
export function initSchema() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS telemetry(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        temperature REAL NOT NULL,
        vibration REAL NOT NULL,
        throughput INTEGER NOT NULL,
        defects REAL NOT NULL
      );
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry(ts);`);

    db.run(`
      CREATE TABLE IF NOT EXISTS defects(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        machine TEXT NOT NULL,
        defect_type TEXT NOT NULL,
        rate REAL NOT NULL,
        flagged INTEGER NOT NULL DEFAULT 0
      );
    `);
  });
}

// helper Promises (nice to have)
export const qAll = (sql, params=[]) =>
  new Promise((res, rej) => db.all(sql, params, (e, r) => e ? rej(e) : res(r)));
export const qRun = (sql, params=[]) =>
  new Promise((res, rej) => db.run(sql, params, function(e){ e?rej(e):res(this); }));
