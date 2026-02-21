import { jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const systemConfig = pgTable("system_config", {
  key: varchar({ length: 100 }).primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
