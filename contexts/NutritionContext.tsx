import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePaywall } from "@/contexts/PaywallContext";

interface Meal {
  id: string;
  name: string;
  type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
  date: string;
}

export type GoalType = "lose" | "maintain" | "gain";
export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very" | "extra";

export interface NutritionProfile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: GoalType;
  desiredGainLbs?: number;
  desiredLossLbs?: number;
}

export interface NutritionGoals {
  calories: number;
  protein: number; // grams
  fat: number; // grams
  carbs: number; // grams
}

interface NutritionContextValue {
  meals: Meal[];
  addMeal: (mealData: Omit<Meal, "id">) => Promise<void>;
  getMealsForDate: (date: Date) => Meal[];
  getTotalsForDate: (date: Date) => { calories: number; protein: number; fat: number; carbs: number };
  todayCalories: number;
  todayProtein: number;
  todayFat: number;
  goals: NutritionGoals | null;
  profile: NutritionProfile | null;
  setGoals: (g: NutritionGoals) => Promise<void>;
  setGoalsFromProfile: (p: NutritionProfile) => Promise<void>;
}

const GOALS_KEY = "nutritionGoals";
const PROFILE_KEY = "nutritionProfile";

export const [NutritionProvider, useNutrition] = createContextHook<NutritionContextValue>(() => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [goals, setGoalsState] = useState<NutritionGoals | null>(null);
  const [profile, setProfileState] = useState<NutritionProfile | null>(null);
  const { markFoodScannedIfFirst } = usePaywall();

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    try {
      console.log("NutritionContext: initializing and loading meals + goals");
      const [storedMeals, storedGoals, storedProfile] = await Promise.all([
        AsyncStorage.getItem("meals"),
        AsyncStorage.getItem(GOALS_KEY),
        AsyncStorage.getItem(PROFILE_KEY),
      ]);
      if (storedMeals) {
        const parsedMeals: Meal[] = JSON.parse(storedMeals ?? "[]");
        console.log("NutritionContext: loaded meals count", parsedMeals.length);
        setMeals(parsedMeals);
      }
      if (storedGoals) {
        const parsedGoals: NutritionGoals = JSON.parse(storedGoals);
        setGoalsState(parsedGoals);
      }
      if (storedProfile) {
        const parsedProfile: NutritionProfile = JSON.parse(storedProfile);
        setProfileState(parsedProfile);
      }
    } catch (error) {
      console.error("NutritionContext: Error loading initial state:", error);
    }
  };

  useEffect(() => {
    const scheduleMidnightTick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const ms = next.getTime() - now.getTime();
      console.log("NutritionContext: scheduling midnight tick in ms", ms);
      const t = setTimeout(() => {
        console.log("NutritionContext: midnight tick fired");
        setNowTick(Date.now());
        scheduleMidnightTick();
      }, ms);
      return t as unknown as number;
    };
    const t = scheduleMidnightTick();
    return () => clearTimeout(t);
  }, []);

  const addMeal = useCallback(async (mealData: Omit<Meal, "id">) => {
    const newMeal: Meal = {
      ...mealData,
      id: Date.now().toString(),
    };
    const updated = [newMeal, ...meals];
    setMeals(updated);
    try {
      await AsyncStorage.setItem("meals", JSON.stringify(updated));
      await markFoodScannedIfFirst();
      console.log("NutritionContext: meal added", newMeal.id);
    } catch (error) {
      console.error("NutritionContext: Error saving meal:", error);
    }
  }, [meals, markFoodScannedIfFirst]);

  const dateKey = (d: string | Date) => (typeof d === "string" ? new Date(d) : d).toDateString();

  const mealsByDate = useMemo(() => {
    const map = new Map<string, Meal[]>();
    for (const m of meals) {
      const key = dateKey(m.date);
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return map;
  }, [meals]);

  const getMealsForDate = useCallback((date: Date): Meal[] => {
    const key = dateKey(date);
    const list = mealsByDate.get(key) ?? [];
    return list.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mealsByDate]);

  const getTotalsForDate = useCallback((date: Date) => {
    const list = getMealsForDate(date);
    const totals = list.reduce(
      (acc, m) => {
        acc.calories += m.calories ?? 0;
        acc.protein += m.protein ?? 0;
        acc.fat += m.fat ?? 0;
        acc.carbs += m.carbs ?? 0;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );
    return totals;
  }, [getMealsForDate]);

  const todayCalories = useMemo(() => {
    void nowTick;
    const today = new Date();
    return getTotalsForDate(today).calories;
  }, [meals, nowTick, getTotalsForDate]);

  const todayProtein = useMemo(() => {
    void nowTick;
    const today = new Date();
    return getTotalsForDate(today).protein;
  }, [meals, nowTick, getTotalsForDate]);

  const todayFat = useMemo(() => {
    void nowTick;
    const today = new Date();
    return getTotalsForDate(today).fat;
  }, [meals, nowTick, getTotalsForDate]);

  const setGoals = useCallback(async (g: NutritionGoals) => {
    try {
      setGoalsState(g);
      await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(g));
      console.log("NutritionContext: goals saved");
    } catch (e) {
      console.error("NutritionContext: failed to save goals", e);
    }
  }, []);

  const setGoalsFromProfile = useCallback(async (p: NutritionProfile) => {
    try {
      const computed = computeGoalsFromProfile(p);
      setProfileState(p);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      await setGoals(computed);
    } catch (e) {
      console.error("NutritionContext: failed to set goals from profile", e);
    }
  }, [setGoals]);

  const value: NutritionContextValue = useMemo(() => ({
    meals,
    addMeal,
    todayCalories,
    todayProtein,
    todayFat,
    getMealsForDate,
    getTotalsForDate,
    goals,
    profile,
    setGoals,
    setGoalsFromProfile,
  }), [meals, addMeal, todayCalories, todayProtein, todayFat, getMealsForDate, getTotalsForDate, goals, profile, setGoals, setGoalsFromProfile]);

  return value;
});

