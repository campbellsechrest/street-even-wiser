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

// Property data table for storing extracted StreetEasy information
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streetEasyUrl: text("streeteasy_url").notNull().unique(),
  address: text("address"),
  neighborhood: text("neighborhood"),
  borough: text("borough"),
  price: text("price"),
  priceValue: integer("price_value"),
  bedrooms: integer("bedrooms"),
  bathrooms: real("bathrooms"),
  rooms: text("rooms"),
  squareFootage: integer("square_footage"),
  pricePerSquareFoot: integer("price_per_square_foot"),
  listingType: text("listing_type"), // 'sale' or 'rental'
  status: text("status"), // 'For Sale', 'Sold', 'For Rent', 'Rented'
  buildingType: text("building_type"), // 'Condo', 'Co-op', 'Rental unit'
  daysOnMarket: integer("days_on_market"),
  listedDate: text("listed_date"),
  soldDate: text("sold_date"),
  extractedAt: timestamp("extracted_at").defaultNow(),
  extractionSuccess: integer("extraction_success").notNull().default(1), // 1 for success, 0 for failed
  extractionError: text("extraction_error"),
  extractionMethod: text("extraction_method").default("http"), // 'http', 'firecrawl', 'alternative'
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

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  extractedAt: true,
});

export const propertyExtractionRequestSchema = z.object({
  streetEasyUrl: z.string().url("Must be a valid URL").refine(
    (url) => url.includes('streeteasy.com/building/'),
    "Must be a StreetEasy property listing URL"
  ),
});

// API request validation schemas
export const boroughEnum = z.enum(["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]);

export const schoolScoreRequestSchema = z.object({
  lat: z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
  lng: z.number().min(-180).max(180, "Longitude must be between -180 and 180"),
  borough: boroughEnum,
});

export const analyzePropertyRequestSchema = z.object({
  address: z.string().optional(),
  lat: z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
  lng: z.number().min(-180).max(180, "Longitude must be between -180 and 180"),
  borough: boroughEnum,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSchoolScoreAudit = z.infer<typeof insertSchoolScoreAuditSchema>;
export type SchoolScoreAudit = typeof schoolScoreAudits.$inferSelect;
export type InsertBoroughSchoolMedian = z.infer<typeof insertBoroughSchoolMedianSchema>;
export type BoroughSchoolMedian = typeof boroughSchoolMedians.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// API request types
export type SchoolScoreRequest = z.infer<typeof schoolScoreRequestSchema>;
export type AnalyzePropertyRequest = z.infer<typeof analyzePropertyRequestSchema>;
export type PropertyExtractionRequest = z.infer<typeof propertyExtractionRequestSchema>;
export type Borough = z.infer<typeof boroughEnum>;

// Extracted property data type for extraction services
export type ExtractedPropertyData = {
  url: string;
  askingPrice?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  address?: string | null;
  borough?: string | null;
  neighborhood?: string | null;
  status?: string;
  extractionMethod?: string;
  extractedAt?: string;
};
