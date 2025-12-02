# Silica Sensor Web App

React + Vite web client to connect to XIAO ESP32-C3 BLE sensor and display moisture & temperature.

- Build: `npm run build`
- Preview locally: `npm run preview`
- Deploy: Push to GitHub and connect to Vercel (Framework: Vite, Build: `npm run build`, Output: `dist`)

BLE expects service UUID: `12345678-1234-5678-1234-56789abcdef0`
Characteristic UUID: `12345678-1234-5678-1234-56789abcdef1`
Device name: `XIAO-C3-BLE`
