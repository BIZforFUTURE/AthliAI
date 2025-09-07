import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Camera, Upload, Flame, Drumstick, Salad, Croissant, Lock } from "lucide-react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useNutrition } from "@/contexts/NutritionContext";
import { usePaywall } from "@/contexts/PaywallContext";

interface NutritionResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function FoodCameraScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<NutritionResult | null>(null);
  const { addMeal } = useNutrition();
  const { hasUsedFree, requireSubscription } = usePaywall();

  const pickImage = async () => {
    console.log("FoodCamera: pickImage pressed");
    const resultPick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!resultPick.canceled && resultPick.assets[0]) {
      const asset = resultPick.assets[0];
      console.log("FoodCamera: image picked", asset.uri);
      setImage(asset.uri ?? null);
      await analyzeFood(asset.base64 ?? "");
    }
  };

  const takePhoto = async () => {
    console.log("FoodCamera: takePhoto pressed");
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required to take photos");
      return;
    }

    const resultCam = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!resultCam.canceled && resultCam.assets[0]) {
      const asset = resultCam.assets[0];
      console.log("FoodCamera: photo taken", asset.uri);
      setImage(asset.uri ?? null);
      await analyzeFood(asset.base64 ?? "");
    }
  };

  const safeParseNutrition = (raw: unknown): NutritionResult | null => {
    try {
      if (typeof raw !== "string") return null;
      let s = raw.trim();
      if (!s) return null;
      if (s.startsWith("```")) {
        s = s.replace(/^```json\n?/i, "").replace(/^```\n?/i, "").replace(/```$/i, "").trim();
      }
      if (s.startsWith("[")) {
        const arr = JSON.parse(s) as unknown[];
        const first = (arr[0] ?? {}) as Record<string, unknown>;
        return {
          name: typeof first.name === "string" ? first.name : "Unknown Food",
          calories: Number(first.calories ?? 0) || 0,
          protein: Number(first.protein ?? 0) || 0,
          carbs: Number(first.carbs ?? 0) || 0,
          fat: Number(first.fat ?? 0) || 0,
        };
      }
      // Try to extract the first JSON object if extra text surrounds it
      const firstBrace = s.indexOf("{");
      const lastBrace = s.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const candidate = s.slice(firstBrace, lastBrace + 1);
        const obj = JSON.parse(candidate) as Record<string, unknown>;
        return {
          name: typeof obj.name === "string" ? obj.name : "Unknown Food",
          calories: Number(obj.calories ?? 0) || 0,
          protein: Number(obj.protein ?? 0) || 0,
          carbs: Number(obj.carbs ?? 0) || 0,
          fat: Number(obj.fat ?? 0) || 0,
        };
      }
      const obj = JSON.parse(s) as Record<string, unknown>;
      return {
        name: typeof obj.name === "string" ? obj.name : "Unknown Food",
        calories: Number(obj.calories ?? 0) || 0,
        protein: Number(obj.protein ?? 0) || 0,
        carbs: Number(obj.carbs ?? 0) || 0,
        fat: Number(obj.fat ?? 0) || 0,
      };
    } catch (e) {
      console.log("FoodCamera: safeParseNutrition failed", e);
      return null;
    }
  };

  const analyzeFood = async (base64Image: string) => {
    if (!base64Image) {
      Alert.alert("No image", "Please provide a valid image to analyze");
      return;
    }
    setIsAnalyzing(true);
    setResult(null);
    try {
      console.log("FoodCamera: analyzing image length", base64Image.length);
      const response = await fetch("https://toolkit.rork.com/text/llm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a nutrition expert. Analyze the food in the image and provide: name (short description), calories (number), protein (grams), carbs (grams), fat (grams). Return ONLY a JSON object with these fields, no other text.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "What food is this and what are its nutritional values?" },
                { type: "image", image: base64Image },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const txt = await response.text();
        console.error("FoodCamera: LLM request failed", response.status, txt);
        throw new Error(`LLM request failed: ${response.status}`);
      }
      const data = (await response.json()) as { completion?: string };
      console.log("FoodCamera: llm raw response", data);
      const safe = safeParseNutrition(data.completion ?? "");
      if (!safe) {
        console.error("FoodCamera: Could not parse nutrition JSON", data.completion);
        throw new Error("Invalid AI response");
      }
      setResult(safe);
    } catch (error) {
      console.error("FoodCamera: Error analyzing food", error);
      Alert.alert("Error", "Failed to analyze food. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!result || !image) {
      Alert.alert("No result", "Analyze a photo before saving");
      return;
    }
    try {
      const mealType = new Date().getHours() < 12 ? "Breakfast" : new Date().getHours() < 17 ? "Lunch" : "Dinner";
      await addMeal({
        name: result.name,
        type: mealType,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        image,
        date: new Date().toISOString(),
      });
      Alert.alert("Meal logged", `${result.name} — ${result.calories} cal`, [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      console.error("FoodCamera: Error saving meal", e);
      Alert.alert("Error", "Could not save meal. Please try again.");
    }
  };

  const Macro = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
    <View style={styles.macroItem}>
      <View accessible accessibilityRole="image">{icon as React.ReactElement}</View>
      <Text style={styles.macroText}>{value}g {label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="closeScanner" style={styles.closeButton} onPress={() => router.back()}>
          <X size={28} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan Your Meal</Text>
      </View>

      <View style={styles.content}>
        {image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} />
            {isAnalyzing && (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
                <Text style={styles.analyzingText}>Analyzing meal...</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Camera size={64} color="#C7C7CC" />
            <Text style={styles.placeholderText}>Take or upload a photo of your meal</Text>
          </View>
        )}

        {result && !isAnalyzing && (
          <View style={styles.resultCard} testID="nutritionResult">
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>{result.name}</Text>
              <View style={styles.caloriePill}>
                <Flame size={18} color="#FF6B35" />
                <Text style={styles.calorieText}>{result.calories} cal</Text>
              </View>
            </View>
            <View style={styles.macroRow}>
              <Macro label="protein" value={result.protein} icon={<Drumstick size={18} color="#8E8E93" />} />
              <Macro label="carbs" value={result.carbs} icon={<Croissant size={18} color="#8E8E93" />} />
              <Macro label="fat" value={result.fat} icon={<Salad size={18} color="#8E8E93" />} />
            </View>
          </View>
        )}

        <View style={styles.actions}>
          {!result && (
            <>
              <TouchableOpacity testID="takePhoto" style={styles.actionButton} onPress={takePhoto} disabled={isAnalyzing}>
                <Camera size={24} color="#007AFF" />
                <Text style={styles.actionText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity testID="uploadPhoto" style={styles.actionButton} onPress={pickImage} disabled={isAnalyzing}>
                <Upload size={24} color="#007AFF" />
                <Text style={styles.actionText}>Upload Photo</Text>
              </TouchableOpacity>
            </>
          )}

          {result && (
            <>
              <TouchableOpacity
                testID="saveMeal"
                style={[styles.actionButton, styles.primaryAction]}
                onPress={() => {
                  if (hasUsedFree && requireSubscription()) return;
                  void handleSave();
                }}
                disabled={isAnalyzing}
              >
                {hasUsedFree ? <Lock size={24} color="#FFF" /> : <Flame size={24} color="#FFF" />}
                <Text style={styles.primaryText}>{hasUsedFree ? "Unlock to Save" : "Save to Log"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="retake"
                style={styles.actionButton}
                onPress={() => {
                  setResult(null);
                  setImage(null);
                }}
                disabled={isAnalyzing}
              >
                <Camera size={24} color="#007AFF" />
                <Text style={styles.actionText}>Retake</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  closeButton: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  title: { flex: 1, fontSize: 20, fontWeight: "600", color: "#1C1C1E", textAlign: "center", marginRight: 44 },
  content: { flex: 1, padding: 24 },
  imageContainer: { flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: "#FFF", marginBottom: 24 },
  image: { width: "100%", height: "100%" },
  analyzingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.7)", justifyContent: "center", alignItems: "center" },
  analyzingText: { color: "#FFF", fontSize: 16, marginTop: 16 },
  placeholder: { flex: 1, backgroundColor: "#FFF", borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 24 },
  placeholderText: { fontSize: 16, color: "#8E8E93", marginTop: 16, textAlign: "center", paddingHorizontal: 32 },
  actions: { flexDirection: "row", gap: 16 },
  actionButton: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: { fontSize: 16, fontWeight: "500", color: "#007AFF" },
  resultCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  resultTitle: { fontSize: 18, fontWeight: "700", color: "#1C1C1E" },
  caloriePill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF5F0", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  calorieText: { color: "#FF6B35", fontSize: 14, fontWeight: "700" },
  macroRow: { flexDirection: "row", justifyContent: "space-between" },
  macroItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  macroText: { fontSize: 14, color: "#8E8E93" },
  primaryAction: { backgroundColor: "#007AFF" },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});