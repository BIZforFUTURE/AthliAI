import React, { useCallback, useMemo, useState } from "react";
import { Stack, router } from "expo-router";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from "react-native";
import { useNotifications } from "@/contexts/NotificationsContext";
import { BellRing, Plus, Trash2, Clock } from "lucide-react-native";

function isValidHHMM(val: string): boolean {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(val);
  return !!m;
}

export default function NotificationsSettingsScreen() {
  const { settings, setRunTime, setFoodTimes, toggleFood, toggleRun } = useNotifications();
  const [runTimeInput, setRunTimeInput] = useState<string>(settings.runTime);
  const [newFoodTime, setNewFoodTime] = useState<string>("");

  const foodTimes = useMemo(() => settings.foodTimes, [settings.foodTimes]);

  const onSaveRunTime = useCallback(() => {
    if (!isValidHHMM(runTimeInput)) {
      Alert.alert("Invalid time", "Please enter time as HH:MM in 24h format (e.g. 07:30)");
      return;
    }
    setRunTime(runTimeInput);
    Alert.alert("Saved", "Run reminder time updated");
  }, [runTimeInput, setRunTime]);

  const onAddFoodTime = useCallback(() => {
    const t = newFoodTime.trim();
    if (!isValidHHMM(t)) {
      Alert.alert("Invalid time", "Use HH:MM in 24h format");
      return;
    }
    const next = Array.from(new Set([...foodTimes, t])).sort();
    setFoodTimes(next);
    setNewFoodTime("");
  }, [foodTimes, newFoodTime, setFoodTimes]);

  const onRemoveFoodTime = useCallback((t: string) => {
    const next = foodTimes.filter((x) => x !== t);
    setFoodTimes(next);
  }, [foodTimes, setFoodTimes]);

  const requestWebPermission = useCallback(() => {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined" && "Notification" in window) {
        void (window as any).Notification.requestPermission().then((p: string) => {
          Alert.alert("Permission", `Browser permission: ${p}`);
        });
      } else {
        Alert.alert("Info", "System notifications are enabled by OS settings");
      }
    } catch (e) {
      Alert.alert("Error", "Could not request permission");
    }
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Reminders" }} />

      <View style={styles.card}>
        <View style={styles.rowHeader}>
          <BellRing size={18} color="#1C1C1E" />
          <Text style={styles.title}>Daily Run Reminder</Text>
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Enabled</Text>
          <TouchableOpacity
            onPress={() => toggleRun(!settings.enableRunReminder)}
            style={[styles.toggle, settings.enableRunReminder ? styles.toggleOn : styles.toggleOff]}
            activeOpacity={0.8}
            testID="toggle-run-reminder"
          >
            <View style={[styles.knob, settings.enableRunReminder ? styles.knobOn : styles.knobOff]} />
          </TouchableOpacity>
        </View>
        <View style={styles.inputRow}>
          <Clock size={16} color="#007AFF" />
          <TextInput
            style={styles.input}
            value={runTimeInput}
            onChangeText={setRunTimeInput}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            testID="run-time-input"
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={onSaveRunTime} activeOpacity={0.85} testID="save-run-time">
            <Text style={styles.primaryBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowHeader}>
          <BellRing size={18} color="#1C1C1E" />
          <Text style={styles.title}>Meal Logging Reminders</Text>
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Enabled</Text>
          <TouchableOpacity
            onPress={() => toggleFood(!settings.enableFoodReminder)}
            style={[styles.toggle, settings.enableFoodReminder ? styles.toggleOn : styles.toggleOff]}
            activeOpacity={0.8}
            testID="toggle-food-reminder"
          >
            <View style={[styles.knob, settings.enableFoodReminder ? styles.knobOn : styles.knobOff]} />
          </TouchableOpacity>
        </View>
        {foodTimes.map((t) => (
          <View key={t} style={styles.foodRow}>
            <Text style={styles.foodTime}>{t}</Text>
            <TouchableOpacity onPress={() => onRemoveFoodTime(t)} style={styles.iconBtn} testID={`remove-food-${t}`} activeOpacity={0.8}>
              <Trash2 size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.inputRow}>
          <Clock size={16} color="#007AFF" />
          <TextInput
            style={styles.input}
            value={newFoodTime}
            onChangeText={setNewFoodTime}
            placeholder="Add time (HH:MM)"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            testID="new-food-time-input"
          />
          <TouchableOpacity style={styles.secondaryBtn} onPress={onAddFoodTime} activeOpacity={0.85} testID="add-food-time">
            <Plus size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.outlineBtn} onPress={requestWebPermission} activeOpacity={0.85} testID="request-web-permission">
        <Text style={styles.outlineBtnText}>Request Browser Notification Permission</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.primaryWide} onPress={() => router.back()} activeOpacity={0.9} testID="done-btn">
        <Text style={styles.primaryWideText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    padding: 16,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#1C1C1E",
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 16,
    padding: 2,
    justifyContent: "center",
  },
  toggleOn: {
    backgroundColor: "#34C759",
  },
  toggleOff: {
    backgroundColor: "#E5E7EB",
  },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFF",
  },
  knobOn: {
    alignSelf: "flex-end",
  },
  knobOff: {
    alignSelf: "flex-start",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  primaryBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryBtnText: {
    color: "#FFF",
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: "#EAF2FF",
    borderRadius: 10,
    padding: 10,
  },
  iconBtn: {
    backgroundColor: "#FFF2F2",
    borderRadius: 10,
    padding: 8,
  },
  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  foodTime: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  outlineBtnText: {
    color: "#007AFF",
    fontWeight: "700",
  },
  primaryWide: {
    marginTop: 16,
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryWideText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});