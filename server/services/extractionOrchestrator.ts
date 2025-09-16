import { StreetEasyExtractor } from "./streetEasyExtractor";
import { FirecrawlExtractor } from "./firecrawlExtractor";
import type { ExtractedPropertyData } from "@shared/schema";

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedPropertyData;
  error?: string;
  botDetected?: boolean;
  cached?: boolean;
  method?: string; // Track which method succeeded
  attempts?: string[]; // Track which methods were attempted
  message?: string;
}

export class ExtractionOrchestrator {
  private static instance: ExtractionOrchestrator;
  private firecrawlExtractor: FirecrawlExtractor;

  private constructor() {
    this.firecrawlExtractor = FirecrawlExtractor.getInstance();
  }

  public static getInstance(): ExtractionOrchestrator {
    if (!ExtractionOrchestrator.instance) {
      ExtractionOrchestrator.instance = new ExtractionOrchestrator();
    }
    return ExtractionOrchestrator.instance;
  }

  /**
   * Extract property data using cascading fallback methods
   * 1. HTTP-based StreetEasy extraction (primary)
   * 2. Firecrawl extraction (fallback)
   * 3. Alternative HTTP approach (future)
   */
  public async extractPropertyData(url: string, fromCache = true): Promise<ExtractionResult> {
    const attempts: string[] = [];
    const startTime = Date.now();

    console.log(`Orchestrator: Starting extraction for ${url} (cache=${fromCache})`);

    // Method 1: Try primary HTTP-based extraction
    attempts.push("http");
    try {
      console.log("Orchestrator: Attempting primary HTTP extraction");
      const httpResult = await StreetEasyExtractor.extractPropertyData(url);
      
      if (httpResult.success && httpResult.data) {
        console.log(`Orchestrator: Primary extraction succeeded in ${Date.now() - startTime}ms`);
        return {
          success: true,
          data: {
            ...this.convertToExtractedPropertyData(httpResult.data, url),
            extractionMethod: "http"
          },
          method: "http",
          attempts,
          cached: false
        };
      }

      // Check if it's a bot detection issue
      if (httpResult.botDetected) {
        console.log("Orchestrator: Primary extraction blocked, trying Firecrawl fallback");
      } else {
        console.log(`Orchestrator: Primary extraction failed: ${httpResult.error}`);
      }

    } catch (error: any) {
      console.log(`Orchestrator: Primary extraction error: ${error.message}`);
    }

    // Method 2: Try Firecrawl fallback
    attempts.push("firecrawl");
    try {
      console.log("Orchestrator: Attempting Firecrawl fallback extraction");
      const firecrawlResult = await this.firecrawlExtractor.extractPropertyData(url);
      
      if (firecrawlResult.success && firecrawlResult.data) {
        console.log(`Orchestrator: Firecrawl extraction succeeded in ${Date.now() - startTime}ms`);
        return {
          success: true,
          data: firecrawlResult.data,
          method: "firecrawl", 
          attempts,
          cached: false
        };
      }

      console.log(`Orchestrator: Firecrawl extraction failed: ${firecrawlResult.error}`);

    } catch (error: any) {
      console.log(`Orchestrator: Firecrawl extraction error: ${error.message}`);
    }

    // Method 3: Alternative HTTP approach (future implementation)
    // This could include different headers, proxy rotation, etc.
    attempts.push("alternative");
    try {
      console.log("Orchestrator: Alternative extraction methods not yet implemented");
    } catch (error: any) {
      console.log(`Orchestrator: Alternative extraction error: ${error.message}`);
    }

    // All methods failed
    const totalTime = Date.now() - startTime;
    console.log(`Orchestrator: All extraction methods failed after ${totalTime}ms`);
    
    return {
      success: false,
      error: "All extraction methods failed",
      botDetected: true, // Assume it's a blocking issue since multiple methods failed
      method: "none",
      attempts,
      cached: false,
      message: "Unable to extract property data. Please try again later or use manual entry."
    };
  }

  /**
   * Convert StreetEasy extractor data format to standard ExtractedPropertyData
   */
  private convertToExtractedPropertyData(streetEasyData: any, url: string): ExtractedPropertyData {
    return {
      url,
      askingPrice: streetEasyData.priceValue,
      bedrooms: streetEasyData.bedrooms,
      bathrooms: streetEasyData.bathrooms,
      squareFeet: streetEasyData.squareFootage,
      address: streetEasyData.address,
      borough: streetEasyData.borough,
      neighborhood: streetEasyData.neighborhood,
      status: streetEasyData.status,
      extractionMethod: "http",
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Get extraction statistics for monitoring
   */
  public async getExtractionStats(): Promise<{
    totalAttempts: number;
    successRate: number;
    methodBreakdown: Record<string, number>;
  }> {
    // This would typically query the database for extraction statistics
    // For now, return placeholder data
    return {
      totalAttempts: 0,
      successRate: 0,
      methodBreakdown: {
        http: 0,
        firecrawl: 0,
        alternative: 0
      }
    };
  }
}