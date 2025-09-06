import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { trpcClient } from '@/lib/trpc';

export type PurchaseProvider = 'stripe' | 'revenuecat';

export interface PurchaseResult {
  active: boolean;
  error?: string;
}

export interface PurchasesAdapter {
  getProvider(): PurchaseProvider;
  isSupportedOnCurrentPlatform(): boolean;
  purchase(): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
}

const getProviderFromEnv = (): PurchaseProvider => {
  const p = (process.env.EXPO_PUBLIC_PURCHASE_PROVIDER ?? 'stripe').toLowerCase();
  if (Platform.OS === 'ios') return 'revenuecat';
  return (p === 'revenuecat' ? 'revenuecat' : 'stripe');
};

export async function openManageSubscriptions(): Promise<void> {
  try {
    const iosDeepLink = 'itms-apps://apps.apple.com/account/subscriptions';
    const webLink = 'https://apps.apple.com/account/subscriptions';
    const url = Platform.OS === 'ios' ? iosDeepLink : webLink;
    await Linking.openURL(url);
  } catch (e) {
    console.log('openManageSubscriptions error', e);
  }
}

class StripeAdapter implements PurchasesAdapter {
  getProvider(): PurchaseProvider { return 'stripe'; }
  isSupportedOnCurrentPlatform(): boolean { return true; }

  async purchase(): Promise<PurchaseResult> {
    try {
      if (Platform.OS === 'ios') {
        return { active: false, error: 'In-app purchases on iOS must use Apple IAP. Switch provider to RevenueCat.' };
      }
      const priceId = process.env.EXPO_PUBLIC_PRICE_YEARLY_USD_1499_ID ?? '';
      if (!priceId) {
        return { active: false, error: 'Missing EXPO_PUBLIC_PRICE_YEARLY_USD_1499_ID' };
      }
      const redirectUri = Linking.createURL('/paywall');
      const successUrl = `${redirectUri}?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${redirectUri}?c=1`;

      const session = await trpcClient.stripe.createCheckout.mutate({ priceId, successUrl, cancelUrl });
      if (!session?.url) return { active: false, error: 'No checkout URL returned' };

      if (Platform.OS === 'web') {
        window.location.href = session.url as string;
        return { active: false };
      }

      const result = await WebBrowser.openAuthSessionAsync(session.url as string, redirectUri);

      let sessionId: string | null = null;
      if (result?.type === 'success' && result.url) {
        try {
          const url = new URL(result.url);
          sessionId = url.searchParams.get('session_id');
        } catch (e) {
          console.log('StripeAdapter: parse url error', e);
        }
      }

      if (!sessionId) return { active: false, error: 'Checkout cancelled' };

      const verify = await trpcClient.stripe.verify.query({ sessionId });
      return { active: Boolean(verify?.active) };
    } catch (e: any) {
      console.log('StripeAdapter: purchase error', e);
      return { active: false, error: e?.message ?? 'Unknown error' };
    }
  }

  async restore(): Promise<PurchaseResult> {
    return { active: false, error: 'Restore not supported with Stripe Checkout' };
  }
}

class RevenueCatAdapter implements PurchasesAdapter {
  getProvider(): PurchaseProvider { return 'revenuecat'; }
  isSupportedOnCurrentPlatform(): boolean {
    // react-native-purchases is a native module and not available in Expo Go.
    return Platform.OS !== 'web' && process.env.APP_VARIANT === 'standalone';
  }

  async purchase(): Promise<PurchaseResult> {
    console.log('RevenueCatAdapter: placeholder - implement with react-native-purchases in a standalone build');
    return { active: false, error: 'RevenueCat not available in Expo Go. Build a standalone app.' };
  }

  async restore(): Promise<PurchaseResult> {
    console.log('RevenueCatAdapter: placeholder restore');
    return { active: false, error: 'RevenueCat not available in Expo Go. Build a standalone app.' };
  }
}

export const purchases: PurchasesAdapter = (() => {
  const provider = getProviderFromEnv();
  if (provider === 'revenuecat') return new RevenueCatAdapter();
  return new StripeAdapter();
})();
