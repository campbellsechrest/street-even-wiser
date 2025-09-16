import FirecrawlApp from "@mendable/firecrawl-js";
import type { ExtractedPropertyData } from "@shared/schema";

interface FirecrawlScrapeResponse {
  success: boolean;
  markdown?: string;
  html?: string;
  screenshot?: string;
  metadata?: {
    title?: string;
    description?: string;
    statusCode?: number;
    sourceURL?: string;
    ogTitle?: string;
    ogDescription?: string;
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
      console.log(`Firecrawl: API key configured: ${!!process.env.FIRECRAWL_API_KEY}`);

      // Use Firecrawl to scrape the page
      console.log("Firecrawl: About to call scrapeUrl...");
      const response = await this.firecrawl.scrapeUrl(url, {
        formats: ["markdown", "html"],
        onlyMainContent: true,
        timeout: 30000, // 30 second timeout
      }) as FirecrawlScrapeResponse;

      console.log("Firecrawl: scrapeUrl call completed");
      console.log("Firecrawl: Raw response:", JSON.stringify(response, null, 2));

      if (!response.success || !response.markdown) {
        console.log("Firecrawl: Failed to scrape page. Success:", response.success, "Markdown:", !!response.markdown, "Error:", response.error);
        return {
          success: false,
          error: response.error || "Failed to scrape page",
          botDetected: false
        };
      }

      // Check for bot detection/CAPTCHA in the scraped content
      if (response.markdown.includes("Press & Hold to confirm you are") || 
          response.markdown.includes("human (and not a bot)") ||
          response.markdown.includes("px-captcha") ||
          response.metadata?.statusCode === 403) {
        console.log("Firecrawl: Bot detection/CAPTCHA detected in response");
        return {
          success: false,
          error: "StreetEasy bot detection - CAPTCHA challenge presented",
          botDetected: true
        };
      }

      // Extract property data from the scraped content
      const extractedData = this.parsePropertyData(response.markdown, url);
      
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
   * Normalize address string for proper formatting
   */
  private normalizeAddress(addressStr: string): string {
    if (!addressStr) return addressStr;

    // Convert to title case
    let normalized = addressStr.toLowerCase().split(' ').map(word => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');

    // Handle ordinal numbers for street names only (not building numbers)
    // Pattern: look for numbers that are followed by words like "Street", "Avenue", etc.
    normalized = normalized.replace(/\b(\d+)\s+((?:Street|Avenue|Road|Drive|Boulevard|Place|Lane|Court|St|Ave|Rd|Dr|Blvd|Pl|Ln|Ct))\b/g, (match, num, streetType) => {
      const number = parseInt(num);
      let ordinal;
      
      if (number >= 11 && number <= 13) {
        ordinal = number + 'th';
      } else {
        const lastDigit = number % 10;
        switch (lastDigit) {
          case 1: ordinal = number + 'st'; break;
          case 2: ordinal = number + 'nd'; break;
          case 3: ordinal = number + 'rd'; break;
          default: ordinal = number + 'th';
        }
      }
      
      return `${ordinal} ${streetType}`;
    });

    // Fix common street abbreviations
    normalized = normalized
      .replace(/\bSt\b/g, 'Street')
      .replace(/\bAve\b/g, 'Avenue')
      .replace(/\bRd\b/g, 'Road')
      .replace(/\bDr\b/g, 'Drive')
      .replace(/\bBlvd\b/g, 'Boulevard')
      .replace(/\bPl\b/g, 'Place')
      .replace(/\bLn\b/g, 'Lane')
      .replace(/\bCt\b/g, 'Court');

    // Clean up extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Parse property data from Firecrawl markdown content
   */
  private parsePropertyData(markdown: string, url: string): ExtractedPropertyData | null {
    try {
      console.log("Firecrawl: Raw markdown content:", markdown.substring(0, 1000) + "...");
      
      // Extract price information - improved patterns
      let askingPrice: number | null = null;
      
      // Try multiple price patterns
      const pricePatterns = [
        /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,  // Standard format like $1,895,000
        /Price.*?\$(\d{1,3}(?:,\d{3})*)/gi,     // Price: $1,895,000
        /Listed.*?\$(\d{1,3}(?:,\d{3})*)/gi,    // Listed at $1,895,000
        /Asking.*?\$(\d{1,3}(?:,\d{3})*)/gi,    // Asking $1,895,000
      ];
      
      for (const pattern of pricePatterns) {
        const matches = Array.from(markdown.matchAll(pattern));
        if (matches.length > 0) {
          // Take the first reasonable price (between $100k and $100M)
          for (const match of matches) {
            const price = parseInt(match[1].replace(/,/g, ''));
            if (price >= 100000 && price <= 100000000) {
              askingPrice = price;
              break;
            }
          }
          if (askingPrice) break;
        }
      }
      
      console.log("Firecrawl: Extracted price:", askingPrice);

      // Extract bedrooms and bathrooms with improved patterns
      const bedroomPatterns = [
        /(\d+)\s*(?:bed|bedroom|br)(?:room)?s?/gi,
        /Bed(?:room)?s?:\s*(\d+)/gi,
        /(\d+)\s*BR/gi
      ];
      
      let bedrooms: number | null = null;
      for (const pattern of bedroomPatterns) {
        const match = markdown.match(pattern);
        if (match) {
          bedrooms = parseInt(match[1]);
          break;
        }
      }

      const bathroomPatterns = [
        /(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)(?:room)?s?/gi,
        /Bath(?:room)?s?:\s*(\d+(?:\.\d+)?)/gi,
        /(\d+(?:\.\d+)?)\s*BA/gi
      ];
      
      let bathrooms: number | null = null;
      for (const pattern of bathroomPatterns) {
        const match = markdown.match(pattern);
        if (match) {
          bathrooms = parseFloat(match[1]);
          break;
        }
      }

      // Extract square footage
      const sqftPatterns = [
        /(\d{1,4}(?:,\d{3})*)\s*(?:sq\.?\s*ft|sqft|square feet)/gi,
        /Size:\s*(\d{1,4}(?:,\d{3})*)/gi,
        /(\d{1,4}(?:,\d{3})*)\s*sf/gi
      ];
      
      let squareFeet: number | null = null;
      for (const pattern of sqftPatterns) {
        const match = markdown.match(pattern);
        if (match) {
          squareFeet = parseInt(match[1].replace(/,/g, ''));
          break;
        }
      }

      // Extract address with apartment number
      const urlParts = url.split('/');
      const buildingPart = urlParts.find(part => part.includes('-'));
      const apartmentPart = urlParts[urlParts.length - 1]; // Last part is usually the apartment
      
      let address = null;
      if (buildingPart) {
        // First remove the terminal "-new_york" segment if present
        let cleanPart = buildingPart.replace(/-new_york$/, '');
        
        // Then replace remaining hyphens with spaces and underscores with spaces
        cleanPart = cleanPart.replace(/-/g, ' ').replace(/_/g, ' ');
        
        // Clean up extra spaces and apply proper casing
        address = this.normalizeAddress(cleanPart.trim());
      }
      
      // Add apartment number if available
      if (apartmentPart && apartmentPart.match(/^\d+[a-z]?$/i)) {
        address = address ? `${address}, Apt ${apartmentPart.toUpperCase()}` : null;
      }

      // Try to extract address from content if URL parsing fails
      if (!address) {
        const addressPatterns = [
          /(\d+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Road|Rd|Place|Pl|Drive|Dr|Boulevard|Blvd))/gi,
          /Address.*?(\d+.*?(?:Street|St|Avenue|Ave|Road|Rd|Place|Pl|Drive|Dr|Boulevard|Blvd))/gi
        ];
        
        for (const pattern of addressPatterns) {
          const match = markdown.match(pattern);
          if (match) {
            address = this.normalizeAddress(match[1]);
            break;
          }
        }
      }

      // Extract neighborhood/borough with improved patterns
      let borough: string | null = null;
      let neighborhood: string | null = null;

      // NYC boroughs with more comprehensive matching
      const boroughPatterns = [
        /(?:in|,)\s*(Manhattan)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Brooklyn)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Queens)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Bronx)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Staten Island)(?:,|\s|$)/gi,
        /(Manhattan|Brooklyn|Queens|Bronx|Staten Island)/gi
      ];
      
