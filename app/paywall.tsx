import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Crown, Lock, RefreshCcw, Info, Settings2 } from "lucide-react-native";
import { usePaywall } from "@/contexts/PaywallContext";
import { purchases, openManageSubscriptions } from "@/services/purchases";

export default function PaywallScreen() {
  const { setSubscribed } = usePaywall();
  const [loading, setLoading] = useState<boolean>(false);

  const provider = purchases.getProvider();
  const supported = purchases.isSupportedOnCurrentPlatform();
  const providerLabel = useMemo(() => (provider === 'revenuecat' ? 'Apple In‑App Purchases' : 'Stripe Checkout'), [provider]);

  const handleSubscribe = useCallback(async () => {
    try {
      setLoading(true);
      const res = await purchases.purchase();
      console.log('Paywall: purchase result', res);
      if (res.active) {
        await setSubscribed(true);
        Alert.alert('Subscription active', "You're all set. Enjoy unlimited runs!");
      } else if (res.error) {
        Alert.alert('Purchase failed', res.error);
      }
    } catch (e) {
      console.log('Paywall: subscribe flow error', e);
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [setSubscribed]);

  const handleRestore = useCallback(async () => {
    try {
      setLoading(true);
      const res = await purchases.restore();
      if (res.active) {
        await setSubscribed(true);
        Alert.alert('Restored', 'Your subscription has been restored.');
      } else if (res.error) {
        Alert.alert('Restore failed', res.error);
      }
    } catch (e) {
      console.log('Paywall: restore error', e);
      Alert.alert('Restore failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [setSubscribed]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#0ea5e9", "#2563eb"]} style={styles.header} start={{x:0,y:0}} end={{x:1,y:1}}>
        <View style={styles.crownCircle}>
          <Crown size={36} color="#fff" />
        </View>
        <Text style={styles.title}>Unlock AthliAI Pro</Text>
        <Text style={styles.subtitle}>Unlimited runs. Food logging stays free.</Text>
        <View style={styles.pricePill}>
          <Text style={styles.price}>$14.99</Text>
          <Text style={styles.perYear}>/year</Text>
        </View>
      </LinearGradient>

      <View style={styles.features}>
        <Feature text="Food logging is always free" />
        <Feature text="Unlimited run tracking after upgrade" />
        <Feature text="Smart insights and goals" />
        <Feature text="Priority support" />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          testID="subscribe"
          style={[styles.primary, (!supported) ? styles.primaryDisabled : null]}
          activeOpacity={0.9}
          onPress={handleSubscribe}
          disabled={loading || !supported}
        >
          <Lock size={20} color="#fff" />
          <Text style={styles.primaryText}>
            {loading ? `Connecting to ${providerLabel}…` : supported ? "Subscribe • $14.99/year" : "Subscriptions unavailable on this build"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity testID="restore" style={styles.secondary} activeOpacity={0.9} onPress={handleRestore} disabled={loading || !supported}>
          <RefreshCcw size={18} color="#111827" />
          <Text style={styles.secondaryText}>Restore Purchases</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="manage-subscription" style={styles.tertiary} activeOpacity={0.9} onPress={openManageSubscriptions}>
          <Settings2 size={18} color="#2563EB" />
          <Text style={styles.tertiaryText}>Manage Subscription</Text>
        </TouchableOpacity>
        {!supported && (
          <View style={styles.notice}>
            <Info size={16} color="#6B7280" />
            <Text style={styles.noticeText}>
              Subscriptions require Apple In‑App Purchases. This TestFlight/Expo build disables purchases.
            </Text>
          </View>
        )}
        <Text style={styles.fine}>Your first run is free. Food logging has no limit.</Text>
        <View style={styles.legalRow}>
          <TouchableOpacity testID="terms" onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
            <Text style={styles.link}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.dot}> • </Text>
          <TouchableOpacity testID="privacy" onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://www.apple.com/legal/privacy/en-ww/')}>
            <Text style={styles.link}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Check size={18} color="#10B981" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  header: { padding: 24, alignItems: "center", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  crownCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 14, color: "#e5e7eb", marginTop: 6, textAlign: "center" },
  pricePill: { flexDirection: "row", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: 12 },
  price: { color: "#fff", fontSize: 18, fontWeight: "800" },
  perYear: { color: "#fff", fontSize: 14, opacity: 0.9 },
  features: { padding: 20, gap: 12 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", padding: 14, borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  featureText: { fontSize: 15, color: "#1C1C1E" },
  actions: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#111827", paddingVertical: 14, borderRadius: 14, gap: 10 },
  primaryDisabled: { backgroundColor: '#4B5563' },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 12, borderRadius: 12, gap: 8, borderColor: '#E5E7EB', borderWidth: 1 },
  secondaryText: { color: '#111827', fontSize: 15, fontWeight: '600' },
  tertiary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', paddingVertical: 10, borderRadius: 12, gap: 8, borderColor: '#DBEAFE', borderWidth: 1 },
  tertiaryText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  fine: { textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 6 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 6 },
  noticeText: { color: '#6B7280', fontSize: 12, textAlign: 'center' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  link: { color: '#2563EB', fontSize: 12, fontWeight: '600' },
  dot: { color: '#9CA3AF', fontSize: 12 },
});
