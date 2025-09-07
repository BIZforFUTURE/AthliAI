import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import createCheckoutRoute from "./routes/stripe/createCheckout/route";
import verifyRoute from "./routes/stripe/verify/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  stripe: createTRPCRouter({
    createCheckout: createCheckoutRoute,
    verify: verifyRoute,
  }),
});

export type AppRouter = typeof appRouter;