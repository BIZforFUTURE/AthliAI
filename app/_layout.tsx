import { BundleInspector } from '../.rorkai/inspector';
import { RorkErrorBoundary } from '../.rorkai/rork-error-boundary';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform, View } from "react-native";
import { UserProvider } from "@/contexts/UserContext";
import { RunProvider } from "@/contexts/RunContext";
import { NutritionProvider } from "@/contexts/NutritionContext";
import { GroupProvider } from "@/contexts/GroupContext";
import { CoachProvider } from "@/contexts/CoachContext";
import { getActiveRunState } from "@/services/backgroundLocation";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { trpc, trpcClient } from "@/lib/trpc";
import { PaywallProvider } from "@/contexts/PaywallContext";
import { registerBackgroundFetchAsync, runSyncAndCleanup } from "@/services/backgroundFetch";
import ErrorBoundary from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="active-run" 
        options={{ 
          presentation: "modal",
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="food-camera" 
        options={{ 
          presentation: "modal",
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="profile" 
        options={{ 
          title: "Profile",
        }} 
      />
      <Stack.Screen 
        name="login" 
        options={{ 
          title: "Log In",
          presentation: "modal",
        }} 
      />
      <Stack.Screen 
        name="paywall" 
        options={{ 
          title: "Upgrade",
          presentation: "modal",
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') return;
        const st = await getActiveRunState();
        if (st && (st.isRunning || st.elapsedSec > 0)) {
          if (!router.canGoBack()) {
            router.push('/active-run' as any);
          }
        }
      } catch (e) {
        console.log('auto-resume check error', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await registerBackgroundFetchAsync();
        console.log('registerBackgroundFetchAsync result', res);
        await runSyncAndCleanup();
      } catch (e) {
        console.log('registerBackgroundFetchAsync error', e);
      }
    })();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ErrorBoundary>
            <UserProvider>
              <PaywallProvider>
                <RunProvider>
                  <NutritionProvider>
                    <GroupProvider>
                      <CoachProvider>
                        <NotificationsProvider>
                          <BundleInspector><RorkErrorBoundary><RootLayoutNav /></RorkErrorBoundary></BundleInspector>
                        </NotificationsProvider>
                      </CoachProvider>
                    </GroupProvider>
                  </NutritionProvider>
                </RunProvider>
              </PaywallProvider>
            </UserProvider>
          </ErrorBoundary>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}