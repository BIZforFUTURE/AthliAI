import { Platform } from 'react-native';

export const APP_BACKGROUND_FETCH = 'APP_BACKGROUND_FETCH' as const;

export type BackgroundFetchPayload = {
  taskName: string;
};

let webInterval: number | null = null;

export async function registerBackgroundFetchAsync() {
  ensureWebInterval();
  return { registered: true, reason: 'web-interval' } as const;
}

export async function unregisterBackgroundFetchAsync() {
  clearWebInterval();
}

function ensureWebInterval() {
  if (Platform.OS !== 'web') return;
  if (webInterval != null) return;
  webInterval = setInterval(() => {
    void runSyncAndCleanup();
  }, 5 * 60 * 1000) as unknown as number;
  console.log('Web background interval registered');
}

function clearWebInterval() {
  if (webInterval != null) {
    clearInterval(webInterval as unknown as NodeJS.Timeout);
    webInterval = null;
  }
}

export async function runSyncAndCleanup() {
  try {
    console.log('runSyncAndCleanup (web): begin');
    await new Promise((r) => setTimeout(r, 250));
    console.log('runSyncAndCleanup (web): done');
  } catch (e) {
    console.log('runSyncAndCleanup (web) error', e);
  }
}
