import type { ActiveSession } from "../types/scan-types";

interface CachedLocation {
  id: string;
  barcode: string;
}

const activeSessionKey = "scan-active-session";
const locationKeyPrefix = "scan-location-cache";

const locationKey = (sessionId: string, barcode: string) =>
  `${locationKeyPrefix}:${sessionId}:${barcode.trim().toUpperCase()}`;

export const saveCachedActiveSession = (session: ActiveSession) => {
  localStorage.setItem(activeSessionKey, JSON.stringify(session));
};

export const getCachedActiveSession = (): ActiveSession | null => {
  const raw = localStorage.getItem(activeSessionKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed?.id && parsed?.clientName ? parsed : null;
  } catch {
    return null;
  }
};

export const saveCachedLocation = (
  sessionId: string,
  location: CachedLocation,
) => {
  localStorage.setItem(
    locationKey(sessionId, location.barcode),
    JSON.stringify(location),
  );
};

export const getCachedLocation = (
  sessionId: string,
  barcode: string,
): CachedLocation | null => {
  const raw = localStorage.getItem(locationKey(sessionId, barcode));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed?.id && parsed?.barcode ? parsed : null;
  } catch {
    return null;
  }
};
