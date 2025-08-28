const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function getHistory(limit = 150) {
  const r = await fetch(`${BASE}/api/history?limit=${limit}`);
  return r.json();
}

export async function listDefects({ limit = 100, flagged } = {}) {
  const q = new URLSearchParams({ limit, ...(flagged ? { flagged: "1" } : {}) });
  const r = await fetch(`${BASE}/api/defects?${q}`);
  return r.json();
}

export async function createDefect(payload) {
  const r = await fetch(`${BASE}/api/defects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return r.json();
}

export async function setDefectFlag(id, flagged) {
  const r = await fetch(`${BASE}/api/defects/${id}/flag`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flagged })
  });
  return r.json();
}

export async function getShiftReport(dateStr) {
  const r = await fetch(`${BASE}/api/reports/shift?date=${dateStr}`);
  return r.json();
}

export function getShiftReportCSVUrl(dateStr) {
  return `${BASE}/api/reports/shift?date=${dateStr}&format=csv`;
}
