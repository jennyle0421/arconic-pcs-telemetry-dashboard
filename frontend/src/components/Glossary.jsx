// frontend/src/components/Glossary.jsx
import React from "react";
export default function Glossary(){
  return (
    <div className="card">
      <div className="card-title">Glossary (Rolling Mill)</div>
      <ul style={{ margin:0, paddingLeft:18 }}>
        <li><b>Work-roll temperature</b> — heat at the rolling surface (too high → quality risk).</li>
        <li><b>Bearing vibration</b> — shaking at roll bearings (high → wear/misalignment).</li>
        <li><b>Throughput</b> — output rate of the line (low → bottleneck).</li>
        <li><b>Surface defects</b> — % of sheets with marks/scratches.</li>
      </ul>
    </div>
  );
}
