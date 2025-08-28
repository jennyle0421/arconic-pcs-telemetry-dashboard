// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import AlertsPanel from "./components/AlertsPanel";
import DefectLogs from "./components/DefectLogs";
import ShiftReports from "./components/ShiftReports";
import StatusChip from "./components/StatusChip";
import ArchitectureModal from "./components/ArchitectureModal"; // if you added it
import WelcomeModal from "./components/WelcomeModal";
import "./index.css";

export default function App() {
  const [showArch, setShowArch] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("pcs_welcome_dismissed") === "1";
    setShowWelcome(!dismissed);
  }, []);

  return (
    <div className="wrap">
      <header className="topbar">
        <div className="topbar-row">
          <h1>Arconic PCS Telemetry Dashboard</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusChip />
            <button className="btn" style={{ padding: "6px 10px" }} onClick={() => setShowArch(true)}>
              System Overview
            </button>
            <button className="btn" style={{ padding: "6px 10px" }} onClick={() => setShowWelcome(true)}>
              About
            </button>
          </div>
        </div>
        <p>Real-time monitoring & defect analytics for Rolling Mill RM-01.</p>
      </header>

      <main className="content">
        <section className="left">
          <Dashboard />
          <div style={{ marginTop: 16 }}>
            <ShiftReports />
          </div>
        </section>

        <section className="right">
          <AlertsPanel />
          <div style={{ marginTop: 16 }}>
            <DefectLogs />
          </div>
        </section>
      </main>

      <WelcomeModal
        open={showWelcome}
        onClose={() => setShowWelcome(false)}
        onShowArchitecture={() => setShowArch(true)}
      />
      <ArchitectureModal open={showArch} onClose={() => setShowArch(false)} />
    </div>
  );
}
