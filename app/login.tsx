import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Mail, Phone, ArrowRight, X } from "lucide-react-native";
import { useUser } from "@/contexts/UserContext";

export default function LoginScreen() {
  const params = useLocalSearchParams<{ redirectTo?: string }>();
  const redirectTo = useMemo(() => (typeof params.redirectTo === "string" ? params.redirectTo : undefined), [params.redirectTo]);
  const { loginWithEmail, loginWithPhone } = useUser();
  const router = useRouter();

  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  const onSubmit = async () => {
    try {
      if (mode === "email") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          Alert.alert("Invalid email", "Please enter a valid email address");
          return;
        }
        await loginWithEmail(email);
      } else {
        const clean = phone.replace(/\D/g, "");
        if (clean.length < 8) {
          Alert.alert("Invalid phone", "Please enter a valid phone number");
          return;
        }
        await loginWithPhone(clean);
      }
      if (redirectTo) router.replace(redirectTo as any); else router.back();
    } catch (e) {
      Alert.alert("Login failed", "Please try again");
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Close" onPress={() => router.back()} style={styles.closeBtn}>
          <X size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.brand}>AthliAI</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Log in to continue</Text>

        <View style={styles.modeSwitch}>
          <TouchableOpacity testID="modeEmail" style={[styles.modeBtn, mode === "email" && styles.modeBtnActive]} onPress={() => setMode("email")}>
            <Mail size={18} color={mode === "email" ? "#FFF" : "#1C1C1E"} />
            <Text style={[styles.modeText, mode === "email" && styles.modeTextActive]}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="modePhone" style={[styles.modeBtn, mode === "phone" && styles.modeBtnActive]} onPress={() => setMode("phone")}>
            <Phone size={18} color={mode === "phone" ? "#FFF" : "#1C1C1E"} />
            <Text style={[styles.modeText, mode === "phone" && styles.modeTextActive]}>Phone</Text>
          </TouchableOpacity>
        </View>

        {mode === "email" ? (
          <TextInput
            testID="emailInput"
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            inputMode={Platform.OS === "web" ? ("email" as const) : undefined}
            value={email}
            onChangeText={setEmail}
            selectionColor="#007AFF"
            blurOnSubmit={false}
          />
        ) : (
          <TextInput
            testID="phoneInput"
            style={styles.input}
            placeholder="Your phone number"
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={Platform.OS === "ios" || Platform.OS === "android" ? ("phone-pad" as const) : ("default" as const)}
            {...(Platform.OS === "web" ? { inputMode: "tel" as const } : { textContentType: "telephoneNumber" as const, autoComplete: "tel" as const })}
            value={phone}
            onChangeText={setPhone}
            selectionColor="#007AFF"
            blurOnSubmit={false}
          />
        )}

        <TouchableOpacity testID="submitLogin" style={styles.primaryBtn} onPress={onSubmit}>
          <Text style={styles.primaryText}>Continue</Text>
          <ArrowRight size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.terms}>By continuing you agree to our Terms and Privacy Policy.</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7", padding: 24, justifyContent: "center" },
  header: { position: "absolute", top: 54, left: 0, right: 0, alignItems: "center" },
  closeBtn: { position: "absolute", left: 16, top: 0, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 22, fontWeight: "800", color: "#1C1C1E" },
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 20, gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  title: { fontSize: 24, fontWeight: "700", color: "#1C1C1E" },
  subtitle: { fontSize: 14, color: "#8E8E93" },
  modeSwitch: { flexDirection: "row", gap: 8 },
  modeBtn: { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#EFEFF4" },
  modeBtnActive: { backgroundColor: "#007AFF" },
  modeText: { color: "#1C1C1E", fontSize: 14, fontWeight: "600" },
  modeTextActive: { color: "#FFF" },
  input: { borderWidth: 1, borderColor: "#E5E5EA", borderRadius: 12, padding: 14, fontSize: 16, color: "#1C1C1E" },
  primaryBtn: { marginTop: 8, backgroundColor: "#007AFF", paddingVertical: 14, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  terms: { textAlign: "center", color: "#8E8E93", fontSize: 12, marginTop: 12 },
});