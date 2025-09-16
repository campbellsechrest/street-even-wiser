import FirecrawlApp from "@mendable/firecrawl-js";
import type { ExtractedPropertyData } from "@shared/schema";

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
    };
  };
  error?: string;
}

export class FirecrawlExtractor {
  private static instance: FirecrawlExtractor;
  private firecrawl: FirecrawlApp;

  private constructor() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY environment variable is required");
    }
    this.firecrawl = new FirecrawlApp({ apiKey });
  }

  public static getInstance(): FirecrawlExtractor {
    if (!FirecrawlExtractor.instance) {
      FirecrawlExtractor.instance = new FirecrawlExtractor();
    }
    return FirecrawlExtractor.instance;
  }

  /**
   * Extract property data from StreetEasy URL using Firecrawl
   */
  public async extractPropertyData(url: string): Promise<{
    success: boolean;
    data?: ExtractedPropertyData;
    error?: string;
    botDetected?: boolean;
  }> {
    try {
      console.log(`Firecrawl: Attempting extraction for ${url}`);

      // Use Firecrawl to scrape the page
      const response = await this.firecrawl.scrapeUrl(url, {
        formats: ["markdown", "html"],
        includeTags: ["title", "meta"],
        excludeTags: ["script", "style", "nav", "footer"],
        waitFor: 2000, // Wait 2s for dynamic content
      }) as FirecrawlResponse;

      if (!response.success || !response.data) {
        console.log("Firecrawl: Failed to scrape page", response.error);
        return {
          success: false,
          error: response.error || "Failed to scrape page",
          botDetected: false
        };
      }

      // Extract property data from the scraped content
      const extractedData = this.parsePropertyData(response.data.markdown || "", url);
      
      if (!extractedData) {
        return {
          success: false,
          error: "Failed to parse property data from scraped content",
          botDetected: false
        };
      }

      console.log(`Firecrawl: Successfully extracted property data for ${url}`);
      return {
        success: true,
        data: extractedData
      };

    } catch (error: any) {
      console.error("Firecrawl: Extraction error:", error);
      
      // Check if this is a rate limit or blocking issue
      const isBlocked = error.message?.includes("rate limit") || 
                       error.message?.includes("blocked") ||
                       error.message?.includes("403") ||
                       error.message?.includes("429");

      return {
        success: false,
        error: error.message || "Unknown extraction error",
        botDetected: isBlocked
      };
    }
  }

  /**
   * Parse property data from Firecrawl markdown content
   */
  private parsePropertyData(markdown: string, url: string): ExtractedPropertyData | null {
    try {
      // Extract price information
      const priceMatch = markdown.match(/\$[\d,]+(?:\.\d{2})?/);
      const askingPrice = priceMatch ? parseInt(priceMatch[0].replace(/[$,]/g, '')) : null;

      // Extract bedrooms and bathrooms
      const bedroomMatch = markdown.match(/(\d+)\s*(?:bed|bedroom|br)/i);
      const bathroomMatch = markdown.match(/(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)/i);
      
      const bedrooms = bedroomMatch ? parseInt(bedroomMatch[1]) : null;
      const bathrooms = bathroomMatch ? parseFloat(bathroomMatch[1]) : null;

      // Extract square footage
      const sqftMatch = markdown.match(/(\d{1,4}(?:,\d{3})*)\s*(?:sq\.?\s*ft|sqft|square feet)/i);
      const squareFeet = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, '')) : null;

      // Extract address from URL or content
      const urlParts = url.split('/');
      const buildingPart = urlParts.find(part => part.includes('-'));
      let address = buildingPart ? buildingPart.replace(/-/g, ' ').replace(/_/g, '') : null;

      // Try to extract address from content if URL parsing fails
      if (!address) {
        const addressMatch = markdown.match(/\d+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Road|Rd|Place|Pl|Drive|Dr|Boulevard|Blvd)/i);
        address = addressMatch ? addressMatch[0] : null;
      }

      // Extract neighborhood/borough
      let borough: string | null = null;
      let neighborhood: string | null = null;

      // Check for NYC boroughs
      const boroughPattern = /(Manhattan|Brooklyn|Queens|Bronx|Staten Island)/i;
      const boroughMatch = markdown.match(boroughPattern);
      if (boroughMatch) {
        borough = boroughMatch[1];
      }

      // Extract neighborhood names
      const neighborhoodPatterns = [
        /Upper East Side/i,
        /Upper West Side/i,
        /Lower East Side/i,
        /East Village/i,
        /West Village/i,
        /Greenwich Village/i,
        /Tribeca/i,
        /SoHo/i,
        /NoHo/i,
        /Chelsea/i,
        /Flatiron/i,
        /Midtown/i,
        /Hell's Kitchen/i,
        /Williamsburg/i,
        /Park Slope/i,
        /DUMBO/i,
        /Brooklyn Heights/i,
      ];

      for (const pattern of neighborhoodPatterns) {
        const match = markdown.match(pattern);
        if (match) {
          neighborhood = match[0];
          break;
        }
      }

      // Extract property status
      let status: string = "For Sale"; // Default
      if (markdown.includes("sold") || markdown.includes("Sold")) {
        status = "Sold";
      } else if (markdown.includes("rent") || markdown.includes("Rent")) {
        status = "For Rent";
      }

      // Only return data if we have at least some core information
      if (!askingPrice && !bedrooms && !address) {
        return null;
      }

      return {
        url,
        askingPrice,
        bedrooms,
        bathrooms,
        squareFeet,
        address,
        borough,
        neighborhood,
        status,
        extractionMethod: "firecrawl",
        extractedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error("Firecrawl: Error parsing property data:", error);
      return null;
    }
  }
}