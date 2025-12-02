// src/bluetooth.ts
// Web Bluetooth helper
export const DEVICE_NAME = "XIAO-C3-BLE";
export const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
export const CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

export type NotifyCallback = (payload: {
  moisture: string;
  temperature: string;
  raw: string;
}) => void;

export async function requestAndConnect(onNotify: NotifyCallback) {
  if (!("bluetooth" in navigator)) {
    throw new Error("Web Bluetooth is not available in this browser.");
  }

  const device = await (navigator as any).bluetooth.requestDevice({
    filters: [{ name: DEVICE_NAME }],
    optionalServices: [SERVICE_UUID],
  });

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  const char = await service.getCharacteristic(CHARACTERISTIC_UUID);

  await char.startNotifications();
  char.addEventListener("characteristicvaluechanged", (ev: Event) => {
    const value = (ev.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    const raw = new TextDecoder().decode(value);
    const [moisture, temperature] = raw.trim().split(",");
    onNotify({
      moisture: moisture ?? "",
      temperature: temperature ?? "",
      raw,
    });
  });

  // attach disconnect handler
  device.addEventListener("gattserverdisconnected", () => {
    console.log("Device disconnected");
  });

  return { device, server, service, characteristic: char };
}

export async function disconnect(device?: BluetoothDevice) {
  if (!device) return;
  try {
    if (device.gatt && device.gatt.connected) device.gatt.disconnect();
  } catch (e) {
    console.warn("Error while disconnecting:", e);
  }
}
