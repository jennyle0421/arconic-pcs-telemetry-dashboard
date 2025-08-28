// frontend/src/components/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { socket } from "../api/socket";
import { getHistory } from "../api";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Rolling-mill friendly limits (tweak as you like)
const LIMITS = {
  temperature: { warn: 700, crit: 750 },        // °F (work-roll)
  vibration:   { warn: 1.8, crit: 2.5 },        // mm/s (bearing)
  throughput:  { warnLow: 260, critLow: 220 },  // units/hr (low is bad)
  defects:     { warn: 2.0, crit: 3.0 }         // % surface defects
};

export default function Dashboard({ onStatus }) {
  const [points, setPoints] = useState([]);
  const [histLen, setHistLen] = useState(150); // ≈ 5 min @ 2s/sample

  useEffect(() => {
    let alive = true;
    (async () => {
      const hist = await getHistory(histLen);
      if (alive) setPoints(hist);
    })();
    const onPoint = (p) => setPoints(prev => [...prev.slice(-histLen + 1), p]);
    socket.on("telemetry", onPoint);
    return () => { alive = false; socket.off("telemetry", onPoint); };
  }, [histLen]);

  const last = points.at(-1);
  const labels = useMemo(() => points.map(p => new Date(p.ts).toLocaleTimeString()), [points]);

  // status helpers
  const statusTemp = statusHi(last?.temperature, LIMITS.temperature);
  const statusVib  = statusHi(last?.vibration,   LIMITS.vibration);
  const statusDef  = statusHi(last?.defects,     LIMITS.defects);
  const statusThru = statusLo(last?.throughput,  LIMITS.throughput);

  // send a roll-up to parent (for Insights)
  useEffect(() => {
    onStatus?.({
      last, limits: LIMITS,
      statuses: { temperature: statusTemp, vibration: statusVib, throughput: statusThru, defects: statusDef }
    });
  }, [last, statusTemp, statusVib, statusThru, statusDef, onStatus]);

  // tiny deltas vs recent avg (last 60 samples)
  const delta = (key) => {
    if (!points.length) return null;
    const recent = points.slice(-60);
    const avg = recent.reduce((s,p)=>s+p[key],0)/recent.length;
    return last ? +(last[key] - avg).toFixed(2) : null;
  };

  const dataset = (key, label) => ({
    label, data: points.map(p => p[key]), borderWidth: 2, pointRadius: 2, tension: 0.35, fill: false
  });

  // “threshold lines” as flat datasets (no extra plugins needed)
  const flat = (val) => Array(points.length).fill(val);
  const line = (arr, label) => ({
    label, data: arr, borderWidth: 1, pointRadius: 0, borderDash: [6,6]
  });

  const opts = { responsive: true, maintainAspectRatio: false, plugins:{ legend:{ display:true } }, scales:{ x:{ ticks:{ maxTicksLimit: 8 }}} };

  return (
    <div className="card">
      <div className="card-title">PCS Web Dashboard — Rolling Mill RM-01</div>

      {/* KPIs with badges + deltas */}
      <div className="grid">
        <KPI title="Work-Roll Temperature (°F)" value={last?.temperature} delta={delta("temperature")} badge={statusTemp} />
        <KPI title="Bearing Vibration (mm/s)"   value={last?.vibration}   delta={delta("vibration")}   badge={statusVib} />
        <KPI title="Line Throughput (units/hr)" value={last?.throughput}  delta={delta("throughput")}  badge={statusThru} />
        <KPI title="Surface Defects (%)"        value={last?.defects}     delta={delta("defects")}     badge={statusDef} />
      </div>

      {/* Time range chips */}
      <div style={{ display:"flex", gap:8, margin:"8px 0 0" }}>
        <Chip active={histLen===150} onClick={()=>setHistLen(150)}>Last 5 min</Chip>
        <Chip active={histLen===450} onClick={()=>setHistLen(450)}>Last 15 min</Chip>
        <Chip active={histLen===900} onClick={()=>setHistLen(900)}>Last 30 min</Chip>
      </div>

      {/* Trends with threshold lines */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:16 }}>
        <ChartCard title="RM-01 — Work-Roll Temperature Trend">
          <Line
            data={{
              labels,
              datasets: [
                dataset("temperature","Temperature"),
                line(flat(LIMITS.temperature.warn), "Warn"),
                line(flat(LIMITS.temperature.crit), "Critical"),
              ]
            }}
            options={opts}
          />
        </ChartCard>

        <ChartCard title="RM-01 — Bearing Vibration Trend">
          <Line
            data={{
              labels,
              datasets: [
                dataset("vibration","Vibration"),
                line(flat(LIMITS.vibration.warn), "Warn"),
                line(flat(LIMITS.vibration.crit), "Critical"),
              ]
            }}
            options={opts}
          />
        </ChartCard>

        <ChartCard title="RM-01 — Line Throughput Trend">
          <Line
            data={{
              labels,
              datasets: [
                dataset("throughput","Throughput"),
                line(flat(LIMITS.throughput.warnLow), "Warn (low)"),
                line(flat(LIMITS.throughput.critLow), "Critical (low)"),
              ]
            }}
            options={opts}
          />
        </ChartCard>

        <ChartCard title="RM-01 — Surface Defects Trend">
          <Line
            data={{
              labels,
              datasets: [
                dataset("defects","Defects"),
                line(flat(LIMITS.defects.warn), "Warn"),
                line(flat(LIMITS.defects.crit), "Critical"),
              ]
            }}
            options={opts}
          />
        </ChartCard>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */
function statusHi(val, { warn, crit }) {
  if (val == null) return "unknown";
  if (val >= crit) return "critical";
  if (val >= warn) return "watch";
  return "ok";
}
function statusLo(val, { warnLow, critLow }) {
  if (val == null) return "unknown";
  if (val <= critLow) return "critical";
  if (val <= warnLow) return "watch";
  return "ok";
}

function KPI({ title, value, delta, badge }) {
  const text = value == null ? "—" : Number(value).toLocaleString(undefined,{ maximumFractionDigits: 2 });
  const d = delta==null ? "" : (delta>=0? `+${delta}` : `${delta}`);
  const badgeStyle = {
    ok:{ background:"#DCFCE7", border:"1px solid #e5e7eb" },
    watch:{ background:"#FEF9C3", border:"1px solid #e5e7eb" },
    critical:{ background:"#FEE2E2", border:"1px solid #e5e7eb" },
    unknown:{ background:"#e5e7eb" }
  }[badge || "unknown"];

  return (
    <div className="kpi">
      <div className="kpi-title" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
        <span>{title}</span>
        <span style={{ padding:"2px 8px", borderRadius:999, fontSize:12, ...badgeStyle }}>{badge || "unknown"}</span>
      </div>
      <div className="kpi-value">{text}</div>
      {d && <div style={{ fontSize:12, color:"#64748b" }}>vs recent avg: {d}</div>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="card" style={{ height: 260 }}>
      <div className="card-title">{title}</div>
      <div style={{ height: 200 }}>{children}</div>
    </div>
  );
}
function Chip({ active, children, onClick }) {
  return (
    <button
      className="btn"
      onClick={onClick}
      style={{
        padding:"6px 10px",
        background: active ? "#0B72B9" : "#e9f3fa",
        color: active ? "#fff" : "#0B72B9"
      }}>
      {children}
    </button>
  );
}
