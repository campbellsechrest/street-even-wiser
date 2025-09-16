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
    console.log("Property extraction endpoint called with body:", req.body);
    try {
      // Validate request body with Zod
      const validatedData = propertyExtractionRequestSchema.parse(req.body);
      const { streetEasyUrl } = validatedData;
      
      // Normalize URL to prevent duplicates
      const normalizedUrl = StreetEasyExtractor.normalizeStreetEasyURL(streetEasyUrl);

      // Check if we already have this property in the database
      const existingProperty = await db
        .select()
        .from(properties)
        .where(eq(properties.streetEasyUrl, normalizedUrl))
        .limit(1);

      if (existingProperty.length > 0) {
        const cached = existingProperty[0];
        
        // Check if the cached extraction was successful
        if (cached.extractionSuccess === 1) {
          // Return successful cached property data
          return res.json({
            success: true,
            data: cached,
            cached: true,
            message: "Property data retrieved from cache"
          });
        } else {
          // Return failed cached extraction with 422 status
          return res.status(422).json({
            success: false,
            error: cached.extractionError || 'Previous extraction failed',
            botDetected: cached.extractionError?.includes('Bot detection') || false,
            cached: true,
            message: "Previous extraction attempt failed. You can retry."
          });
        }
      }

      // Extract property data from StreetEasy
      const extractionResult = await StreetEasyExtractor.extractPropertyData(streetEasyUrl);

      // Prepare property data for upsert
      const propertyData = {
        streetEasyUrl: normalizedUrl,
        address: extractionResult.data?.address || null,
        neighborhood: extractionResult.data?.neighborhood || null,
        borough: extractionResult.data?.borough || null,
        price: extractionResult.data?.price || null,
        priceValue: extractionResult.data?.priceValue || null,
        bedrooms: extractionResult.data?.bedrooms || null,
        bathrooms: extractionResult.data?.bathrooms || null,
        rooms: extractionResult.data?.rooms || null,
        squareFootage: extractionResult.data?.squareFootage || null,
        pricePerSquareFoot: extractionResult.data?.pricePerSquareFoot || null,
        listingType: extractionResult.data?.listingType || null,
        status: extractionResult.data?.status || null,
        buildingType: extractionResult.data?.buildingType || null,
        daysOnMarket: extractionResult.data?.daysOnMarket || null,
        listedDate: extractionResult.data?.listedDate || null,
        soldDate: extractionResult.data?.soldDate || null,
        extractionSuccess: extractionResult.success ? 1 : 0,
        extractionError: extractionResult.error || null,
      };

      // Use upsert with onConflictDoUpdate for streeteasy_url uniqueness
      const savedProperty = await db
        .insert(properties)
        .values(propertyData)
        .onConflictDoUpdate({
          target: properties.streetEasyUrl,
          set: {
            address: propertyData.address,
            neighborhood: propertyData.neighborhood,
            borough: propertyData.borough,
            price: propertyData.price,
            priceValue: propertyData.priceValue,
            bedrooms: propertyData.bedrooms,
            bathrooms: propertyData.bathrooms,
            rooms: propertyData.rooms,
            squareFootage: propertyData.squareFootage,
            pricePerSquareFoot: propertyData.pricePerSquareFoot,
            listingType: propertyData.listingType,
            status: propertyData.status,
            buildingType: propertyData.buildingType,
            daysOnMarket: propertyData.daysOnMarket,
            listedDate: propertyData.listedDate,
            soldDate: propertyData.soldDate,
            extractionSuccess: propertyData.extractionSuccess,
            extractionError: propertyData.extractionError,
            extractedAt: new Date(),
          }
        })
        .returning();

      if (!extractionResult.success) {
        return res.status(422).json({
          success: false,
          error: extractionResult.error || 'Failed to extract property data',
          botDetected: extractionResult.botDetected || false,
          cached: false
        });
      }

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
