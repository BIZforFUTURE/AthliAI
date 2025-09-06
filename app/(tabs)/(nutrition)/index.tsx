import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera, Flame, Egg, Droplet, ChevronLeft, ChevronRight, Calendar, Target, Plus, Activity as ActivityIcon, Timer } from "lucide-react-native";
import { router } from "expo-router";
import { useNutrition } from "@/contexts/NutritionContext";
import { analyzeFoodText, analyzeActivityText } from "@/services/ai";

function formatDateLabel(date: Date) {
  const today = new Date();
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round(((value ?? 0) / Math.max(1, max ?? 1)) * 100));
  return (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export default function NutritionScreen() {
  const { getMealsForDate, getTotalsForDate, goals, addMeal } = useNutrition();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [query, setQuery] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activityQuery, setActivityQuery] = useState<string>("");
  const [isBurnAnalyzing, setIsBurnAnalyzing] = useState<boolean>(false);

  const totals = useMemo(() => getTotalsForDate(selectedDate), [getTotalsForDate, selectedDate]);
  const mealsForDay = useMemo(() => getMealsForDate(selectedDate), [getMealsForDate, selectedDate]);

  const openFoodCamera = useCallback(() => {
    router.push("/food-camera" as any);
  }, []);

  const goPrevDay = () => setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  const goNextDay = () => setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  const goToday = () => setSelectedDate(new Date());

  const openGoals = useCallback(() => {
    router.push("/(tabs)/(nutrition)/goals" as any);
  }, []);

  const suggestions: string[] = useMemo(() => {
    const base: string[] = FOOD_SUGGESTIONS;
    const q = query.trim().toLowerCase();
    if (!q) return base.slice(0, 8);
    return base.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  const submitTextMeal = useCallback(async () => {
    const raw = query.trim();
    if (!raw) return;
    try {
      setIsAnalyzing(true);
      const res = await analyzeFoodText(raw);
      await addMeal({
        name: `${res.name} (${res.normalizedPortion})`,
        type: "custom",
        calories: res.calories ?? 0,
        protein: res.protein ?? 0,
        carbs: res.carbs ?? 0,
        fat: res.fat ?? 0,
        date: new Date().toISOString(),
      });
      setQuery("");
      Alert.alert("Logged", "Meal added to today");
    } catch (e) {
      console.error("NutritionScreen: analyze failed", e);
      Alert.alert("Analyze failed", "Could not analyze that item. Please try a different name or be more specific.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [query, addMeal]);

  const submitActivity = useCallback(async () => {
    const raw = activityQuery.trim();
    if (!raw) return;
    try {
      setIsBurnAnalyzing(true);
      const res = await analyzeActivityText(raw);
      await addMeal({
        name: `${res.name} (${res.minutes} min)`,
        type: "activity",
        calories: -(res.caloriesBurned ?? 0),
        protein: 0,
        carbs: 0,
        fat: 0,
        date: new Date().toISOString(),
      });
      setActivityQuery("");
      Alert.alert("Logged", "Activity added. Calories subtracted from your total.");
    } catch (e) {
      console.error("NutritionScreen: activity analyze failed", e);
      Alert.alert("Analyze failed", "Could not understand that activity. Try like '30 min cycling' or '1 hour yoga'.");
    } finally {
      setIsBurnAnalyzing(false);
    }
  }, [activityQuery, addMeal]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.customHeader}>
          <View style={styles.dateNavHeader}>
            <TouchableOpacity testID="prevDay" style={styles.navButton} onPress={goPrevDay}>
              <ChevronLeft size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <View style={styles.dateLabelWrap}>
              <Calendar size={16} color="#8E8E93" />
              <Text style={styles.dateLabel} testID="dateLabel">{formatDateLabel(selectedDate)}</Text>
            </View>
            <TouchableOpacity testID="nextDay" style={styles.navButton} onPress={goNextDay}>
              <ChevronRight size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <TouchableOpacity testID="todayBtn" style={styles.todayBtn} onPress={goToday}>
              <Text style={styles.todayText}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>


        <TouchableOpacity testID="scanMealBtn" activeOpacity={0.9} style={styles.scanCard} onPress={openFoodCamera}>
          <View style={styles.scanIconWrap}>
            <Camera size={22} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scanTitle}>Scan a meal</Text>
            <Text style={styles.scanSubtitle}>Use your camera to capture and log nutrition</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.textEntryCard}>
          <Text style={styles.sectionTitle}>Add by name</Text>
          <View style={styles.inputRow}>
            <TextInput
              testID="foodTextInput"
              style={styles.textInput}
              placeholder="e.g. Chipotle bowl, 1/2 cup rice, homemade salad"
              value={query}
              onChangeText={setQuery}
              returnKeyType={Platform.OS === "ios" ? "done" : "search"}
              onSubmitEditing={submitTextMeal}
              editable={!isAnalyzing}
            />
            <TouchableOpacity testID="submitTextMeal" onPress={submitTextMeal} style={styles.addBtn} disabled={isAnalyzing}>
              <Plus size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
          {suggestions.length > 0 && (
            <View style={styles.suggestionWrap}>
              {suggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  testID={`sugg-${s}`}
                  style={styles.suggestionItem}
                  onPress={() => setQuery(s)}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {isAnalyzing && <Text style={styles.analyzingText}>Analyzing…</Text>}
        </View>

        <TouchableOpacity testID="activityHelperCard" activeOpacity={0.9} style={styles.activityCard} onPress={() => {}}>
          <View style={styles.activityIconWrap}>
            <ActivityIcon size={22} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.activityTitle}>Subtract burned calories</Text>
            <Text style={styles.activitySubtitle}>Type any activity to reduce today's total</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.activityEntryCard}>
          <Text style={styles.sectionTitle}>Add activity</Text>
          <View style={styles.inputRow}>
            <TextInput
              testID="activityTextInput"
              style={styles.textInput}
              placeholder="e.g. 30 min cycling, 1 hour yoga, 3 mile walk"
              value={activityQuery}
              onChangeText={setActivityQuery}
              returnKeyType={Platform.OS === "ios" ? "done" : "search"}
              onSubmitEditing={submitActivity}
              editable={!isBurnAnalyzing}
            />
            <TouchableOpacity testID="submitActivity" onPress={submitActivity} style={styles.activityAddBtn} disabled={isBurnAnalyzing}>
              <Timer size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
          {isBurnAnalyzing && <Text style={styles.analyzingText}>Estimating burn…</Text>}
        </View>

        {(!goals) && (
          <TouchableOpacity testID="setGoalsBanner" onPress={openGoals} activeOpacity={0.9} style={styles.goalsBanner}>
            <View style={styles.goalsIconWrap}>
              <Target size={20} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Set your daily goals</Text>
              <Text style={styles.bannerSubtitle}>Personalize calories, protein and fat based on your plan</Text>
            </View>
          </TouchableOpacity>
        )}

        {goals && (
          <View style={styles.goalsWrap}>
            <Text style={styles.sectionTitle}>Today's Progress</Text>
            <View style={styles.goalItem}>
              <View style={styles.goalLabelRow}>
                <Flame size={18} color="#FF6B35" />
                <Text style={styles.goalLabel}>Net Calories</Text>
                <Text style={styles.goalValue}>{totals.calories}/{goals.calories}</Text>
              </View>
              <ProgressBar value={totals.calories} max={goals.calories} color="#FF6B35" />
            </View>
            <View style={styles.goalItem}>
              <View style={styles.goalLabelRow}>
                <Egg size={18} color="#5856D6" />
                <Text style={styles.goalLabel}>Protein</Text>
                <Text style={styles.goalValue}>{totals.protein}g/{goals.protein}g</Text>
              </View>
              <ProgressBar value={totals.protein} max={goals.protein} color="#5856D6" />
            </View>
            <View style={styles.goalItem}>
              <View style={styles.goalLabelRow}>
                <Droplet size={18} color="#34C759" />
                <Text style={styles.goalLabel}>Fat</Text>
                <Text style={styles.goalValue}>{totals.fat}g/{goals.fat}g</Text>
              </View>
              <ProgressBar value={totals.fat} max={goals.fat} color="#34C759" />
            </View>
            <TouchableOpacity testID="editGoalsBtn" onPress={openGoals} style={styles.editGoalsBtn}>
              <Text style={styles.editGoalsText}>Edit goals</Text>
            </TouchableOpacity>
          </View>
        )}



        <View style={styles.mealsSection}>
          <Text style={styles.sectionTitle}>Meals • {formatDateLabel(selectedDate)}</Text>
          {mealsForDay.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              {meal.image && (
                <Image source={{ uri: meal.image }} style={styles.mealImage} />
              )}
              <View style={styles.mealInfo}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealTime}>{meal.type}</Text>
                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionItem}>{meal.calories} cal</Text>
                  <Text style={styles.nutritionItem}>{meal.protein}g protein</Text>
                  <Text style={styles.nutritionItem}>{meal.carbs}g carbs</Text>
                  <Text style={styles.nutritionItem}>{meal.fat}g fat</Text>
                </View>
              </View>
            </View>
          ))}
          {mealsForDay.length === 0 && (
            <Text style={styles.emptyText}>No meals logged</Text>
          )}
        </View>

        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Nutrition Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Pre-Run Fuel</Text>
            <Text style={styles.tipText}>
              Eat a light meal 2-3 hours before running with complex carbs
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Post-Run Recovery</Text>
            <Text style={styles.tipText}>
              Consume protein within 30 minutes after your run for muscle recovery
            </Text>
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
  customHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#F2F2F7",
  },
  dateNavHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textEntryCard: {
    marginHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#0A84FF",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  suggestionItem: {
    backgroundColor: "#EEF5FF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  suggestionText: {
    color: "#0A84FF",
    fontWeight: "700",
    fontSize: 12,
  },
  analyzingText: { marginTop: 8, color: "#8E8E93", fontSize: 12 },
  goalsBanner: {
    marginHorizontal: 24,
    backgroundColor: "#0A84FF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  activityCard: {
    marginHorizontal: 24,
    backgroundColor: "#34C759",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E9E5B",
    alignItems: "center",
    justifyContent: "center",
  },
  activityTitle: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  activitySubtitle: { fontSize: 13, color: "#E6FFEF", marginTop: 2 },
  activityEntryCard: {
    marginHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    marginTop: 8,
  },
  activityAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
  },
  goalsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1B4DFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  bannerSubtitle: {
    fontSize: 13,
    color: "#E6F0FF",
    marginTop: 2,
  },
  goalsWrap: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  goalItem: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  goalLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  goalLabel: { fontSize: 14, color: "#1C1C1E", fontWeight: "600" },
  goalValue: { fontSize: 13, color: "#8E8E93", fontWeight: "600" },
  progressOuter: {
    height: 8,
    borderRadius: 6,
    backgroundColor: "#EFEFF4",
    overflow: "hidden",
  },
  progressInner: {
    height: 8,
    borderRadius: 6,
    backgroundColor: "#007AFF",
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  todayBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  todayText: { color: "#007AFF", fontSize: 14, fontWeight: "600" },
  addMealButton: {
    backgroundColor: "#007AFF",
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 12,
  },
  addMealText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  scanCard: {
    marginHorizontal: 24,
    backgroundColor: "#0A84FF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  scanIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1B4DFF",
    alignItems: "center",
    justifyContent: "center",
  },
  scanTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  scanSubtitle: {
    fontSize: 13,
    color: "#E6F0FF",
    marginTop: 2,
  },
  mealsSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  mealCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mealImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 8,
  },
  nutritionRow: {
    flexDirection: "row",
    gap: 12,
  },
  nutritionItem: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  emptyText: {
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 16,
    marginVertical: 24,
  },
  tipsSection: {
    padding: 24,
    paddingTop: 0,
  },
  tipCard: {
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
  tipTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 20,
  },
  editGoalsBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#EEF5FF",
    borderRadius: 8,
    marginTop: 4,
  },
  editGoalsText: {
    color: "#0A84FF",
    fontWeight: "700",
    fontSize: 13,
  },
});

const FOOD_SUGGESTIONS: string[] = [
  "Grilled chicken breast",
  "Greek yogurt",
  "Oatmeal",
  "Apple",
  "Banana",
  "Avocado toast",
  "Protein shake",
  "Egg white omelette",
  "Turkey sandwich",
  "Quinoa salad",
  "Caesar salad",
  "Sushi roll",
  "Brown rice",
  "Salmon fillet",
  "Tofu stir fry",
  "Burrito bowl",
  "Pasta with marinara",
  "Peanut butter sandwich",
  "Cottage cheese",
  "Blueberries",
];
