import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// School scoring audit trail
export const schoolScoreAudits = pgTable("school_score_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id"),
  schoolDbn: text("school_dbn"), // DOE District-Borough-Number
  schoolName: text("school_name"),
  elaScore: real("ela_score"), // ELA proficiency percentage
  mathScore: real("math_score"), // Math proficiency percentage
  environmentScore: real("environment_score"), // School environment rating
  attendanceRate: real("attendance_rate"), // Attendance percentage
  compositeRating: real("composite_rating"), // Calculated 1-10 rating
  boroughMedian: real("borough_median"), // Borough median for adjustment
  finalScore: integer("final_score"), // Final 0-100 score
  dataSource: text("data_source").notNull(), // 'doe_quality_reports', 'district_avg'
  createdAt: timestamp("created_at").defaultNow(),
});

// Borough median school ratings for relative adjustments
export const boroughSchoolMedians = pgTable("borough_school_medians", {
  borough: text("borough").primaryKey(), // 'Manhattan', 'Brooklyn', etc.
  median: real("median").notNull(), // Median composite rating
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSchoolScoreAuditSchema = createInsertSchema(schoolScoreAudits).omit({
  id: true,
  createdAt: true,
});

export const insertBoroughSchoolMedianSchema = createInsertSchema(boroughSchoolMedians).omit({
  lastUpdated: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSchoolScoreAudit = z.infer<typeof insertSchoolScoreAuditSchema>;
export type SchoolScoreAudit = typeof schoolScoreAudits.$inferSelect;
export type InsertBoroughSchoolMedian = z.infer<typeof insertBoroughSchoolMedianSchema>;
export type BoroughSchoolMedian = typeof boroughSchoolMedians.$inferSelect;
