import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { SchoolScoringService } from "./services/schoolScoring";
import { StreetEasyExtractor } from "./services/streetEasyExtractor";
import { ExtractionOrchestrator } from "./services/extractionOrchestrator";
import { NeighborhoodEnrichmentOrchestrator } from "./services/neighborhoodEnrichmentOrchestrator";
import { MarketAnalysisService } from "./services/marketAnalysisService";
import { GeocodingService } from "./services/geocoding";
import { schoolScoreRequestSchema, analyzePropertyRequestSchema, propertyExtractionRequestSchema, neighborhoodEnrichmentRequestSchema, marketAnalysisRequestSchema, properties, MarketAnalysisRequest } from "@shared/schema";
import { ZodError } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  const schoolScoringService = SchoolScoringService.getInstance();
  const neighborhoodEnrichmentOrchestrator = NeighborhoodEnrichmentOrchestrator.getInstance();
  const marketAnalysisService = MarketAnalysisService.getInstance();
  const geocodingService = GeocodingService.getInstance();

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

  // Comprehensive neighborhood enrichment endpoint
  app.post("/api/enrich-location", async (req, res) => {
    try {
      // Validate request body with Zod
      const validatedData = neighborhoodEnrichmentRequestSchema.parse(req.body);
      const { lat, lng, address } = validatedData;

      console.log(`Neighborhood enrichment requested for: ${address || `${lat}, ${lng}`}`);

      // Use orchestrator to get comprehensive neighborhood data
      const enrichmentResult = await neighborhoodEnrichmentOrchestrator.enrichLocation({
        lat,
        lng,
        address
      });
      
      res.json(enrichmentResult);
      
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
      
      console.error("Neighborhood enrichment API error:", error);
      res.status(500).json({ 
        error: "Failed to enrich location data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Property analysis endpoint (enhanced with full neighborhood data)
  app.post("/api/analyze-property", async (req, res) => {
    try {
      // Validate request body with Zod
      const validatedData = analyzePropertyRequestSchema.parse(req.body);
      const { address, lat, lng, borough } = validatedData;

      console.log(`Property analysis requested for: ${address || `${lat}, ${lng}`} in ${borough}`);

      // Get comprehensive neighborhood enrichment
      const enrichmentResult = await neighborhoodEnrichmentOrchestrator.enrichLocation({
        lat,
        lng,
        address,
        borough
      });

      // Calculate school score separately for backwards compatibility
      const schoolScore = await schoolScoringService.calculateSchoolScore(lat, lng, borough);
      
      // Return comprehensive property analysis with all enrichment data
      res.json({
        address,
        coordinates: { lat, lng },
        borough,
        schoolScore,
        neighborhoodData: enrichmentResult,
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

      // Extract property data using orchestrated fallback system
      const orchestrator = ExtractionOrchestrator.getInstance();
      const extractionResult = await orchestrator.extractPropertyData(streetEasyUrl, false);

      // Prepare property data for upsert - handle both old and new data formats
      const extractedData = extractionResult.data;
      const propertyData = {
        streetEasyUrl: normalizedUrl,
        address: extractedData?.address || null,
        neighborhood: extractedData?.neighborhood || null,
        borough: extractedData?.borough || null,
        price: extractedData?.askingPrice ? `$${extractedData.askingPrice.toLocaleString()}` : null,
        priceValue: extractedData?.askingPrice || null,
        bedrooms: extractedData?.bedrooms || null,
        bathrooms: extractedData?.bathrooms || null,
        rooms: null, // Not extracted by new system
        squareFootage: extractedData?.squareFeet || null,
        pricePerSquareFoot: extractedData?.askingPrice && extractedData?.squareFeet ? 
          Math.round(extractedData.askingPrice / extractedData.squareFeet) : null,
        listingType: extractedData?.status?.toLowerCase().includes('rent') ? 'rental' : 'sale',
        status: extractedData?.status || null,
        buildingType: null, // Not extracted by new system yet
        daysOnMarket: null, // Not extracted by new system yet
        listedDate: null, // Not extracted by new system yet
        soldDate: null, // Not extracted by new system yet
        extractionSuccess: extractionResult.success ? 1 : 0,
        extractionError: extractionResult.error || null,
        extractionMethod: extractionResult.method || 'unknown',
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

  // Market analysis endpoint for comprehensive comparable property search
  app.post("/api/analyze-market", async (req, res) => {
    try {
      // Validate request body with Zod
      const validatedData = marketAnalysisRequestSchema.parse(req.body);
      let { address, lat, lng } = validatedData;

      console.log(`Market analysis requested for: ${address}`);

      // Geocode address if coordinates not provided
      if (!lat || !lng) {
        console.log(`[MarketAnalysis] Geocoding address: ${address}`);
        const geocodingResult = await geocodingService.geocodeAddress(address);
        
        if (!geocodingResult) {
          return res.status(400).json({
            error: "Unable to geocode address",
            message: "Could not find coordinates for the provided address. Please verify the address is correct."
          });
        }
        
        lat = geocodingResult.lat;
        lng = geocodingResult.lng;
        console.log(`[MarketAnalysis] Geocoded to ${lat}, ${lng} (confidence: ${geocodingResult.confidence})`);
      }

      // Prepare market analysis request with coordinates
      const marketRequest: MarketAnalysisRequest = {
        ...validatedData,
        lat,
        lng
      };

      // Perform comprehensive market analysis
      const analysisResult = await marketAnalysisService.analyzeMarket(marketRequest);
      
      res.json(analysisResult);
      
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
      
      console.error("Market analysis API error:", error);
      res.status(500).json({ 
        error: "Failed to analyze market",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
