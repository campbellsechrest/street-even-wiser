import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { SchoolScoringService } from "./services/schoolScoring";
import { StreetEasyExtractor } from "./services/streetEasyExtractor";
import { schoolScoreRequestSchema, analyzePropertyRequestSchema, propertyExtractionRequestSchema, properties } from "@shared/schema";
import { ZodError } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  const schoolScoringService = SchoolScoringService.getInstance();

  // School scoring API endpoint
  app.post("/api/school-score", async (req, res) => {
    try {
      // Validate request body with Zod
      const validatedData = schoolScoreRequestSchema.parse(req.body);
      const { lat, lng, borough } = validatedData;

      const result = await schoolScoringService.calculateSchoolScore(lat, lng, borough);
      res.json(result);
      
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
          }))
        });
      }
      
      console.error("School scoring API error:", error);
      res.status(500).json({ 
        error: "Failed to calculate school score",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Property analysis endpoint (for future integration)
  app.post("/api/analyze-property", async (req, res) => {
    try {
      // Validate request body with Zod
      const validatedData = analyzePropertyRequestSchema.parse(req.body);
      const { address, lat, lng, borough } = validatedData;

      // Calculate school score as part of property analysis
      const schoolScore = await schoolScoringService.calculateSchoolScore(lat, lng, borough);
      
      // Return comprehensive property analysis (school score integrated)
      res.json({
        address,
        coordinates: { lat, lng },
        borough,
        schoolScore,
        // Future: Add other property analysis components here
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
          }))
        });
      }
      
      console.error("Property analysis API error:", error);
      res.status(500).json({ 
        error: "Failed to analyze property",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Property extraction endpoint
  app.post("/api/properties/extract", async (req, res) => {
    try {
      // Validate request body with Zod
      const validatedData = propertyExtractionRequestSchema.parse(req.body);
      const { streetEasyUrl } = validatedData;

      // Check if we already have this property in the database
      const existingProperty = await db
        .select()
        .from(properties)
        .where(eq(properties.streetEasyUrl, streetEasyUrl))
        .limit(1);

      if (existingProperty.length > 0) {
        // Return existing property data
        return res.json({
          success: true,
          data: existingProperty[0],
          cached: true,
          message: "Property data retrieved from cache"
        });
      }

      // Extract property data from StreetEasy
      const extractionResult = await StreetEasyExtractor.extractPropertyData(streetEasyUrl);

      if (!extractionResult.success) {
        // Store failed extraction attempt
        await db.insert(properties).values({
          streetEasyUrl,
          extractionSuccess: 0,
          extractionError: extractionResult.error || 'Unknown extraction error',
        });

        return res.status(422).json({
          success: false,
          error: extractionResult.error || 'Failed to extract property data',
          botDetected: extractionResult.botDetected || false
        });
      }

      // Store successful extraction
      const propertyData = {
        streetEasyUrl,
        address: extractionResult.data?.address,
        neighborhood: extractionResult.data?.neighborhood,
        borough: extractionResult.data?.borough,
        price: extractionResult.data?.price,
        priceValue: extractionResult.data?.priceValue,
        bedrooms: extractionResult.data?.bedrooms,
        bathrooms: extractionResult.data?.bathrooms,
        rooms: extractionResult.data?.rooms,
        squareFootage: extractionResult.data?.squareFootage,
        pricePerSquareFoot: extractionResult.data?.pricePerSquareFoot,
        listingType: extractionResult.data?.listingType,
        status: extractionResult.data?.status,
        buildingType: extractionResult.data?.buildingType,
        daysOnMarket: extractionResult.data?.daysOnMarket,
        listedDate: extractionResult.data?.listedDate,
        soldDate: extractionResult.data?.soldDate,
        extractionSuccess: 1,
        extractionError: null,
      };

      const savedProperty = await db.insert(properties).values(propertyData).returning();

      return res.json({
        success: true,
        data: savedProperty[0],
        cached: false,
        message: "Property data extracted and saved successfully"
      });

    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
          }))
        });
      }
      
      console.error("Property extraction API error:", error);
      res.status(500).json({ 
        error: "Failed to extract property data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
