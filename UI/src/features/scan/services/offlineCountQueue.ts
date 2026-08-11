import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Network } from "@capacitor/network";

export interface OfflineInventoryCount {
  localId: string;
  inventorySessionId: string;
  ean: string;
  productLocationId: string;
  quantity: number;
  countVersion: number;
  countedAt: string;
  createdAt: string;
}

const queueFilePath = "offline/inventory-counts.json";
const localStorageKey = "inventory-offline-counts";

export const createOfflineCountId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (
      Number(char) ^
      (Math.random() * 16) >> (Number(char) / 4)
    ).toString(16),
  );
};

const isNativeFilesystemAvailable = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Filesystem");

const readFallbackQueue = (): OfflineInventoryCount[] => {
  const raw = localStorage.getItem(localStorageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeFallbackQueue = (items: OfflineInventoryCount[]) => {
  localStorage.setItem(localStorageKey, JSON.stringify(items));
};

export const readOfflineCounts = async (): Promise<OfflineInventoryCount[]> => {
  if (!isNativeFilesystemAvailable()) {
    return readFallbackQueue();
  }

  try {
    const result = await Filesystem.readFile({
      path: queueFilePath,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });

    const data =
      typeof result.data === "string" ? result.data : await result.data.text();
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return readFallbackQueue();
  }
};

export const writeOfflineCounts = async (items: OfflineInventoryCount[]) => {
  writeFallbackQueue(items);

  if (!isNativeFilesystemAvailable()) return;

  await Filesystem.writeFile({
    path: queueFilePath,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
    data: JSON.stringify(items, null, 2),
  });
};

export const enqueueOfflineCount = async (
  item: Omit<OfflineInventoryCount, "createdAt">,
) => {
  const queuedItem: OfflineInventoryCount = {
    ...item,
    createdAt: new Date().toISOString(),
  };

  const current = await readOfflineCounts();
  await writeOfflineCounts([...current, queuedItem]);

  return queuedItem;
};

export const removeOfflineCounts = async (localIds: string[]) => {
  if (localIds.length === 0) return;

  const idSet = new Set(localIds);
  const current = await readOfflineCounts();
  await writeOfflineCounts(current.filter((item) => !idSet.has(item.localId)));
};

export const getNetworkConnected = async () => {
  if (Capacitor.isPluginAvailable("Network")) {
    const status = await Network.getStatus();
    return status.connected;
  }

  return navigator.onLine;
};

export const watchNetworkStatus = (
  onChange: (connected: boolean) => void,
) => {
  let nativeHandle: { remove: () => Promise<void> } | null = null;
  let disposed = false;

  if (Capacitor.isPluginAvailable("Network")) {
    Network.addListener("networkStatusChange", (status) => {
      onChange(status.connected);
    }).then((handle) => {
      if (disposed) {
        handle.remove();
        return;
      }

      nativeHandle = handle;
    });
  }

  const handleOnline = () => onChange(true);
  const handleOffline = () => onChange(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    disposed = true;
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    nativeHandle?.remove();
  };
};
