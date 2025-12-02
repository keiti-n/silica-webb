import React, { useState, useRef } from "react";
import { requestAndConnect, disconnect } from "./bluetooth";

export default function App() {
  const [status, setStatus] = useState("idle");
  const [moisture, setMoisture] = useState<string>("--");
  const [temperature, setTemperature] = useState<string>("--");
  const deviceRef = useRef<BluetoothDevice | null>(null);

  async function onConnect() {
    setStatus("requesting");
    try {
      const res = await requestAndConnect(({ moisture, temperature: temp }) => {
        setMoisture(moisture);
        setTemperature(temp);
        setStatus("receiving");
      });
      deviceRef.current = res.device ?? null;
      deviceRef.current!.addEventListener("gattserverdisconnected", () => {
        setStatus("disconnected");
      });
      setStatus("connected");
    } catch (err: any) {
      console.error(err);
      setStatus(err?.message ?? "failed");
    }
  }

  function onDisconnect() {
    if (deviceRef.current) {
      disconnect(deviceRef.current);
      deviceRef.current = null;
      setStatus("disconnected");
    }
  }

  return (
    <div className="container">
      <h1>Silica Sensor</h1>

      <div className="controls">
        <button onClick={onConnect} disabled={status === "connected" || status === "receiving"}>
          Connect
        </button>
        <button onClick={onDisconnect} disabled={!deviceRef.current}>
          Disconnect
        </button>
      </div>

      <div className="status">
        <strong>Status:</strong> {status}
      </div>

      <div className="readings">
        <div className="card">
          <h3>Moisture</h3>
          <p className="value">{moisture}</p>
        </div>

        <div className="card">
          <h3>Temperature (°C)</h3>
          <p className="value">{temperature}</p>
        </div>
      </div>

      <footer>
        <small>Make sure Bluetooth & location are enabled on mobile. Use Chrome on Android for best compatibility.</small>
      </footer>
    </div>
  );
}
