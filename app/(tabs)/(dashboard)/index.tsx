import React, { useMemo, useEffect, useState } from "react";
import { useNotifications } from "@/contexts/NotificationsContext";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { TrendingUp, Calendar, Target, Award, Camera as CameraIcon, Utensils, Activity } from "lucide-react-native";
import { useUser } from "@/contexts/UserContext";
import { useRuns } from "@/contexts/RunContext";
import { useNutrition } from "@/contexts/NutritionContext";
import { router } from "expo-router";
import { getActiveRunState } from "@/services/backgroundLocation";

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
  const { user } = useUser();
  const { pending } = useNotifications();
  const { runs } = useRuns();
  const { meals } = useNutrition();
  const [banner, setBanner] = useState<{ distance: string; elapsed: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const st = await getActiveRunState();
        if (st && (st.isRunning || st.elapsedSec > 0)) {
          const mins = Math.floor(st.elapsedSec / 60);
          const secs = st.elapsedSec % 60;
          setBanner({ distance: (st.totalDistanceMi ?? 0).toFixed(2), elapsed: `${mins}:${secs.toString().padStart(2,'0')}` });
        } else {
          setBanner(null);
        }
      } catch {
        setBanner(null);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weekRuns = runs.filter(r => new Date(r.date) >= weekAgo);
    const monthRuns = runs.filter(r => new Date(r.date) >= monthAgo);

    const weekDistance = weekRuns.reduce((sum, r) => sum + r.distance, 0);
    const monthDistance = monthRuns.reduce((sum, r) => sum + r.distance, 0);
    const weekCalories = meals.filter(m => new Date(m.date) >= weekAgo)
      .reduce((sum, m) => sum + m.calories, 0);

    return {
      weekDistance: weekDistance.toFixed(1),
      monthDistance: monthDistance.toFixed(1),
      weekRuns: weekRuns.length,
      monthRuns: monthRuns.length,
      weekCalories: Math.round(weekCalories),
      totalRuns: runs.length,
    };
  }, [runs, meals]);

  const goToScan = () => {
    router.push("/food-camera" as any);
  };

  const goToNutrition = () => {
    router.push("/(tabs)/(nutrition)" as any);
  };

  const resumeRun = () => {
    router.push('/active-run' as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {(banner || pending.length > 0) && (
          <TouchableOpacity testID="resumeRunBanner" onPress={resumeRun} activeOpacity={0.9} style={styles.bannerWrapper}>
            {/* testId for notifications banner */}

            <LinearGradient colors={["#1E3A8A", "#1D4ED8"]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.banner}>
              <Activity size={18} color="#FFF" />
              <Text style={styles.bannerText}>{banner ? `Run in progress • ${banner.distance} mi • ${banner.elapsed}` : `${pending[0]?.title ?? ''} • ${pending[0]?.message ?? ''}`}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        <LinearGradient
          colors={["#007AFF", "#0051D5"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.greeting}>Welcome back, {user.name}!</Text>
          <Text style={styles.subtitle}>Let&apos;s crush your goals today</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              testID="quickScanFood"
              style={[styles.quickButton, { backgroundColor: "#34C759" }]}
              onPress={goToScan}
              activeOpacity={0.85}
            >
              <CameraIcon size={18} color="#FFF" />
              <Text style={styles.quickText}>Scan Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="quickNutrition"
              style={[styles.quickButton, { backgroundColor: "#FF6B35" }]}
              onPress={goToNutrition}
              activeOpacity={0.85}
            >
              <Utensils size={18} color="#FFF" />
              <Text style={styles.quickText}>Nutrition</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="quickReminders"
              style={[styles.quickButton, { backgroundColor: "#6D28D9" }]}
              onPress={() => router.push('/(tabs)/(dashboard)/notifications' as any)}
              activeOpacity={0.85}
            >
              <Calendar size={18} color="#FFF" />
              <Text style={styles.quickText}>Reminders</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
            <LinearGradient
              colors={["#FF6B35", "#FF8E53"]}
              style={styles.statGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <TrendingUp size={24} color="#FFF" />
              <Text style={styles.statValue}>{stats.weekDistance} mi</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
            <LinearGradient
              colors={["#34C759", "#30D158"]}
              style={styles.statGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Calendar size={24} color="#FFF" />
              <Text style={styles.statValue}>{stats.monthDistance} mi</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
            <LinearGradient
              colors={["#5856D6", "#7C7AFF"]}
              style={styles.statGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Target size={24} color="#FFF" />
              <Text style={styles.statValue}>{stats.weekRuns}</Text>
              <Text style={styles.statLabel}>Runs This Week</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
            <LinearGradient
              colors={["#FF3B30", "#FF6961"]}
              style={styles.statGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Award size={24} color="#FFF" />
              <Text style={styles.statValue}>{stats.totalRuns}</Text>
              <Text style={styles.statLabel}>Total Runs</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {runs.slice(0, 3).map((run) => (
            <View key={run.id} style={styles.activityCard}>
              <View style={styles.activityLeft}>
                <Text style={styles.activityDistance}>{run.distance.toFixed(1)} mi</Text>
                <Text style={styles.activityDate}>
                  {new Date(run.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.activityRight}>
                <Text style={styles.activityPace}>{`${(run.pace ?? "").toString().replace(/[^0-9:\.]/g, "")} min/mi`}</Text>
                <Text style={styles.activityDuration}>{run.duration}</Text>
              </View>
            </View>
          ))}
          {runs.length === 0 && (
            <Text style={styles.emptyText}>No runs yet. Start your first run!</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Goals</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>Distance Goal</Text>
              <Text style={styles.goalProgress}>
                {stats.weekDistance} / {user.weeklyGoal} mi
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${Math.min((parseFloat(stats.weekDistance) / user.weeklyGoal) * 100, 100)}%` }
                ]} 
              />
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
  bannerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bannerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    padding: 24,
    paddingTop: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#FFF",
    opacity: 0.9,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
    justifyContent: "flex-start",
  },
  quickButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  quickText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2,
    height: 120,
  },
  statGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-between",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
  },
  statLabel: {
    fontSize: 14,
    color: "#FFF",
    opacity: 0.9,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  activityCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityLeft: {
    flex: 1,
  },
  activityDistance: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  activityDate: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
  },
  activityRight: {
    alignItems: "flex-end",
  },
  activityPace: {
    fontSize: 16,
    fontWeight: "500",
    color: "#007AFF",
  },
  activityDuration: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
  },
  emptyText: {
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 16,
    marginVertical: 24,
  },
  goalCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  goalProgress: {
    fontSize: 16,
    fontWeight: "500",
    color: "#007AFF",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F2F2F7",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#34C759",
    borderRadius: 4,
  },
});