import React, { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from "react-native";
import { useNutrition, NutritionGoals } from "@/contexts/NutritionContext";
import { useRouter } from "expo-router";
import { Target, Info, FlaskConical } from "lucide-react-native";

export default function GoalsScreen() {
  const { goals, setGoals } = useNutrition();
  const router = useRouter();

  const [calories, setCalories] = useState<string>((goals?.calories ?? 0).toString());
  const [protein, setProtein] = useState<string>((goals?.protein ?? 0).toString());
  const [fat, setFat] = useState<string>((goals?.fat ?? 0).toString());

  const carbs = useMemo(() => {
    const cals = Number(calories) || 0;
    const p = Number(protein) || 0;
    const f = Number(fat) || 0;
    const remaining = Math.max(0, cals - p * 4 - f * 9);
    return Math.round(remaining / 4);
  }, [calories, protein, fat]);

  const save = useCallback(async () => {
    try {
      const next: NutritionGoals = {
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        fat: Number(fat) || 0,
        carbs,
      };
      await setGoals(next);
      router.back();
    } catch (e) {
      console.error("GoalsScreen: failed to save goals", e);
      Alert.alert("Error", "Failed to save goals. Please try again.");
    }
  }, [calories, protein, fat, carbs, setGoals, router]);

  const openQuiz = useCallback(() => {
    router.push("/(tabs)/(nutrition)/quiz" as any);
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <View style={styles.iconWrap}><Target size={20} color="#FFF" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Daily Goals</Text>
          <Text style={styles.bannerSubtitle}>Set calories, protein and fat. Carbs will auto-balance.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Calories</Text>
        <TextInput
          testID="calInput"
          keyboardType={Platform.OS === "web" ? "number-pad" : "numeric"}
          value={calories}
          onChangeText={setCalories}
          style={styles.input}
          placeholder="e.g. 2200"
        />
        <Text style={styles.label}>Protein (g)</Text>
        <TextInput
          testID="proteinInput"
          keyboardType={Platform.OS === "web" ? "number-pad" : "numeric"}
          value={protein}
          onChangeText={setProtein}
          style={styles.input}
          placeholder="e.g. 150"
        />
        <Text style={styles.label}>Fat (g)</Text>
        <TextInput
          testID="fatInput"
          keyboardType={Platform.OS === "web" ? "number-pad" : "numeric"}
          value={fat}
          onChangeText={setFat}
          style={styles.input}
          placeholder="e.g. 70"
        />
        <View style={styles.row}>
          <Text style={styles.carbText}>Carbs auto: {carbs} g</Text>
        </View>
        <TouchableOpacity testID="saveGoals" onPress={save} style={styles.saveBtn}>
          <Text style={styles.saveText}>Save goals</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity testID="openQuiz" onPress={openQuiz} style={styles.quizBtn}>
        <FlaskConical size={18} color="#0A84FF" />
        <Text style={styles.quizText}>Take quick plan quiz</Text>
      </TouchableOpacity>

      <View style={styles.info}>
        <Info size={16} color="#8E8E93" />
        <Text style={styles.infoText}>You can adjust anytime. We’ll use your plan to track progress.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7", padding: 20 },
  banner: { flexDirection: "row", alignItems: "center", backgroundColor: "#0A84FF", padding: 16, borderRadius: 14, gap: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#1B4DFF", alignItems: "center", justifyContent: "center" },
  bannerTitle: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  bannerSubtitle: { color: "#E6F0FF", fontSize: 13, marginTop: 2 },
  card: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginTop: 16, gap: 8 },
  label: { fontSize: 14, color: "#1C1C1E", fontWeight: "600", marginTop: 8 },
  input: { backgroundColor: "#F2F2F7", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  carbText: { fontSize: 13, color: "#8E8E93" },
  saveBtn: { marginTop: 12, backgroundColor: "#0A84FF", paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  saveText: { color: "#FFF", fontWeight: "700" },
  quizBtn: { marginTop: 16, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EEF5FF", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  quizText: { color: "#0A84FF", fontWeight: "700" },
  info: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, alignSelf: "center" },
  infoText: { color: "#8E8E93", fontSize: 12 },
});