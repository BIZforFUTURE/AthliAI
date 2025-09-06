import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Linking,
  Image as RNImage,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Play, MapPin, Clock, TrendingUp, ShieldAlert, Settings, Lock, History as HistoryIcon } from "lucide-react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useRuns } from "@/contexts/RunContext";
import { usePaywall } from "@/contexts/PaywallContext";
import { Image } from "expo-image";

function simplifyPath(path: Array<{ lat: number; lng: number }>, maxPoints = 40) {
  if (!Array.isArray(path)) return [] as Array<{ lat: number; lng: number }>;
  if (path.length <= maxPoints) return path;
  const step = Math.max(1, Math.floor(path.length / maxPoints));
  const simplified: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < path.length; i += step) simplified.push(path[i]!);
  if (simplified[simplified.length - 1] !== path[path.length - 1]) simplified.push(path[path.length - 1]!);
  return simplified;
}

function buildStaticMapUrl(path: Array<{ lat: number; lng: number }>, width = 600, height = 200) {
  const pts = simplifyPath(path);
  const latitudes = pts.map(p => p.lat);
  const longitudes = pts.map(p => p.lng);
  const latCenter = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const lngCenter = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
  const encoded = pts.map(p => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join("|");
  const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${latCenter.toFixed(6)},${lngCenter.toFixed(6)}&zoom=14&size=${width}x${height}&maptype=mapnik&path=weight:3|color:0x007AFF|${encoded}`;
  return url;
}

export default function RunScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [requesting, setRequesting] = useState<boolean>(false);
  const { lastRun } = useRuns();
  const { hasUsedFree, requireSubscription } = usePaywall();

  const checkAndRequest = useCallback(async () => {
    console.log("Run: checkAndRequest start");
    setRequesting(true);
    try {
      if (Platform.OS === "web") {
        setHasPermission(false);
        return false;
      }
      const current = await Location.getForegroundPermissionsAsync();
      console.log("Run: getForegroundPermissionsAsync", current);
      if (current.granted) {
        setHasPermission(true);
        return true;
      }
      const requested = await Location.requestForegroundPermissionsAsync();
      console.log("Run: requestForegroundPermissionsAsync", requested);
      setHasPermission(requested.granted);
      return requested.granted;
    } catch (e) {
      console.log("Run: permission flow error", e);
      setHasPermission(false);
      return false;
    } finally {
      setRequesting(false);
    }
  }, []);

  useEffect(() => {
    checkAndRequest();
  }, [checkAndRequest]);

  const openSettings = useCallback(async () => {
    console.log("Run: open settings pressed");
    if (Platform.OS === "web") {
      Alert.alert("Open Settings", "Please enable location in your browser settings.");
      return;
    }
    try {
      await Linking.openSettings();
    } catch (e) {
      console.log("Run: openSettings error", e);
      Alert.alert("Unable to open Settings", "Please open the Settings app and enable Location for this app.");
    }
  }, []);

  const startRun = useCallback(async () => {
    console.log("Run: startRun tapped");
    if (hasUsedFree && requireSubscription()) {
      return;
    }
    let allowed = hasPermission === true;
    if (!allowed) {
      allowed = await checkAndRequest();
    }
    if (!allowed) {
      Alert.alert(
        "Location Permission Required",
        "We need your location to track your run.",
        [
          { text: "Open Settings", onPress: openSettings },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    if (Platform.OS === "web") {
      Alert.alert(
        "Not Available on Web",
        "Run tracking is only available on mobile devices.",
        [{ text: "OK" }]
      );
      return;
    }

    router.push("/active-run" as any);
  }, [hasPermission, openSettings, checkAndRequest, hasUsedFree, requireSubscription]);

  const permissionBanner = useMemo(() => {
    if (hasPermission === false) {
      return (
        <View style={styles.permCard} testID="location-permission-card">
          <View style={styles.permHeader}>
            <ShieldAlert size={20} color="#FF3B30" />
            <Text style={styles.permTitle}>Location permission needed</Text>
          </View>
          <Text style={styles.permText}>
            Enable location (foreground and background) to track distance and pace.
          </Text>
          <View style={styles.permActions}>
            <TouchableOpacity
              testID="allowNow"
              style={[styles.permButton, styles.permPrimary]}
              onPress={checkAndRequest}
              disabled={requesting}
              activeOpacity={0.8}
            >
              <Text style={styles.permPrimaryText}>{requesting ? "Requesting…" : "Allow Now"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="openSettings"
              style={[styles.permButton, styles.permSecondary]}
              onPress={openSettings}
              activeOpacity={0.8}
            >
              <Settings size={16} color="#007AFF" />
              <Text style={styles.permSecondaryText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return null;
  }, [hasPermission, requesting, checkAndRequest, openSettings]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Ready to Run?</Text>
          <Text style={styles.subtitle}>Track your progress and beat your records</Text>
        </View>

        {permissionBanner}

        <TouchableOpacity testID="startRun" onPress={startRun} activeOpacity={0.9}>
          <LinearGradient
            colors={["#007AFF", "#0051D5"]}
            style={styles.startButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {hasUsedFree ? <Lock size={32} color="#FFF" /> : <Play size={32} color="#FFF" fill="#FFF" />}
            <Text style={styles.startButtonText}>{hasUsedFree ? "Unlock to Run" : "Start Running"}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {lastRun && (
          <View style={styles.lastRunCard}>
            <Text style={styles.lastRunTitle}>Last Run</Text>
            {Array.isArray(lastRun.path) && lastRun.path.length >= 2 ? (
              <Image
                testID="lastRunMap"
                style={styles.mapPreview}
                source={{ uri: buildStaticMapUrl(lastRun.path, 600, 200) }}
                contentFit="cover"
              />
            ) : null}
            <View style={styles.lastRunStats}>
              <View style={styles.lastRunStat}>
                <MapPin size={20} color="#8E8E93" />
                <Text style={styles.lastRunValue}>{lastRun.distance.toFixed(1)} mi</Text>
              </View>
              <View style={styles.lastRunStat}>
                <Clock size={20} color="#8E8E93" />
                <Text style={styles.lastRunValue}>{lastRun.duration}</Text>
              </View>
              <View style={styles.lastRunStat}>
                <TrendingUp size={20} color="#8E8E93" />
                <Text style={styles.lastRunValue}>{`${lastRun.pace} min/mi`}</Text>
              </View>
            </View>
            <Text style={styles.lastRunDate}>
              {new Date(lastRun.date).toLocaleDateString()}
            </Text>
          </View>
        )}

        <TouchableOpacity
          testID="viewHistory"
          style={styles.historyButton}
          onPress={() => router.push('/(tabs)/(run)/history' as any)}
          activeOpacity={0.9}
        >
          <HistoryIcon size={18} color="#007AFF" />
          <Text style={styles.historyText}>View Past Runs</Text>
        </TouchableOpacity>

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Running Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>💧</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipHeading}>Stay Hydrated</Text>
              <Text style={styles.tipText}>Drink water before, during, and after your run</Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>👟</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipHeading}>Proper Footwear</Text>
              <Text style={styles.tipText}>Wear comfortable running shoes with good support</Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>🎵</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipHeading}>Music Motivation</Text>
              <Text style={styles.tipText}>Create a playlist that matches your running pace</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    padding: 24,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
  },
  startButton: {
    marginHorizontal: 24,
    marginVertical: 16,
    padding: 24,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  lastRunCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 24,
    marginVertical: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lastRunTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  mapPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
  },
  lastRunStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  lastRunStat: {
    alignItems: "center",
    gap: 8,
  },
  lastRunValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  lastRunDate: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 8,
  },
  historyButton: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: '#EAF2FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tipsSection: {
    padding: 24,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  tipCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipEmoji: {
    fontSize: 28,
  },
  tipContent: {
    flex: 1,
  },
  tipHeading: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  permCard: {
    backgroundColor: "#FFF3F3",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FFDAD7",
    gap: 12,
  },
  permHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  permTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  permText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  permActions: {
    flexDirection: "row",
    gap: 12,
  },
  permButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    flexShrink: 0,
  },
  permPrimary: {
    backgroundColor: "#007AFF",
  },
  permPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  permSecondary: {
    backgroundColor: "#EAF2FF",
  },
  permSecondaryText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
});