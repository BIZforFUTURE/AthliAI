import { publicProcedure } from "@/backend/trpc/create-context";
import { z } from "zod";

// This uses Stripe Checkout via Hosted page. On web: open the returned url.
// On mobile: open in a Custom Tab / SFSafariViewController using expo-web-browser.

export default publicProcedure
  .input(
    z.object({
      priceId: z.string(),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
      customerEmail: z.string().email().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { priceId, successUrl, cancelUrl, customerEmail } = input;

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY env var");
    }

    const stripe = new (await import("stripe")).Stripe(key);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
    });

    return { id: session.id, url: session.url };
  });
