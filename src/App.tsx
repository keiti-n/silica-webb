import React, { useEffect, useRef, useState } from "react";
import { requestAndConnect, writeCommand, disconnect } from "./bluetooth";

type Status = "idle" | "requesting" | "connected" | "receiving" | "disconnected" | "failed";

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [moisture, setMoisture] = useState<string>("--");
  const [temperature, setTemperature] = useState<string>("--");
  const [lastTs, setLastTs] = useState<number | null>(null);
  const [nextInSec, setNextInSec] = useState<number>(0);
  const [isRealtime, setIsRealtime] = useState(false);

  const reconnectRef = useRef(false);

  // request Notification permission on user gesture
  async function ensureNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {}
    }
  }

  useEffect(() => {
    let t: any;
    // update countdown and last-updated every second
    t = setInterval(() => {
      if (lastTs) {
        const elapsed = Math.floor((Date.now() - lastTs) / 1000);
        // normal interval is 300 seconds, if realtime then show small value
        const interval = isRealtime ? 1 : 300;
        const next = Math.max(0, interval - elapsed);
        setNextInSec(next);
      } else {
        setNextInSec(0);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lastTs, isRealtime]);

  function notifyIfWet(moistureVal: string) {
    if (moistureVal.toLowerCase() === "wet") {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Silica sensor: WET", { body: "Moisture detected!" });
      } else {
        // fallback: alert if focused
        if (document.visibilityState === "visible") alert("Silica sensor: WET");
      }
    }
  }

  async function handleConnect() {
    setStatus("requesting");
    await ensureNotificationPermission();
    try {
      const res = await requestAndConnect(({ moisture: mo, temperature: te, raw }) => {
        setMoisture(mo);
        setTemperature(te);
        setLastTs(Date.now());
        setStatus("receiving");
        notifyIfWet(mo);
      });
      setStatus("connected");
      // attach disconnect handler
      res.device.addEventListener("gattserverdisconnected", () => {
        setStatus("disconnected");
      });
    } catch (err: any) {
      console.error(err);
      setStatus("failed");
    }
  }

  async function handleDisconnect() {
    await disconnect();
    setStatus("disconnected");
    setIsRealtime(false);
  }

  // toggle realtime mode: send commands to device
  async function toggleRealtime() {
    try {
      if (!isRealtime) {
        await writeCommand("REALTIME_ON");
        setIsRealtime(true);
      } else {
        await writeCommand("REALTIME_OFF");
        setIsRealtime(false);
      }
    } catch (err) {
      console.error("write failed", err);
    }
  }

  // quick helpers to format time display
  function fmtElapsed() {
    if (!lastTs) return "--";
    const s = Math.floor((Date.now() - lastTs) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s ago`;
  }

  function fmtCountdown() {
    if (isRealtime) return "Realtime";
    const s = nextInSec;
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${ss.toString().padStart(2, "0")}`;
  }

  return (
    <div className="container">
      <h1>Silica Sensor</h1>

      <div className="controls">
        <button onClick={handleConnect} disabled={status === "requesting" || status === "connected" || status === "receiving"}>
          Connect
        </button>
        <button onClick={handleDisconnect} disabled={status !== "connected" && status !== "receiving"}>
          Disconnect
        </button>
        <button onClick={toggleRealtime} disabled={status !== "connected" && status !== "receiving"}>
          {isRealtime ? "Stop Realtime" : "Realtime"}
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Status:</strong> {status}
      </div>

      <div className="readings" style={{ marginTop: 12 }}>
        <div className="card" onClick={toggleRealtime} role="button" title="Click to toggle realtime">
          <h3>Moisture</h3>
          <p className="value">{moisture}</p>
          <small>Click to toggle realtime updates</small>
        </div>

        <div className="card" onClick={toggleRealtime} role="button" title="Click to toggle realtime">
          <h3>Temperature</h3>
          <p className="value">{temperature}</p>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div>Last updated: {fmtElapsed()}</div>
        <div>Next update in: {fmtCountdown()}</div>
      </div>

      <footer style={{ marginTop: 18 }}>
        <small>Leave the tab open to receive background notifications. For most reliable experience, use Chrome on Android.</small>
      </footer>
    </div>
  );
}
