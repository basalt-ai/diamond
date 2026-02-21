import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// ── Auth User ───────────────────────────────────────────────────────

export const auUsers = pgTable("au_users", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// ── Auth Session ────────────────────────────────────────────────────

export const auSessions = pgTable("au_sessions", {
  id: text().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => auUsers.id, { onDelete: "cascade" }),
  token: text().notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// ── Auth Account (OAuth providers) ──────────────────────────────────

export const auAccounts = pgTable("au_accounts", {
  id: text().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => auUsers.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text(),
  idToken: text("id_token"),
  password: text(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// ── Auth Verification ───────────────────────────────────────────────

export const auVerifications = pgTable("au_verifications", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// ── Relations ───────────────────────────────────────────────────────

export const auUsersRelations = relations(auUsers, ({ many }) => ({
  sessions: many(auSessions),
  accounts: many(auAccounts),
}));

export const auSessionsRelations = relations(auSessions, ({ one }) => ({
  user: one(auUsers, { fields: [auSessions.userId], references: [auUsers.id] }),
}));

export const auAccountsRelations = relations(auAccounts, ({ one }) => ({
  user: one(auUsers, { fields: [auAccounts.userId], references: [auUsers.id] }),
}));