      // If we have "Lenox Hill" neighborhood, it's definitely Manhattan
      if (neighborhood === "Lenox Hill" || neighborhood === "Upper East Side" || neighborhood === "Upper West Side" || 
          neighborhood === "Midtown" || neighborhood === "Chelsea" || neighborhood === "Greenwich Village" || 
          neighborhood === "East Village" || neighborhood === "West Village" || neighborhood === "SoHo" || 
          neighborhood === "Tribeca" || neighborhood === "NoHo" || neighborhood === "Flatiron" || 
          neighborhood === "Gramercy" || neighborhood === "Murray Hill" || neighborhood === "Kips Bay" || 
          neighborhood === "Hell's Kitchen" || neighborhood === "Yorkville") {
        borough = "Manhattan";
      }
      
      for (const pattern of boroughPatterns) {
        const match = markdown.match(pattern);
        if (match) {
          borough = match[1];
          break;
        }
      }

      // Comprehensive neighborhood patterns
      const neighborhoodPatterns = [
        // Manhattan neighborhoods
        /(?:in|,)\s*(Upper East Side)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Upper West Side)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Lower East Side)(?:,|\s|$)/gi,
        /(?:in|,)\s*(East Village)(?:,|\s|$)/gi,
        /(?:in|,)\s*(West Village)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Greenwich Village)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Tribeca)(?:,|\s|$)/gi,
        /(?:in|,)\s*(SoHo)(?:,|\s|$)/gi,
        /(?:in|,)\s*(NoHo)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Chelsea)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Flatiron)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Midtown)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Hell's Kitchen)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Lenox Hill)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Yorkville)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Murray Hill)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Gramercy)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Kips Bay)(?:,|\s|$)/gi,
        // Brooklyn neighborhoods
        /(?:in|,)\s*(Williamsburg)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Park Slope)(?:,|\s|$)/gi,
        /(?:in|,)\s*(DUMBO)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Brooklyn Heights)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Carroll Gardens)(?:,|\s|$)/gi,
        /(?:in|,)\s*(Cobble Hill)(?:,|\s|$)/gi,
        // Generic patterns (fallback)
        /(Upper East Side|Upper West Side|Lower East Side|East Village|West Village|Greenwich Village|Tribeca|SoHo|NoHo|Chelsea|Flatiron|Midtown|Hell's Kitchen|Lenox Hill|Yorkville|Murray Hill|Gramercy|Kips Bay|Williamsburg|Park Slope|DUMBO|Brooklyn Heights|Carroll Gardens|Cobble Hill)/gi
      ];

      for (const pattern of neighborhoodPatterns) {
        const match = markdown.match(pattern);
        if (match) {
          neighborhood = match[1];
          break;
        }
      }

      // After extracting neighborhood, determine borough based on known Manhattan neighborhoods
      if (neighborhood === "Lenox Hill" || neighborhood === "Upper East Side" || neighborhood === "Upper West Side" || 
          neighborhood === "Midtown" || neighborhood === "Chelsea" || neighborhood === "Greenwich Village" || 
          neighborhood === "East Village" || neighborhood === "West Village" || neighborhood === "SoHo" || 
          neighborhood === "Tribeca" || neighborhood === "NoHo" || neighborhood === "Flatiron" || 
          neighborhood === "Gramercy" || neighborhood === "Murray Hill" || neighborhood === "Kips Bay" || 
          neighborhood === "Hell's Kitchen" || neighborhood === "Yorkville") {
        borough = "Manhattan";
      }

      // Try to extract borough directly if not determined by neighborhood
      if (!borough) {
        for (const pattern of boroughPatterns) {
          const match = markdown.match(pattern);
          if (match) {
            borough = match[1];
            break;
          }
        }
      }

      // Extract property status with more patterns
      let status: string = "For Sale"; // Default
      const statusPatterns = [
        /Status.*?(In Contract)/gi,
        /Status.*?(Sold)/gi,
        /Status.*?(Active)/gi,
        /Status.*?(For Sale)/gi,
        /Status.*?(For Rent)/gi,
        /(In Contract)/gi,
        /(Sold)/gi,
        /(Active)/gi
      ];
      
      for (const pattern of statusPatterns) {
        const match = markdown.match(pattern);
        if (match) {
          status = match[1];
          break;
        }
      }

      // Extract additional fields
      let daysOnMarket: number | null = null;
      const domPatterns = [
        /Days on Market.*?(\d+)/gi,
        /DOM.*?(\d+)/gi,
        /Listed.*?(\d+)\s*days/gi,
        /(\d+)\s*days? on market/gi
      ];
      
      for (const pattern of domPatterns) {
        const match = markdown.match(pattern);
        if (match) {
          const parsed = parseInt(match[1]);
          if (!isNaN(parsed)) {
            daysOnMarket = parsed;
            break;
          }
        }
      }

      let rooms: number | null = null;
      const roomPatterns = [
        /(\d+)\s*rooms?/gi,
        /Rooms.*?(\d+)/gi,
        /Total rooms.*?(\d+)/gi
      ];
      
      for (const pattern of roomPatterns) {
        const match = markdown.match(pattern);
        if (match) {
          const parsed = parseInt(match[1]);
          if (!isNaN(parsed)) {
            rooms = parsed;
            break;
          }
        }
      }

      // Clean up NaN values by setting them to null
      if (isNaN(daysOnMarket as any)) daysOnMarket = null;
      if (isNaN(rooms as any)) rooms = null;

      console.log("Firecrawl: Extracted data:", {
        askingPrice,
        bedrooms,
        bathrooms,
        squareFeet,
        address,
        borough,
        neighborhood,
        status,
        daysOnMarket,
        rooms
      });

      // Only return data if we have at least some core information
      if (!askingPrice && !bedrooms && !address) {
        console.log("Firecrawl: No core information found, returning null");
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