export function computeGoalsFromProfile(p: NutritionProfile): NutritionGoals {
  const activityMult: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    extra: 1.9,
  };
  const bmr = p.sex === "male"
    ? 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + 5
    : 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age - 161;
  let tdee = bmr * activityMult[p.activity];

  const baseAdj: Record<GoalType, number> = { lose: -0.15, maintain: 0, gain: 0.15 };
  let adj = baseAdj[p.goal];
  if (p.goal === "gain" && typeof p.desiredGainLbs === "number" && !Number.isNaN(p.desiredGainLbs)) {
    const gain = Math.max(0, Math.min(30, p.desiredGainLbs));
    const intensity = gain <= 5 ? 0.12 : gain <= 10 ? 0.15 : 0.18;
    adj = intensity;
  }
  if (p.goal === "lose" && typeof p.desiredLossLbs === "number" && !Number.isNaN(p.desiredLossLbs)) {
    const loss = Math.max(0, Math.min(50, p.desiredLossLbs));
    const deficit = loss <= 5 ? -0.12 : loss <= 15 ? -0.17 : -0.22;
    adj = deficit;
  }
  tdee = tdee * (1 + adj);
  const calories = Math.round(tdee);

  const proteinPerKg: Record<GoalType, number> = { lose: 2.0, maintain: 1.6, gain: 1.8 };
  const protein = Math.round(p.weightKg * proteinPerKg[p.goal]);

  const fatPerKg = 0.9;
  const fat = Math.round(p.weightKg * fatPerKg);

  const proteinCals = protein * 4;
  const fatCals = fat * 9;
  const remainingCals = Math.max(0, calories - proteinCals - fatCals);
  const carbs = Math.round(remainingCals / 4);

  return { calories, protein, fat, carbs };
}
