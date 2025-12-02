// src/bluetooth.ts
export const DEVICE_NAME = "XIAO-C3-BLE";
export const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
export const CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

export type NotifyCallback = (payload: { moisture: string; temperature: string; raw: string }) => void;

let deviceGlobal: BluetoothDevice | null = null;
let charGlobal: BluetoothRemoteGATTCharacteristic | null = null;

export async function requestAndConnect(onNotify: NotifyCallback) {
  if (!("bluetooth" in navigator)) throw new Error("Web Bluetooth not supported in this browser.");

  const device = await (navigator as any).bluetooth.requestDevice({
    filters: [{ name: DEVICE_NAME }],
    optionalServices: [SERVICE_UUID],
  });

  deviceGlobal = device;
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
  charGlobal = characteristic;

  await characteristic.startNotifications();
  characteristic.addEventListener("characteristicvaluechanged", (ev: Event) => {
    const val = (ev.target as BluetoothRemoteGATTCharacteristic).value;
    if (!val) return;
    const raw = new TextDecoder().decode(val);
    const [moisture, temperature] = raw.trim().split(",");
    onNotify({ moisture: moisture ?? "", temperature: temperature ?? "", raw });
  });

  device.addEventListener("gattserverdisconnected", () => {
    console.log("disconnected");
  });

  return { device, server, service, characteristic };
}

export async function writeCommand(cmd: string) {
  if (!charGlobal) throw new Error("Not connected");
  const data = new TextEncoder().encode(cmd);
  await charGlobal.writeValue(data);
}

export async function disconnect() {
  try {
    if (deviceGlobal && deviceGlobal.gatt && deviceGlobal.gatt.connected) deviceGlobal.gatt.disconnect();
  } catch (e) {
    console.warn(e);
  }
  deviceGlobal = null;
  charGlobal = null;
}
