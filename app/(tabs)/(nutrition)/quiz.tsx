import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, Alert, ScrollView } from "react-native";
import { useNutrition, computeGoalsFromProfile, GoalType, Sex, ActivityLevel, NutritionProfile } from "@/contexts/NutritionContext";
import { useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";

export default function QuizScreen() {
  const { setGoalsFromProfile, profile } = useNutrition();
  const router = useRouter();

  const [sex, setSex] = useState<Sex>(profile?.sex ?? "male");
  const [age, setAge] = useState<string>(profile?.age ? String(profile.age) : "");
  const initialInchesTotal = typeof profile?.heightCm === "number" && profile?.heightCm > 0 ? Math.round((profile?.heightCm ?? 0) / 2.54) : 0;
  const [heightFt, setHeightFt] = useState<string>(initialInchesTotal ? String(Math.floor(initialInchesTotal / 12)) : "");
  const [heightIn, setHeightIn] = useState<string>(initialInchesTotal ? String(initialInchesTotal % 12) : "");
  const [weightLbs, setWeightLbs] = useState<string>(profile?.weightKg ? String(Math.round((profile?.weightKg ?? 0) * 2.20462)) : "");
  const [activity, setActivity] = useState<ActivityLevel>(profile?.activity ?? "moderate");
  const [goal, setGoal] = useState<GoalType>(profile?.goal ?? "maintain");
  const [desiredGainLbs, setDesiredGainLbs] = useState<string>(profile?.goal === "gain" && (profile as any)?.desiredGainLbs ? String((profile as any).desiredGainLbs) : "");
  const [desiredLossLbs, setDesiredLossLbs] = useState<string>(profile?.goal === "lose" && (profile as any)?.desiredLossLbs ? String((profile as any).desiredLossLbs) : "");

  const save = useCallback(async () => {
    try {
      const ft = Number(heightFt) || 0;
      const inch = Number(heightIn) || 0;
      const inchesTotal = ft * 12 + inch;
      const heightCm = Math.round(inchesTotal * 2.54);
      const weightKg = (Number(weightLbs) || 0) / 2.20462;
      const p: NutritionProfile = {
        sex,
        age: Number(age) || 0,
        heightCm,
        weightKg,
        activity,
        goal,
        desiredGainLbs: goal === "gain" ? (Number(desiredGainLbs) || 0) : undefined,
        desiredLossLbs: goal === "lose" ? (Number(desiredLossLbs) || 0) : undefined,
      };
      await setGoalsFromProfile(p);
      router.replace("/(tabs)/(nutrition)" as any);
    } catch (e) {
      console.error("QuizScreen: failed to save profile", e);
      Alert.alert("Error", "Could not save. Please try again.");
    }
  }, [sex, age, heightFt, heightIn, weightLbs, activity, goal, desiredGainLbs, desiredLossLbs, setGoalsFromProfile, router]);

  const preview = useMemo(() => {
    const ft = Number(heightFt) || 0;
    const inch = Number(heightIn) || 0;
    const inchesTotal = ft * 12 + inch;
    const heightCm = Math.round(inchesTotal * 2.54);
    const weightKg = (Number(weightLbs) || 0) / 2.20462;
    const p: NutritionProfile = {
      sex,
      age: Number(age) || 0,
      heightCm,
      weightKg,
      activity,
      goal,
      desiredGainLbs: goal === "gain" ? (Number(desiredGainLbs) || 0) : undefined,
      desiredLossLbs: goal === "lose" ? (Number(desiredLossLbs) || 0) : undefined,
    };
    return computeGoalsFromProfile(p);
  }, [sex, age, heightFt, heightIn, weightLbs, activity, goal, desiredGainLbs, desiredLossLbs]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.hero}>
        <Sparkles size={20} color="#FFF" />
        <Text style={styles.heroTitle}>Build your plan</Text>
        <Text style={styles.heroSubtitle}>We’ll tailor daily calories, protein and fat to your goals.</Text>
      </View>

      <Text style={styles.sectionTitle}>About you</Text>
      <View style={styles.card}>
        <View style={styles.segmentWrap}>
          <Segment label="Male" selected={sex === "male"} onPress={() => setSex("male")} />
          <Segment label="Female" selected={sex === "female"} onPress={() => setSex("female")} />
        </View>
        <LabelInput testID="ageInput" label="Age" value={age} onChangeText={setAge} placeholder="e.g. 28" />
        <View style={{ gap: 6, marginTop: 8 }}>
          <Text style={styles.label}>Height</Text>
          <View style={styles.rowGap}>
            <TextInput testID="heightFtInput" value={heightFt} onChangeText={setHeightFt} keyboardType={Platform.OS === "web" ? "number-pad" : "numeric"} placeholder="ft" style={[styles.input, styles.inputHalf]} />
            <TextInput testID="heightInInput" value={heightIn} onChangeText={setHeightIn} keyboardType={Platform.OS === "web" ? "number-pad" : "numeric"} placeholder="in" style={[styles.input, styles.inputHalf]} />
          </View>
        </View>
        <LabelInput testID="weightLbsInput" label="Weight (lbs)" value={weightLbs} onChangeText={setWeightLbs} placeholder="e.g. 165" />
      </View>

      <Text style={styles.sectionTitle}>Activity</Text>
      <View style={styles.card}>
        <Segment label="Sedentary" selected={activity === "sedentary"} onPress={() => setActivity("sedentary")} />
        <Segment label="Light" selected={activity === "light"} onPress={() => setActivity("light")} />
        <Segment label="Moderate" selected={activity === "moderate"} onPress={() => setActivity("moderate")} />
        <Segment label="Very" selected={activity === "very"} onPress={() => setActivity("very")} />
        <Segment label="Extra" selected={activity === "extra"} onPress={() => setActivity("extra")} />
      </View>

      <Text style={styles.sectionTitle}>Goal</Text>
      <View style={styles.card}>
        <Segment label="Lose" selected={goal === "lose"} onPress={() => setGoal("lose")} />
        <Segment label="Maintain" selected={goal === "maintain"} onPress={() => setGoal("maintain")} />
        <Segment label="Gain" selected={goal === "gain"} onPress={() => setGoal("gain")} />
        {goal === "gain" ? (
          <LabelInput testID="desiredGainLbsInput" label="How much weight do you want to gain? (lbs)" value={desiredGainLbs} onChangeText={setDesiredGainLbs} placeholder="e.g. 8" />
        ) : null}
        {goal === "lose" ? (
          <LabelInput testID="desiredLossLbsInput" label="How much weight do you want to lose? (lbs)" value={desiredLossLbs} onChangeText={setDesiredLossLbs} placeholder="e.g. 10" />
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Preview</Text>
      <View style={styles.card}>
        <Row label="Calories" value={`${preview.calories}`} />
        <Row label="Protein" value={`${preview.protein} g`} />
        <Row label="Fat" value={`${preview.fat} g`} />
        <Row label="Carbs" value={`${preview.carbs} g`} />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={save} testID="savePlanBtn">
        <Text style={styles.saveText}>Save my plan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.segment, selected ? styles.segmentSelected : undefined]}>
      <Text style={[styles.segmentText, selected ? styles.segmentTextSel : undefined]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function LabelInput({ label, value, onChangeText, placeholder, testID }: { label: string; value: string; onChangeText: (t: string) => void; placeholder: string; testID?: string }) {
  return (
    <View style={{ gap: 6, marginTop: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        keyboardType={Platform.OS === "web" ? "number-pad" : "numeric"}
        placeholder={placeholder}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  hero: { backgroundColor: "#0A84FF", padding: 18, margin: 20, marginBottom: 0, borderRadius: 14, gap: 6 },
  heroTitle: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  heroSubtitle: { color: "#E6F0FF", fontSize: 13 },
  sectionTitle: { marginHorizontal: 20, marginTop: 16, fontSize: 15, color: "#6B7280", fontWeight: "700" },
  card: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginHorizontal: 20, marginTop: 8 },
  segmentWrap: { flexDirection: "row", gap: 8 },
  segment: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "#F3F4F6", borderRadius: 10, alignItems: "center", marginVertical: 4 },
  rowGap: { flexDirection: "row", gap: 8 },
  inputHalf: { flex: 1 },
  segmentSelected: { backgroundColor: "#EEF5FF" },
  segmentText: { color: "#4B5563", fontWeight: "600" },
  segmentTextSel: { color: "#0A84FF" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { color: "#111827", fontWeight: "600" },
  rowValue: { color: "#6B7280", fontWeight: "700" },
  label: { fontSize: 14, color: "#1C1C1E", fontWeight: "600" },
  input: { backgroundColor: "#F2F2F7", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  saveBtn: { margin: 20, backgroundColor: "#111827", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveText: { color: "#FFF", fontWeight: "800" },
});