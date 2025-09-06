import { publicProcedure } from "@/backend/trpc/create-context";
import { z } from "zod";

export default publicProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ input }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY env var");
    }

    const stripe = new (await import("stripe")).Stripe(key);

    const session = await stripe.checkout.sessions.retrieve(input.sessionId);

    const active = session.status === "complete" || session.payment_status === "paid" || session.subscription !== null;

    return { active };
  });
