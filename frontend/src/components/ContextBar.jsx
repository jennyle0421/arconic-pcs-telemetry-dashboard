import React from "react";

export default function ContextBar() {
  const Chip = ({ label, value }) => (
    <span style={{
      display: "inline-flex", gap: 6, alignItems: "center",
      padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 999,
      background: "#fff", fontSize: 13
    }}>
      <strong style={{ opacity: .7 }}>{label}:</strong> {value}
    </span>
  );

  return (
    <div style={{
      display: "flex", gap: 8, flexWrap: "wrap",
      margin: "8px 0 4px 0"
    }}>
      <Chip label="Plant" value="Davenport (Demo)" />
      <Chip label="Mill" value="Hot Rolling — RM-01" />
      <Chip label="Line" value="Coil 1000-series (simulated)" />
      <Chip label="Mode" value="Live Sim" />
    </div>
  );
}
