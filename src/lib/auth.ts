import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { uuidv7 } from "uuidv7";

import { db } from "@/db";
import {
  auAccounts,
  auSessions,
  auUsers,
  auVerifications,
} from "@/db/schema/auth";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: auUsers,
      session: auSessions,
      account: auAccounts,
      verification: auVerifications,
    },
  }),

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      prompt: "select_account",
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-minute cache to reduce DB hits
    },
  },

  advanced: {
    generateId: () => uuidv7(),
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  plugins: [nextCookies()], // must be last
});
