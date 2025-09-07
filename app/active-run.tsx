import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Pause, Play, Square, X } from "lucide-react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useRuns } from "@/contexts/RunContext";
import { startBackgroundUpdates, stopBackgroundUpdates, getActiveRunState, setActiveRunState, clearActiveRunState, type ActiveRunState } from "@/services/backgroundLocation";
import { usePaywall } from "@/contexts/PaywallContext";

export default function ActiveRunScreen() {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [duration, setDuration] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [pace, setPace] = useState<string>("0:00");
  const lastLocationRef = useRef<Location.LocationObject | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const { addRun } = useRuns();
  const { requireSubscription } = usePaywall();

  useEffect(() => {
    (async () => {
      try {
        if (requireSubscription()) {
          return;
        }
        const st = await getActiveRunState();
        if (st) {
          setDistance(st.totalDistanceMi ?? 0);
          setDuration(st.elapsedSec ?? 0);
          setIsRunning(st.isRunning ?? true);
        }
      } catch {}
      if (!requireSubscription()) {
        startTracking();
      }
    })();
    return () => {
      stopTracking();
    };
  }, [requireSubscription]);

  useEffect(() => {
    let sub: ReturnType<typeof setInterval> | null = null;
    let appStateSub: any;
    (async () => {
      try {
        if (Platform.OS !== "web") {
          await startBackgroundUpdates();
        }
        const init = await getActiveRunState();
        if (init?.totalDistanceMi) {
          setDistance(init.totalDistanceMi);
        }
      } catch (e) {
        console.log("ActiveRun: background start error", e);
      }
      sub = setInterval(async () => {
        try {
          const st = await getActiveRunState();
          if (st?.totalDistanceMi != null) {
            setDistance(st.totalDistanceMi);
          }
          if (st?.elapsedSec != null && !isRunning) {
            setDuration(st.elapsedSec);
          }
        } catch (e) {
          // ignore
        }
      }, 4000);
      appStateSub = AppState.addEventListener("change", async (state) => {
        if (state === "active") {
          try {
            const st = await getActiveRunState();
            if (st?.totalDistanceMi != null) setDistance(st.totalDistanceMi);
          } catch {}
        }
      });
    })();
    return () => {
      if (sub) clearInterval(sub);
      if (appStateSub?.remove) appStateSub.remove();
    };
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setDuration((prev: number) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (duration > 0 && distance > 0) {
      const paceMinutes = duration / 60 / distance;
      const minutes = Math.floor(paceMinutes);
      const seconds = Math.round((paceMinutes - minutes) * 60);
      setPace(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    } else if (distance === 0) {
      setPace("0:00");
    }
  }, [duration, distance]);

  const startTracking = async () => {
    try {
      if (Platform.OS === "web") return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location Required", "Please allow location to track your run.");
        return;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 3,
        },
        async (location) => {
          try {
            const prev = lastLocationRef.current;
            const accuracy = location.coords.accuracy ?? 0;
            if (accuracy > 50) {
              return;
            }
            if (prev && isRunning) {
              const distKm = haversineKm(
                prev.coords.latitude,
                prev.coords.longitude,
                location.coords.latitude,
                location.coords.longitude
              );
              const distMi = distKm * 0.621371;
              if (distMi > 0 && distMi < 0.2) {
                setDistance((d: number) => d + distMi);
                try {
                  const st = await getActiveRunState();
                  const now = Date.now();
                  const existingPath = Array.isArray(st?.path) ? st?.path : [];
                  const nextPath = existingPath.concat({ lat: location.coords.latitude, lng: location.coords.longitude }).slice(-5000);
                  const nextState: ActiveRunState = {
                    startedAt: st?.startedAt ?? now,
                    totalDistanceMi: (st?.totalDistanceMi ?? 0) + distMi,
                    elapsedSec: st?.elapsedSec ?? duration,
                    isRunning: st?.isRunning ?? isRunning,
                    lastLat: location.coords.latitude,
                    lastLng: location.coords.longitude,
                    updatedAt: now,
                    path: nextPath,
                  };
                  await setActiveRunState(nextState);
                } catch {}
              }
            }
            lastLocationRef.current = location;
          } catch (e) {
            console.log("Location callback error", e);
          }
        }
      );
      locationSubscription.current = subscription;
    } catch (err) {
      console.log("startTracking error", err);
    }
  };

  const stopTracking = () => {
    try {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch (e) {
      console.log("stopTracking error", e);
    }
  };

  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePause = async () => {
    try {
      setIsRunning((prev: boolean) => !prev);
      const st = await getActiveRunState();
      const now = Date.now();
      const next: ActiveRunState = {
        startedAt: st?.startedAt ?? now,
        totalDistanceMi: st?.totalDistanceMi ?? distance,
        elapsedSec: st?.elapsedSec ?? duration,
        isRunning: !(st?.isRunning ?? isRunning),
        lastLat: st?.lastLat,
        lastLng: st?.lastLng,
        updatedAt: now,
      };
      await setActiveRunState(next);
    } catch (e) {
      console.log('pause toggle error', e);
    }
  };

  const handleStop = () => {
    if (requireSubscription()) {
      return;
    }
    Alert.alert(
      "Finish Run?",
      "Are you sure you want to finish this run?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish",
          style: "destructive",
          onPress: async () => {
            try {
              stopTracking();
              await stopBackgroundUpdates();
              await clearActiveRunState();
            } catch {}
            try {
              const st = await getActiveRunState();
              const path = Array.isArray(st?.path) ? st?.path : [];
              addRun({
                distance,
                duration: formatDuration(duration),
                pace,
                date: new Date().toISOString(),
                path,
              });
            } catch {}
            router.back();
          },
        },
      ]
    );
  };

  const handleClose = () => {
    Alert.alert(
      "Cancel Run?",
      "Your progress will be lost.",
      [
        { text: "Keep Running", style: "cancel" },
        { 
          text: "Cancel Run", 
          style: "destructive",
          onPress: async () => {
            try {
              stopTracking();
              await stopBackgroundUpdates();
              await clearActiveRunState();
            } catch {}
            router.back();
          }
        }
      ]
    );
  };

  return (
    <LinearGradient
      colors={["#007AFF", "#0051D5"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity testID="close-run" style={styles.closeButton} onPress={handleClose}>
          <X size={28} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.mainStat}>
            <Text testID="distance-value" style={styles.mainValue}>{distance.toFixed(2)}</Text>
            <Text style={styles.mainLabel}>MILES</Text>
          </View>

          <View style={styles.secondaryStats}>
            <View style={styles.stat}>
              <Text testID="duration-value" style={styles.statValue}>{formatDuration(duration)}</Text>
              <Text style={styles.statLabel}>DURATION</Text>
            </View>
            <View style={styles.stat}>
              <Text testID="pace-value" style={styles.statValue}>{pace}</Text>
              <Text style={styles.statLabel}>PACE (MIN/MI)</Text>
            </View>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            testID="pause-resume"
            style={styles.controlButton}
            onPress={handlePause}
            activeOpacity={0.8}
          >
            {isRunning ? (
              <Pause size={32} color="#FFF" fill="#FFF" />
            ) : (
              <Play size={32} color="#FFF" fill="#FFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            testID="stop-run"
            style={[styles.controlButton, styles.stopButton]}
            onPress={handleStop}
            activeOpacity={0.8}
          >
            <Square size={28} color="#FFF" fill="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  statsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  mainStat: {
    alignItems: "center",
    marginBottom: 60,
  },
  mainValue: {
    fontSize: 72,
    fontWeight: "bold",
    color: "#FFF",
  },
  mainLabel: {
    fontSize: 16,
    color: "#FFF",
    opacity: 0.8,
    letterSpacing: 2,
    marginTop: 8,
  },
  secondaryStats: {
    flexDirection: "row",
    gap: 60,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "600",
    color: "#FFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#FFF",
    opacity: 0.8,
    letterSpacing: 1,
    marginTop: 8,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    paddingBottom: 60,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  stopButton: {
    backgroundColor: "rgba(255, 59, 48, 0.3)",
  },
});