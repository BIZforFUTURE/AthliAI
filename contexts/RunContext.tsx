import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePaywall } from "@/contexts/PaywallContext";

export interface RunPathPoint { lat: number; lng: number }

export interface Run {
  id: string;
  distance: number;
  duration: string;
  pace: string;
  date: string;
  path: RunPathPoint[];
}

export const [RunProvider, useRuns] = createContextHook(() => {
  const [runs, setRuns] = useState<Run[]>([]);
  const { hasUsedFree, requireSubscription, markRunCompletedIfFirst } = usePaywall();

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const stored = await AsyncStorage.getItem("runs");
      if (stored) {
        const parsed: Array<Partial<Run>> = JSON.parse(stored);
        const normalized: Run[] = parsed.map((r) => ({
          id: String(r.id ?? Date.now().toString()),
          distance: Number(r.distance ?? 0),
          duration: String(r.duration ?? "0:00"),
          pace: String(r.pace ?? "0:00"),
          date: String(r.date ?? new Date().toISOString()),
          path: Array.isArray(r.path)
            ? (r.path as RunPathPoint[]).filter(p => typeof p?.lat === 'number' && typeof p?.lng === 'number')
            : [],
        }));
        setRuns(normalized);
      }
    } catch (error) {
      console.error("Error loading runs:", error);
    }
  };

  const addRun = async (runData: Omit<Run, "id">) => {
    if (hasUsedFree && requireSubscription()) {
      return;
    }
    const newRun: Run = {
      ...runData,
      id: Date.now().toString(),
    };
    const updated = [newRun, ...runs];
    setRuns(updated);
    await AsyncStorage.setItem("runs", JSON.stringify(updated));
    await markRunCompletedIfFirst();
  };

  const lastRun = runs.length > 0 ? runs[0] : null;

  return { runs, addRun, lastRun };
});