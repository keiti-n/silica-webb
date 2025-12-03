import React, { useEffect, useRef, useState } from "react";
import { requestAndConnect, writeCommand, disconnect } from "./bluetooth";

type Reading = { ts: number; moisture: string; temperature: number | null };

export default function App() {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("idle");
  const [unitC, setUnitC] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);
  const [lastTs, setLastTs] = useState<number | null>(null);

  const readingsRef = useRef<Reading[]>([]);
  const [, tick] = useState(0);

  // Countdown timer (optional)
  const [nextInSec, setNextInSec] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  function parseMessage(msg: string): Reading {
    // Accept either "MOISTURE:Wet;TEMP:24.3" or "Wet,24.3"
    let moisture = "--";
    let temp: number | null = null;

    if (msg.includes("MOISTURE")) {
      const m = msg.match(/MOISTURE:([A-Za-z]+);TEMP:([0-9.-]+)/);
      if (m) {
        moisture = m[1];
        temp = parseFloat(m[2]);
      }
    } else if (msg.includes(",")) {
      const parts = msg.split(",");
      moisture = parts[0];
      temp = parseFloat(parts[1]);
    }

    return { ts: Date.now(), moisture, temperature: temp };
  }

  function addReading(msg: string) {
    const reading = parseMessage(msg);
    const arr = readingsRef.current;
    arr.push(reading);
    if (arr.length > 60) arr.shift();
    readingsRef.current = arr;
    setLastTs(reading.ts);
  }

  async function handleConnect() {
    setStatus("requesting");
    try {
      const res = await requestAndConnect((msg: string) => {
        addReading(msg);
        setStatus("receiving");
        setConnected(true);
      });
      res.device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setStatus("disconnected");
      });
      setStatus("connected");
      setConnected(true);
    } catch {
      setStatus("failed");
      setConnected(false);
    }
  }

  async function handleDisconnect() {
    await disconnect();
    setConnected(false);
    setStatus("disconnected");
    setIsRealtime(false);
  }

  async function toggleRealtime() {
    if (!connected) return;
    if (!isRealtime) {
      await writeCommand("REALTIME_ON");
      setIsRealtime(true);
      setStatus("receiving");
    } else {
      await writeCommand("REALTIME_OFF");
      setIsRealtime(false);
      setStatus("connected");
    }
  }

  const latest = readingsRef.current.length ? readingsRef.current[readingsRef.current.length - 1] : null;
  const tempDisplay = latest?.temperature != null ? (unitC ? latest.temperature.toFixed(1) + "°C" : (latest.temperature * 9 / 5 + 32).toFixed(1) + "°F") : "--";
  const moistureDisplay = latest?.moisture ?? "--";

  return (
    <div className="page">
      <header className="topbar">
        <div className="title">Silica Monitor</div>
        <div className="top-controls">
          <button onClick={() => setUnitC(c => !c)}>{unitC ? "°C" : "°F"}</button>
        </div>
      </header>

      <main className="grid">
        <section className="card big" onClick={toggleRealtime}>
          <div className="card-title">Moisture</div>
          <div className="reading" style={{
            color: moistureDisplay.toLowerCase() === "dry" ? "#FF8A3D" : moistureDisplay.toLowerCase() === "mixed" ? "#C6F16B" : "#37D6B8"
          }}>
            {moistureDisplay}
          </div>
        </section>

        <section className="card">
          <div className="card-title">Temperature</div>
          <div className="reading">{tempDisplay}</div>
        </section>

        <section className="actions card">
          <button onClick={handleConnect} disabled={connected}>Connect</button>
          <button onClick={handleDisconnect} disabled={!connected}>Disconnect</button>
          <button onClick={toggleRealtime} disabled={!connected}>{isRealtime ? "Stop Realtime" : "Realtime"}</button>
          <div>Status: <strong>{status}</strong></div>
        </section>
      </main>
    </div>
  );
}
