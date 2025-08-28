// frontend/src/components/InsightsPanel.jsx
import React from "react";

export default function InsightsPanel({ snapshot }) {
  if (!snapshot?.last) {
    return <div className="card"><div className="card-title">Insights</div><div>Waiting for data…</div></div>;
  }

  const { last, statuses, limits } = snapshot;
  const items = [];

  // Build human-friendly bullets
  if (statuses.temperature !== "ok") {
    items.push({
      title: `Temperature is ${statuses.temperature}`,
      detail: `Current ${fmt(last.temperature)} °F. Warn ${limits.temperature.warn}, Critical ${limits.temperature.crit}.`,
      action: "Check coolant flow, roll gap, and furnace settings; reduce speed if needed."
    });
  }
  if (statuses.vibration !== "ok") {
    items.push({
      title: `Bearing vibration is ${statuses.vibration}`,
      detail: `Current ${fmt(last.vibration)} mm/s. Warn ${limits.vibration.warn}, Critical ${limits.vibration.crit}.`,
      action: "Inspect bearings & lubrication; check misalignment or roll imbalance."
    });
  }
  if (statuses.throughput !== "ok") {
    items.push({
      title: `Throughput is ${statuses.throughput}`,
      detail: `Current ${fmt(last.throughput)} units/hr. Warn ≤ ${limits.throughput.warnLow}, Critical ≤ ${limits.throughput.critLow}.`,
      action: "Verify upstream coil feed, stand speed, and scheduler targets."
    });
  }
  if (statuses.defects !== "ok") {
    items.push({
      title: `Surface defects are ${statuses.defects}`,
      detail: `Current ${fmt(last.defects)}%. Warn ${limits.defects.warn}, Critical ${limits.defects.crit}.`,
      action: "Run surface inspection; check coolant, work-roll condition, and strip cleanliness."
    });
  }
  if (items.length === 0) {
    items.push({ title: "All metrics nominal", detail: "No thresholds breached in the latest sample.", action: "Continue monitoring." });
  }

  return (
    <div className="card">
      <div className="card-title">Insights — What matters now</div>
      <ul style={{ margin:0, paddingLeft:18 }}>
        {items.map((it, i)=>(
          <li key={i} style={{ marginBottom:8 }}>
            <div style={{ fontWeight:600 }}>{it.title}</div>
            <div style={{ fontSize:13, color:"#64748b" }}>{it.detail}</div>
            <div style={{ fontSize:13, marginTop:2 }}>Recommended: {it.action}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
function fmt(n){ return n==null? "—" : Number(n).toLocaleString(undefined,{ maximumFractionDigits:2 }); }
