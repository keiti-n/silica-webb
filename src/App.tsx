import React, { useEffect, useRef, useState } from "react";
import { requestAndConnect, writeCommand, disconnect } from "./bluetooth";
import { LineChart, MoistureTimeline } from "./components/MiniChart";

// helpers
function clockTime(ts?: number) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString();
}
function toF(c: number) {
  return c * 9 / 5 + 32;
}

type Reading = { ts: number; moisture: string; temperature: number | null };

export default function App() {
  // UI state
  const [theme, setTheme] = useState<"light"|"dark">(() => localStorage.getItem("theme") as any || "light");
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("idle");
  const [unitC, setUnitC] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);
  const [lastTs, setLastTs] = useState<number | null>(null);
  const [nextInSec, setNextInSec] = useState<number>(0);

  const readingsRef = useRef<Reading[]>([]);
  const [, tick] = useState(0); // used to force re-render for timer

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // countdown timer (updates every second)
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      if (!lastTs) {
        setNextInSec(0);
      } else {
        const interval = isRealtime ? 1 : 300;
        const elapsed = Math.floor((now - lastTs) / 1000);
        setNextInSec(Math.max(0, interval - elapsed));
      }
      tick(s => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [lastTs, isRealtime]);

  // Notification permission
  async function ensureNotification() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch {}
    }
  }

  function pushWetNotification() {
    const body = "Your silica packet is fully saturated";
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⚠️ Moisture Detected", { body });
    } else {
      // fallback: small alert if visible
      if (document.visibilityState === "visible") alert("⚠️ Moisture Detected — " + body);
    }
  }

  // Add reading to history (keeps last 60)
  function addReading(moisture: string, tempStr: string) {
    const temp = parseFloat(tempStr);
    const reading: Reading = { ts: Date.now(), moisture, temperature: isNaN(temp) ? null : temp };
    const arr = readingsRef.current;
    arr.push(reading);
    if (arr.length > 120) arr.shift();
    readingsRef.current = arr;
    setLastTs(reading.ts);
    if (moisture.toLowerCase() === "wet") pushWetNotification();
  }

  async function handleConnect() {
    setStatus("requesting");
    await ensureNotification();
    try {
      const res = await requestAndConnect(({ moisture, temperature }) => {
        addReading(moisture, temperature);
        setStatus("receiving");
        setConnected(true);
      });
      res.device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setStatus("disconnected");
      });
      setStatus("connected");
      setConnected(true);
    } catch (err) {
      console.error(err);
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
    try {
      if (!isRealtime) {
        await writeCommand("REALTIME_ON");
        setIsRealtime(true);
        setStatus("receiving");
      } else {
        await writeCommand("REALTIME_OFF");
        setIsRealtime(false);
        setStatus("connected");
      }
    } catch (err) {
      console.error(err);
    }
  }

  // derived UI values
  const latest = readingsRef.current.length ? readingsRef.current[readingsRef.current.length - 1] : null;
  const tempDisplay = latest && latest.temperature != null ? (unitC ? latest.temperature.toFixed(1) + "°C" : toF(latest.temperature).toFixed(1) + "°F") : "--";
  const moistureDisplay = latest ? latest.moisture : "--";

  // chart data
  const tempPoints = readingsRef.current.map((r,i) => ({ t: r.ts, value: r.temperature != null ? r.temperature : (latest?.temperature ?? 0) }));
  const moisturePoints = readingsRef.current.map(r => ({ t: r.ts, state: r.moisture }));

  return (
    <div className="page">
      <header className="topbar">
        <div className="title">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 2C12 2 7 8 7 12a5 5 0 0010 0c0-4-5-10-5-10z" fill="currentColor"/>
          </svg>
          <div>
            <div className="appname">Silica Monitor</div>
            <div className="subtitle">Friendly silica humidity monitor</div>
          </div>
        </div>

        <div className="top-controls">
          <div className={`status-dot ${connected ? "on" : "off"}`}></div>
          <button className="icon-btn" onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
            {theme === "light" ? "🌞" : "🌙"}
          </button>
          <button className="icon-btn" onClick={() => setUnitC(c => !c)} title="Toggle °C/°F">{unitC ? "°C" : "°F"}</button>
        </div>
      </header>

      <main className="grid">
        <section className="card big" onClick={toggleRealtime} role="button" title="Click to toggle realtime">
          <div className="card-top">
            <div className="icon-droplet" aria-hidden>💧</div>
            <div>
              <div className="card-title">Moisture</div>
              <div className="card-sub">Last checked: {lastTs ? clockTime(lastTs) : "--:--:--"}</div>
            </div>
          </div>

          <div className="reading large" style={{color: moistureDisplay.toLowerCase() === "dry" ? "#FF8A3D" : moistureDisplay.toLowerCase() === "mixed" ? "#C6F16B" : "#37D6B8"}}>
            {moistureDisplay}
          </div>

          <div className="small-row">
            <div>Next update: <strong>{isRealtime ? "Realtime" : `${Math.floor(nextInSec/60)}:${String(nextInSec%60).padStart(2,"0")}`}</strong></div>
            <div><small>Tap for realtime</small></div>
          </div>
        </section>

        <section className="card">
          <div className="card-top">
            <div className="icon-temp" aria-hidden>🌡️</div>
            <div>
              <div className="card-title">Temperature</div>
              <div className="card-sub">Last checked: {lastTs ? clockTime(lastTs) : "--:--:--"}</div>
            </div>
          </div>

          <div className="reading">{tempDisplay}</div>

          <div className="small-row">
            <div>Updated every 5 min</div>
            <div><small>Tap to realtime</small></div>
          </div>
        </section>

        <section className="card wide">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div className="card-title">Recent (history)</div>
            <div style={{fontSize:13, color:"var(--muted)">Last: {lastTs ? clockTime(lastTs) : "--:--:--"}</div>
          </div>

          <div style={{display:"flex", gap:12, alignItems:"center", marginTop:8}}>
            <div style={{flex:1}}>
              <LineChart data={tempPoints.map((p,i)=>({t:p.t,value:p.value ?? 0}))} />
              <div style={{fontSize:12, color:"var(--muted)", marginTop:6}}>Temperature (°{unitC ? "C" : "F"})</div>
            </div>
            <div style={{width:140}}>
              <MoistureTimeline data={moisturePoints} />
              <div style={{fontSize:12, color:"var(--muted)", marginTop:6}}>Moisture timeline</div>
            </div>
          </div>
        </section>

        <section className="actions card">
          <div style={{display:"flex", gap:8}}>
            <button className="btn" onClick={handleConnect} disabled={connected}>Connect</button>
            <button className="btn muted" onClick={handleDisconnect} disabled={!connected}>Disconnect</button>
            <button className="btn outline" onClick={toggleRealtime} disabled={!connected}>{isRealtime ? "Stop Realtime" : "Realtime"}</button>
          </div>

          <div style={{marginTop:10, fontSize:13, color:"var(--muted)"}}>
            Status: <strong>{status}</strong>
          </div>

          <div style={{marginTop:8, fontSize:13, color:"var(--muted)"}}>
            Leave the tab open for background notifications. Android Chrome recommended.
          </div>
        </section>
      </main>

      <footer className="footer">
        <small>Built for silica monitoring • BLE device: XIAO-C3-BLE</small>
      </footer>
    </div>
  );
}
