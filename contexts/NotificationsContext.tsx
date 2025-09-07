import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, AppStateStatus, Platform } from "react-native";

export type ReminderType = "run" | "food";

interface ReminderSettings {
  enableRunReminder: boolean;
  enableFoodReminder: boolean;
  runTime: string;
  foodTimes: string[];
}

interface PendingReminder {
  id: string;
  type: ReminderType;
  title: string;
  message: string;
  createdAt: number;
}

interface NotificationsContextValue {
  settings: ReminderSettings;
  pending: PendingReminder[];
  setRunTime: (time: string) => void;
  setFoodTimes: (times: string[]) => void;
  toggleRun: (enabled: boolean) => void;
  toggleFood: (enabled: boolean) => void;
  dismissReminder: (id: string) => void;
  markHandledToday: (type: ReminderType) => void;
}

const STORAGE_KEY = "athliai.notifications.v1" as const;
const HANDLED_PREFIX = "athliai.reminderHandled." as const;

function isTimeMatch(now: Date, hhmm: string): boolean {
  const [hh, mm] = hhmm.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
  return now.getHours() === hh && Math.abs(now.getMinutes() - mm) <= 1;
}

function todayKey(type: ReminderType): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${HANDLED_PREFIX}${type}.${y}-${m}-${day}`;
}

export const [NotificationsProvider, useNotifications] = createContextHook<NotificationsContextValue>(() => {
  const [settings, setSettings] = useState<ReminderSettings>({
    enableRunReminder: true,
    enableFoodReminder: true,
    runTime: "10:30",
    foodTimes: ["09:00"],
  });
  const [pending, setPending] = useState<PendingReminder[]>([]);
  const appState = useRef<AppStateStatus>("active");

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
          const restored: ReminderSettings = {
            enableRunReminder: parsed.enableRunReminder ?? true,
            enableFoodReminder: parsed.enableFoodReminder ?? true,
            runTime: parsed.runTime ?? "10:30",
            foodTimes: Array.isArray(parsed.foodTimes) && parsed.foodTimes.length > 0 ? parsed.foodTimes.map(String) : ["09:00"],
          };
          setSettings(restored);
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        }
      } catch (e) {
        console.log("Notifications: load error", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.log("Notifications: persist error", e);
      }
    })();
  }, [settings]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      appState.current = next;
      if (next === "active") {
        runTick();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && "Notification" in window) {
      try {
        if ((window as any).Notification?.permission === "default") {
          void (window as any).Notification.requestPermission();
        }
      } catch (e) {
        console.log("Web notification permission error", e);
      }
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (appState.current === "active") {
        runTick();
      }
    }, 60000);
    return () => clearInterval(id);
  }, [settings]);

  const pushPending = useCallback((rem: PendingReminder) => {
    setPending((prev) => [rem, ...prev].slice(0, 3));
  }, []);

  const notifyWeb = useCallback((title: string, body: string) => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined" && "Notification" in window) {
        if ((window as any).Notification?.permission === "granted") {
          // eslint-disable-next-line no-new
          new (window as any).Notification(title, { body });
        }
      }
    } catch (e) {
      console.log("notifyWeb error", e);
    }
  }, []);

  const runTick = useCallback(async () => {
    const now = new Date();
    try {
      if (settings.enableRunReminder && isTimeMatch(now, settings.runTime)) {
        const k = todayKey("run");
        const handled = await AsyncStorage.getItem(k);
        if (!handled) {
          const r: PendingReminder = {
            id: `${Date.now()}-run`,
            type: "run",
            title: "Time to run",
            message: "Lace up and start your run.",
            createdAt: Date.now(),
          };
          pushPending(r);
          notifyWeb(r.title, r.message);
          if (Platform.OS !== "web") {
            Alert.alert("Run Reminder", r.message);
          }
          await AsyncStorage.setItem(k, "1");
        }
      }
      if (settings.enableFoodReminder) {
        for (const t of settings.foodTimes) {
          if (isTimeMatch(now, t)) {
            const k2 = todayKey("food") + "." + t;
            const handled2 = await AsyncStorage.getItem(k2);
            if (!handled2) {
              const r2: PendingReminder = {
                id: `${Date.now()}-food`,
                type: "food",
                title: "Log your meals",
                message: "Take a minute to log what you ate.",
                createdAt: Date.now(),
              };
              pushPending(r2);
              notifyWeb(r2.title, r2.message);
              if (Platform.OS !== "web") {
                Alert.alert("Nutrition Reminder", r2.message);
              }
              await AsyncStorage.setItem(k2, "1");
            }
          }
        }
      }
    } catch (e) {
      console.log("Notifications tick error", e);
    }
  }, [notifyWeb, pushPending, settings]);

  const setRunTime = useCallback((time: string) => {
    setSettings((prev) => ({ ...prev, runTime: time }));
  }, []);

  const setFoodTimes = useCallback((times: string[]) => {
    setSettings((prev) => ({ ...prev, foodTimes: times }));
  }, []);

  const toggleRun = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, enableRunReminder: enabled }));
  }, []);

  const toggleFood = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, enableFoodReminder: enabled }));
  }, []);

  const dismissReminder = useCallback((id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const markHandledToday = useCallback(async (type: ReminderType) => {
    try {
      const k = todayKey(type);
      await AsyncStorage.setItem(k, "1");
    } catch (e) {
      console.log("markHandledToday error", e);
    }
  }, []);

  const value: NotificationsContextValue = useMemo(() => ({
    settings,
    pending,
    setRunTime,
    setFoodTimes,
    toggleRun,
    toggleFood,
    dismissReminder,
    markHandledToday,
  }), [dismissReminder, markHandledToday, pending, setFoodTimes, setRunTime, settings, toggleFood, toggleRun]);

  return value;
});