import { Platform } from 'react-native';

export const APP_BACKGROUND_FETCH = 'APP_BACKGROUND_FETCH' as const;

export type BackgroundFetchPayload = {
  taskName: string;
};

export async function registerBackgroundFetchAsync() {
  if (Platform.OS === 'web') {
    ensureWebInterval();
    return { registered: true, reason: 'web-interval' } as const;
  }
  console.log('Background fetch not enabled in this Expo Go setup');
  return { registered: false, reason: 'unavailable' } as const;
}

export async function unregisterBackgroundFetchAsync() {
  if (Platform.OS === 'web') {
    clearWebInterval();
    return;
  }
  console.log('Background fetch unregister noop');
}

let webInterval: number | null = null;

function ensureWebInterval() {
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
    console.log('runSyncAndCleanup: begin');
    await new Promise((r) => setTimeout(r, 250));
    console.log('runSyncAndCleanup: done');
  } catch (e) {
    console.log('runSyncAndCleanup error', e);
  }
}
