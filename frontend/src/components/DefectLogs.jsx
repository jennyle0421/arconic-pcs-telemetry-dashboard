import React, { useEffect, useState } from "react";
import { listDefects, createDefect, setDefectFlag } from "../api";

export default function DefectLogs() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ batch_id: "", machine: "RM-01", defect_type: "Surface Scratch", rate: 0 });

  async function load(all = true) {
    const data = await listDefects({ limit: 100, flagged: all ? undefined : 1 });
    setRows(data);
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    await createDefect({ ...form, rate: Number(form.rate), flagged: Number(form.rate) >= 2.5 });
    setForm({ batch_id: "", machine: "RM-01", defect_type: "Surface Scratch", rate: 0 });
    load();
  }

  async function toggleFlag(id, val) {
    await setDefectFlag(id, val);
    load();
  }

  function exportCSV() {
    const headers = ["ts","batch_id","machine","defect_type","rate","flagged"];
    const lines = [headers.join(",")].concat(rows.map(r => headers.map(h => r[h]).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "defects.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card">
      <div className="card-title">Defect Logs</div>

      <form onSubmit={submit} className="grid" style={{ gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
        <input required placeholder="Batch ID" value={form.batch_id}
               onChange={e => setForm({ ...form, batch_id: e.target.value })} />
        <select value={form.machine} onChange={e => setForm({ ...form, machine: e.target.value })}>
          <option>RM-01</option><option>RM-02</option>
        </select>
        <select value={form.defect_type} onChange={e => setForm({ ...form, defect_type: e.target.value })}>
          <option>Surface Scratch</option><option>Thickness Error</option><option>Edge Crack</option>
        </select>
        <input type="number" step="0.01" placeholder="Rate %"
               value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} />
        <button className="btn" type="submit">Add</button>
      </form>

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button className="btn" onClick={exportCSV}>Export CSV</button>
        <button className="btn" onClick={() => load(false)}>Show Flagged</button>
        <button className="btn" onClick={() => load(true)}>Show All</button>
      </div>

      <table className="table" style={{ marginTop: 10 }}>
        <thead>
          <tr><th>Time</th><th>Batch</th><th>Machine</th><th>Type</th><th>Rate %</th><th>Flagged</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{new Date(r.ts).toLocaleString()}</td>
              <td>{r.batch_id}</td>
              <td>{r.machine}</td>
              <td>{r.defect_type}</td>
              <td>{r.rate}</td>
              <td>{r.flagged ? "✅" : "—"}</td>
              <td>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={!!r.flagged} onChange={e => toggleFlag(r.id, e.target.checked)} />
                  Flag
                </label>
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="7">No defects logged yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
