import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function StatusChip() {
  const [api, setApi] = useState("checking");
  const [ws, setWs] = useState("checking");

  useEffect(() => {
    // API check
    fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"}/api/history?limit=1`)
      .then(() => setApi("ok"))
      .catch(() => setApi("down"));

    // WS check
    const socket = io(import.meta.env.VITE_WS_URL || "http://localhost:4000", { transports: ["websocket"] });
    socket.on("connect", () => setWs("ok"));
    socket.on("connect_error", () => setWs("down"));
    return () => socket.close();
  }, []);

  const pill = (label, state) => (
    <span style={{
      padding: "3px 8px", borderRadius: 999, fontSize: 12, marginLeft: 8,
      background: state==="ok" ? "#DCFCE7" : state==="checking" ? "#FEF9C3" : "#FEE2E2",
      border: "1px solid #e5e7eb"
    }}>{label}: {state}</span>
  );

  return <div>{pill("API", api)}{pill("WS", ws)}</div>;
}
