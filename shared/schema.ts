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
  lat: real("lat"), // Latitude for property location
  lng: real("lng"), // Longitude for property location
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

// Neighborhood enrichment audit tables
export const neighborhoodEnrichmentAudits = pgTable("neighborhood_enrichment_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  address: text("address"),
  subwayScore: integer("subway_score"), // 0-100 score based on proximity to subway
  walkabilityScore: integer("walkability_score"), // 0-100 walkability rating
  noiseScore: integer("noise_score"), // 0-100 score (higher = quieter)
  parkingScore: integer("parking_score"), // 0-100 score (higher = better parking)
  nearestSubwayStation: text("nearest_subway_station"),
  nearestSubwayDistance: real("nearest_subway_distance"), // Distance in miles
  dataSource: text("data_source").notNull(), // Source of enrichment data
  createdAt: timestamp("created_at").defaultNow(),
});

// Subway stations cache for proximity calculations
export const subwayStations = pgTable("subway_stations", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  lines: text("lines").notNull(), // JSON array of subway lines
  borough: text("borough"),
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

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  extractedAt: true,
});

export const insertNeighborhoodEnrichmentAuditSchema = createInsertSchema(neighborhoodEnrichmentAudits).omit({
  id: true,
  createdAt: true,
});

export const insertSubwayStationSchema = createInsertSchema(subwayStations).omit({
  lastUpdated: true,
});

// Market analysis and comparable properties tables
export const marketAnalysisAudits = pgTable("market_analysis_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyAddress: text("property_address").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: real("bathrooms"),
  squareFeet: integer("square_feet"),
  propertyType: text("property_type"), // 'condo', 'coop', 'townhouse'
  askingPrice: integer("asking_price"),
  marketScore: integer("market_score"), // 0-100 overall market attractiveness
  fairValueEstimate: integer("fair_value_estimate"), // Estimated fair market value
  priceGapPercentage: real("price_gap_percentage"), // % diff between asking and fair value
  marketTrend: text("market_trend"), // 'hot', 'balanced', 'cooling'
  daysOnMarketAvg: integer("days_on_market_avg"), // Average DOM for area
  pricePerSqftMedian: integer("price_per_sqft_median"), // Median $/sqft for area
  comparablesFound: integer("comparables_found"), // Number of comparable properties found
  dataSource: text("data_source").notNull(), // Source of market data
  analysisDate: timestamp("analysis_date").defaultNow(),
});

export const comparableProperties = pgTable("comparable_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketAnalysisId: varchar("market_analysis_id").notNull(),
  address: text("address").notNull(),
  unit: text("unit"),
  price: integer("price").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: real("bathrooms").notNull(),
  squareFeet: integer("square_feet"),
  soldDate: text("sold_date"), // Date property was sold/listed
  distance: real("distance").notNull(), // Distance in miles from subject property
  similarity: integer("similarity").notNull(), // Similarity score 0-100
  priceAdjustment: real("price_adjustment"), // % price adjustment for differences
  dataSource: text("data_source").notNull(), // Source of comparable data
  extractedAt: timestamp("extracted_at").defaultNow(),
});

export const insertMarketAnalysisAuditSchema = createInsertSchema(marketAnalysisAudits).omit({
  id: true,
  analysisDate: true,
});

export const insertComparablePropertySchema = createInsertSchema(comparableProperties).omit({
  id: true,
  extractedAt: true,
});

export const propertyExtractionRequestSchema = z.object({
  streetEasyUrl: z.string().url("Must be a valid URL").refine(
    (url) => url.includes('streeteasy.com/building/'),
    "Must be a StreetEasy property listing URL"
  ),
});

export const neighborhoodEnrichmentRequestSchema = z.object({
  lat: z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
  lng: z.number().min(-180).max(180, "Longitude must be between -180 and 180"),
  address: z.string().optional(),
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

export const marketAnalysisRequestSchema = z.object({
  address: z.string().min(1, "Address is required"),
  lat: z.number().min(-90).max(90, "Latitude must be between -90 and 90").optional(),
  lng: z.number().min(-180).max(180, "Longitude must be between -180 and 180").optional(),
  bedrooms: z.number().min(0).max(10).optional(),
  bathrooms: z.number().min(0).max(10).optional(),
  squareFeet: z.number().min(1).optional(),
  propertyType: z.enum(["condo", "coop", "townhouse"]).optional(),
  askingPrice: z.number().min(1).optional(),
}).refine(
  (data) => (data.lat && data.lng) || (!data.lat && !data.lng),
  {
    message: "Both lat and lng must be provided together, or neither (address will be geocoded)",
    path: ["coordinates"]
  }
);

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSchoolScoreAudit = z.infer<typeof insertSchoolScoreAuditSchema>;
export type SchoolScoreAudit = typeof schoolScoreAudits.$inferSelect;
export type InsertBoroughSchoolMedian = z.infer<typeof insertBoroughSchoolMedianSchema>;
export type BoroughSchoolMedian = typeof boroughSchoolMedians.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertNeighborhoodEnrichmentAudit = z.infer<typeof insertNeighborhoodEnrichmentAuditSchema>;
export type NeighborhoodEnrichmentAudit = typeof neighborhoodEnrichmentAudits.$inferSelect;
export type InsertSubwayStation = z.infer<typeof insertSubwayStationSchema>;
export type SubwayStation = typeof subwayStations.$inferSelect;
export type InsertMarketAnalysisAudit = z.infer<typeof insertMarketAnalysisAuditSchema>;
export type MarketAnalysisAudit = typeof marketAnalysisAudits.$inferSelect;
export type InsertComparableProperty = z.infer<typeof insertComparablePropertySchema>;
export type ComparableProperty = typeof comparableProperties.$inferSelect;

// API request types
export type SchoolScoreRequest = z.infer<typeof schoolScoreRequestSchema>;
export type AnalyzePropertyRequest = z.infer<typeof analyzePropertyRequestSchema>;
export type PropertyExtractionRequest = z.infer<typeof propertyExtractionRequestSchema>;
export type NeighborhoodEnrichmentRequest = z.infer<typeof neighborhoodEnrichmentRequestSchema>;
export type MarketAnalysisRequest = z.infer<typeof marketAnalysisRequestSchema>;
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
