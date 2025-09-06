import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const RUN_LOCATION_TASK = 'RUN_LOCATION_TASK';

export interface ActiveRunState {
  startedAt: number;
  totalDistanceMi: number;
  elapsedSec: number;
  isRunning: boolean;
  lastLat?: number;
  lastLng?: number;
  updatedAt?: number;
  path?: { lat: number; lng: number }[];
}

const ACTIVE_RUN_KEY = 'activeRunState';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function ensureTask() {
  return;
}

export async function startBackgroundUpdates() {
  try {
    const initState: ActiveRunState = { startedAt: Date.now(), totalDistanceMi: 0, elapsedSec: 0, isRunning: true, path: [] };
    await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(initState));
  } catch (e) {
    console.log('startBackgroundUpdates error', e);
  }
  return { started: false, reason: 'disabled' } as const;
}

export async function stopBackgroundUpdates() {
  return;
}

export async function isBackgroundTrackingEnabled(): Promise<boolean> {
  return false;
}

export async function getActiveRunState(): Promise<ActiveRunState | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
    return raw ? (JSON.parse(raw) as ActiveRunState) : null;
  } catch (e) {
    console.log('getActiveRunState error', e);
    return null;
  }
}

export async function setActiveRunState(next: ActiveRunState) {
  try {
    await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(next));
  } catch (e) {
    console.log('setActiveRunState error', e);
  }
}

export async function clearActiveRunState() {
  try {
    await AsyncStorage.removeItem(ACTIVE_RUN_KEY);
  } catch (e) {
    console.log('clearActiveRunState error', e);
  }
}
