import React from "react";
import arch from "../assets/ArconicPCS.png";

export default function ArchitectureModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,.55)",
      display: "grid", placeItems: "center", zIndex: 50
    }} onClick={onClose}>
      <div className="card" style={{ width: "min(1100px, 96vw)", maxHeight: "90vh", overflow: "auto" }}
           onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <strong>System Overview — Architecture</strong>
          <button className="btn" style={{ padding: "4px 8px" }} onClick={onClose}>Close</button>
        </div>
        <div style={{ marginTop: 10 }}>
          <img src={arch} alt="Arconic PCS Architecture" style={{ width: "100%", height: "auto", borderRadius: 8, border: "1px solid #e5e7eb" }} />
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>
          Sensors (OT) → Mock API (DMZ) → DB + Dashboard (IT). This UI is the dashboard; the backend simulates the OT/DMZ layers.
        </p>
      </div>
    </div>
  );
}
