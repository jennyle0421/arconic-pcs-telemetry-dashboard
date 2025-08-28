import React, { useEffect, useState } from "react";
// Optional: drop a logo at src/assets/logo.png and uncomment the import below
// import logo from "../assets/logo.png";

export default function WelcomeModal({ open, onClose, onShowArchitecture }) {
  const [dontShow, setDontShow] = useState(true);

  if (!open) return null;

  const close = () => {
    if (dontShow) localStorage.setItem("pcs_welcome_dismissed", "1");
    onClose();
  };

  return (
    <div
      onClick={close}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,.55)",
        display: "grid", placeItems: "center", zIndex: 60
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(760px, 94vw)", padding: 18 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* {logo && <img src={logo} alt="logo" style={{ width: 36, height: 36 }} />} */}
          <h2 style={{ margin: 0 }}>Welcome to the Rolling Mill PCS Dashboard</h2>
        </div>
        <p style={{ marginTop: 8, color: "#64748b" }}>
          This demo simulates a Process Control System used at aluminum <b>rolling mills</b>.
          It shows <b>work-roll temperature</b>, <b>bearing vibration</b>, <b>line throughput</b>, and
          <b> surface defects</b> in real time, with alerts and shift summaries.
        </p>

        <ul style={{ marginTop: 8, marginBottom: 10, paddingLeft: 18 }}>
          <li><b>Left:</b> live KPIs & trends (updated ~every 2s).</li>
          <li><b>Right:</b> alerts, defect log, and quick actions.</li>
          <li><b>Shift report:</b> aggregates today’s production by shift, with CSV export.</li>
        </ul>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={close}>Start monitoring</button>
          <button
            className="btn"
            style={{ background: "#e9f3fa", color: "#0B72B9" }}
            onClick={() => { onClose(); onShowArchitecture?.(); }}
          >
            System overview (architecture)
          </button>
          <a
            className="btn"
            style={{ background: "#e9f3fa", color: "#0B72B9" }}
            href="https://github.com/jennyle0421/arconic-pcs-telemetry-dashboard"
            target="_blank" rel="noreferrer"
          >
            Readme
          </a>
        </div>

        <label style={{ marginTop: 12, display: "inline-flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
          Don’t show this again
        </label>

        <p style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          All data is <b>simulated</b> for demonstration; no proprietary Arconic data is used.
        </p>
      </div>
    </div>
  );
}
