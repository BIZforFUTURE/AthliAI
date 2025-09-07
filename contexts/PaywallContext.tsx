import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PaywallState {
  hasCompletedFirstRun: boolean;
  hasScannedFirstFood: boolean;
  isSubscribed: boolean;
}

interface PaywallContextValue extends PaywallState {
  hasUsedFree: boolean;
  markRunCompletedIfFirst: () => Promise<void>;
  markFoodScannedIfFirst: () => Promise<void>;
  requireSubscription: () => boolean;
  setSubscribed: (v: boolean) => Promise<void>;
}

const STORAGE_KEY = "athliai.paywall.v1" as const;

export const [PaywallProvider, usePaywall] = createContextHook<PaywallContextValue>(() => {
  const [state, setState] = useState<PaywallState>({
    hasCompletedFirstRun: false,
    hasScannedFirstFood: false,
    isSubscribed: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<PaywallState>;
          setState(prev => ({
            hasCompletedFirstRun: Boolean(parsed.hasCompletedFirstRun ?? prev.hasCompletedFirstRun),
            hasScannedFirstFood: Boolean(parsed.hasScannedFirstFood ?? prev.hasScannedFirstFood),
            isSubscribed: true,
          }));
        }
      } catch (e) {
        console.log("Paywall: load error", e);
      }
    })();
  }, []);

  const persist = useCallback(async (next: PaywallState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.log("Paywall: persist error", e);
    }
  }, []);

  const markRunCompletedIfFirst = useCallback(async () => {
    setState(prev => {
      if (prev.hasCompletedFirstRun) return prev as PaywallState;
      const next: PaywallState = { ...prev, hasCompletedFirstRun: true };
      void persist(next);
      return next;
    });
  }, [persist]);

  const markFoodScannedIfFirst = useCallback(async () => {
    setState(prev => {
      if (prev.hasScannedFirstFood) return prev as PaywallState;
      const next: PaywallState = { ...prev, hasScannedFirstFood: true };
      void persist(next);
      return next;
    });
  }, [persist]);

  const setSubscribed = useCallback(async (v: boolean) => {
    setState(prev => {
      const next: PaywallState = { ...prev, isSubscribed: v };
      void persist(next);
      return next;
    });
  }, [persist]);

  const hasUsedFree = Boolean(state.hasCompletedFirstRun);

  const requireSubscription = useCallback((): boolean => {
    return false;
  }, []);

  const value: PaywallContextValue = useMemo(() => ({
    hasCompletedFirstRun: state.hasCompletedFirstRun,
    hasScannedFirstFood: state.hasScannedFirstFood,
    isSubscribed: state.isSubscribed,
    hasUsedFree,
    markRunCompletedIfFirst,
    markFoodScannedIfFirst,
    requireSubscription,
    setSubscribed,
  }), [state, hasUsedFree, markRunCompletedIfFirst, markFoodScannedIfFirst, requireSubscription, setSubscribed]);

  return value;
});
