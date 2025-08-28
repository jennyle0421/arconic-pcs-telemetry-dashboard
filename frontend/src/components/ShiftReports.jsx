import React, { useEffect, useState } from "react";
import { getShiftReport, getShiftReportCSVUrl } from "../api";

export default function ShiftReports() {
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0,10));
  const [rows, setRows] = useState([]);

  async function load() {
    const r = await getShiftReport(dateStr);
    setRows(r.rows || []);
  }
  useEffect(() => { load(); }, [dateStr]);

  return (
    <div className="card">
      <div className="card-title">Shift Report — {dateStr}</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} />
        <a className="btn" href={getShiftReportCSVUrl(dateStr)}>Download CSV</a>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Shift</th><th>Samples</th>
            <th>Avg Temp (°F)</th><th>Avg Vib (mm/s)</th>
            <th>Avg Thru (units/hr)</th><th>Avg Defects (%)</th>
            <th>Min Temp</th><th>Max Temp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td>{r.shift}</td>
              <td>{r.samples}</td>
              <td>{r.avg_temperature}</td>
              <td>{r.avg_vibration}</td>
              <td>{r.avg_throughput}</td>
              <td>{r.avg_defects}</td>
              <td>{r.min_temperature}</td>
              <td>{r.max_temperature}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="8">No data for this date.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
