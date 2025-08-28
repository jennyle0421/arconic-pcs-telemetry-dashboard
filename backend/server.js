import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { db, initSchema, qAll, qRun } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: "*" } });

// initialize tables/indexes
initSchema();

// ---- sample generator (simulated PLC feed) ----
function genSample() {
  const ts = new Date().toISOString();
  const temperature = +(400 + Math.random() * 400).toFixed(2); // °F
  const vibration   = +(0.1 + Math.random() * 2.9).toFixed(2); // mm/s
  const throughput  = Math.floor(200 + Math.random() * 300);   // units/hr
  const defects     = +(Math.random() * 3.5).toFixed(2);       // %
  return { ts, temperature, vibration, throughput, defects };
}

setInterval(async () => {
  const s = genSample();
  await qRun(
    `INSERT INTO telemetry(ts,temperature,vibration,throughput,defects)
     VALUES (?,?,?,?,?)`,
    [s.ts, s.temperature, s.vibration, s.throughput, s.defects]
  );
  io.emit("telemetry", s);

  const alerts = [];
  if (s.temperature > 750) alerts.push({ severity: "high", msg: "Overheating furnace" });
  if (s.vibration > 2.0)  alerts.push({ severity: "high", msg: "Bearing vibration high" });
  if (s.throughput < 240) alerts.push({ severity: "med",  msg: "Throughput below target" });
  if (s.defects > 2.5)    alerts.push({ severity: "med",  msg: "Surface defects elevated" });
  if (alerts.length) io.emit("alerts", { ts: s.ts, alerts });
}, 2000);

// ---- history endpoint (for initial page load) ----
app.get("/api/history", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 300), 2000);
    const rows = await qAll(
      `SELECT ts,temperature,vibration,throughput,defects
       FROM telemetry ORDER BY id DESC LIMIT ?`,
      [limit]
    );
    res.json(rows.reverse());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- defects API (create/list/flag) ----
app.post("/api/defects", async (req, res) => {
  const { batch_id, machine, defect_type, rate, flagged } = req.body || {};
  if (!batch_id || !machine || !defect_type || rate == null)
    return res.status(400).json({ error: "batch_id, machine, defect_type, rate required" });
  try {
    const ts = new Date().toISOString();
    const r = await qRun(
      `INSERT INTO defects(ts,batch_id,machine,defect_type,rate,flagged)
       VALUES(?,?,?,?,?,?)`,
      [ts, batch_id, machine, defect_type, Number(rate), flagged ? 1 : 0]
    );
    res.json({ id: r.lastID, ts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/defects", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 1000);
    const only = req.query.flagged === "1";
    const rows = await qAll(
      `SELECT id,ts,batch_id,machine,defect_type,rate,flagged
       FROM defects ${only ? "WHERE flagged=1" : ""}
       ORDER BY id DESC LIMIT ?`, [limit]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/defects/:id/flag", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const val = req.body?.flagged ? 1 : 0;
    const r = await qRun(`UPDATE defects SET flagged=? WHERE id=?`, [val, id]);
    res.json({ updated: r.changes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- shift report ----
app.get("/api/reports/shift", async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().slice(0,10);
  const sql = `
    SELECT 
      CASE
        WHEN CAST(strftime('%H', ts) AS INTEGER) BETWEEN 6 AND 13 THEN 'Shift A (06-14)'
        WHEN CAST(strftime('%H', ts) AS INTEGER) BETWEEN 14 AND 21 THEN 'Shift B (14-22)'
        ELSE 'Shift C (22-06)'
      END AS shift,
      COUNT(*) AS samples,
      ROUND(AVG(temperature),2) AS avg_temperature,
      ROUND(AVG(vibration),2)   AS avg_vibration,
      ROUND(AVG(throughput),0)  AS avg_throughput,
      ROUND(AVG(defects),2)     AS avg_defects,
      ROUND(MIN(temperature),2) AS min_temperature,
      ROUND(MAX(temperature),2) AS max_temperature
    FROM telemetry
    WHERE date(ts) = date(?)
    GROUP BY shift
  `;
  try {
    const rows = await qAll(sql, [dateStr]);
    const order = { "Shift A (06-14)":1, "Shift B (14-22)":2, "Shift C (22-06)":3 };
    rows.sort((a,b)=>order[a.shift]-order[b.shift]);

    if (req.query.format === "csv") {
      const headers = Object.keys(rows[0] || {shift:"",samples:""});
      const csv = [headers.join(",")]
        .concat(rows.map(r => headers.map(h => r[h]).join(",")))
        .join("\n");
      res.setHeader("Content-Type","text/csv");
      res.setHeader("Content-Disposition",`attachment; filename="shift_${dateStr}.csv"`);
      return res.send(csv);
    }
    res.json({ date: dateStr, rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`API + WS + SQLite on :${PORT}`));
