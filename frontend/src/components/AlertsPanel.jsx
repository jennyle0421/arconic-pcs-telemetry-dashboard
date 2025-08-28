import React, { useEffect, useState } from "react";
import { socket } from "../api/socket";

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const onAlerts = (payload) => setAlerts(payload.alerts || []);
    socket.on("alerts", onAlerts);
    return () => socket.off("alerts", onAlerts);
  }, []);

  return (
    <div className="card">
      <div className="card-title">Active Alerts</div>
      {alerts.length === 0 ? (
        <div>No active alerts.</div>
      ) : (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {alerts.map((a, i) => (
            <li key={i} className={`alert ${a.severity}`} style={{ listStyle: "none" }}>
              {a.msg}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
