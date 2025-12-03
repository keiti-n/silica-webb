import React, { useEffect, useRef, useState } from "react";
import { requestAndConnect, writeCommand, disconnect } from "./bluetooth";

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
  const [, tick] = useState(0); // used to force re-render f
