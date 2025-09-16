// Using Node.js built-in fetch (available in Node 18+)

export interface StreetEasyPropertyData {
  success: boolean;
  data?: {
    price?: string;
    priceValue?: number;
    rooms?: string;
    bedrooms?: number;
    bathrooms?: number;
    address?: string;
    neighborhood?: string;
    borough?: string;
    squareFootage?: number;
    pricePerSquareFoot?: number;
    listingType?: 'sale' | 'rental';
    status?: string; // 'For Sale', 'Sold', 'For Rent', 'Rented'
    daysOnMarket?: number;
    buildingType?: string; // 'Condo', 'Co-op', 'Rental unit'
    listedDate?: string;
    soldDate?: string;
  };
  error?: string;
  botDetected?: boolean;
}

export class StreetEasyExtractor {
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private static readonly HEADERS = {
    'User-Agent': StreetEasyExtractor.USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };

  /**
   * Extract property data from StreetEasy URL
   */
  static async extractPropertyData(url: string): Promise<StreetEasyPropertyData> {
    try {
      // Validate URL format
      if (!this.isValidStreetEasyURL(url)) {
        return {
          success: false,
          error: 'Invalid StreetEasy URL format'
        };
      }

      // Fetch the page content
      const response = await fetch(url, {
        method: 'GET',
        headers: this.HEADERS,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch page: ${response.status} ${response.statusText}`
        };
      }

      const html = await response.text();

      // Check for bot detection
      if (this.isBotDetectionPage(html)) {
        return {
          success: false,
          error: 'Bot detection triggered',
          botDetected: true
        };
      }

      // Extract property data from HTML
      const propertyData = this.parsePropertyData(html, url);

      return {
        success: true,
        data: propertyData
      };

    } catch (error) {
      console.error('StreetEasy extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown extraction error'
      };
    }
  }

  /**
   * Validate if URL is a valid StreetEasy property listing
   */
  private static isValidStreetEasyURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'streeteasy.com' && 
             parsed.pathname.includes('/building/');
    } catch {
      return false;
    }
  }

  /**
   * Check if the response indicates bot detection
   */
  private static isBotDetectionPage(html: string): boolean {
    const botDetectionSignals = [
      'Press & Hold to confirm you are',
      'a human (and not a bot)',
      'Reference ID',
      'Press and hold',
      'confirm you are not a bot'
    ];
    
    return botDetectionSignals.some(signal => 
      html.toLowerCase().includes(signal.toLowerCase())
    );
  }

  /**
   * Parse property data from HTML content
   */
  private static parsePropertyData(html: string, originalUrl: string) {
    const data: NonNullable<StreetEasyPropertyData['data']> = {};

    try {
      // Extract price - look for patterns like "$4,250,000" or "$3,200"
      const priceMatch = html.match(/\$[\d,]+(?:\.\d{2})?/);
      if (priceMatch) {
        data.price = priceMatch[0];
        data.priceValue = this.parsePrice(priceMatch[0]);
      }

      // Extract bedrooms and bathrooms - look for patterns like "2 beds" or "3.5 baths"
      const bedsMatch = html.match(/(\d+)\s+beds?/i);
      if (bedsMatch) {
        data.bedrooms = parseInt(bedsMatch[1]);
      }

      const bathsMatch = html.match(/(\d+(?:\.\d+)?)\s+baths?/i);
      if (bathsMatch) {
        data.bathrooms = parseFloat(bathsMatch[1]);
      }

      // Extract rooms - look for patterns like "3 rooms" or "5 rooms"
      const roomsMatch = html.match(/(\d+)\s+rooms?/i);
      if (roomsMatch) {
        data.rooms = `${roomsMatch[1]} rooms`;
      }

      // Extract address from URL or HTML
      data.address = this.extractAddressFromURL(originalUrl);

      // Extract neighborhood - look for known NYC neighborhoods
      const neighborhoodMatch = this.extractNeighborhood(html);
      if (neighborhoodMatch) {
        data.neighborhood = neighborhoodMatch.neighborhood;
        data.borough = neighborhoodMatch.borough;
      }

      // Extract square footage - look for patterns like "1,663 ft²"
      const sqftMatch = html.match(/(\d+,?\d*)\s*ft²/i);
      if (sqftMatch) {
        data.squareFootage = parseInt(sqftMatch[1].replace(',', ''));
      }

      // Extract price per square foot - look for patterns like "$2,315 per ft²"
      const pricePerfMatch = html.match(/\$(\d+,?\d*)\s+per\s+ft²/i);
      if (pricePerfMatch) {
        data.pricePerSquareFoot = parseInt(pricePerfMatch[1].replace(',', ''));
      }

      // Determine listing type (sale vs rental)
      if (html.toLowerCase().includes('for rent') || html.toLowerCase().includes('rental')) {
        data.listingType = 'rental';
      } else if (html.toLowerCase().includes('for sale') || html.toLowerCase().includes('sold')) {
        data.listingType = 'sale';
      }

      // Extract status
      if (html.includes('Sold on')) {
        data.status = 'Sold';
        // Try to extract sold date
        const soldDateMatch = html.match(/Sold on (\d+\/\d+\/\d+)/);
        if (soldDateMatch) {
          data.soldDate = soldDateMatch[1];
        }
      } else if (html.includes('Rented')) {
        data.status = 'Rented';
      } else if (html.toLowerCase().includes('for rent')) {
        data.status = 'For Rent';
      } else if (html.toLowerCase().includes('for sale')) {
        data.status = 'For Sale';
      }

      // Extract building type
      const buildingTypeMatch = html.match(/(Condo|Co-op|Rental unit|Townhouse)/i);
      if (buildingTypeMatch) {
        data.buildingType = buildingTypeMatch[1];
      }

      // Extract days on market if available
      const domMatch = html.match(/(\d+)\s+days?\s+on\s+market/i);
      if (domMatch) {
        data.daysOnMarket = parseInt(domMatch[1]);
      }

    } catch (error) {
      console.error('Error parsing property data:', error);
    }

    return data;
  }

  /**
   * Parse price string to number
   */
  private static parsePrice(priceStr: string): number {
    return parseInt(priceStr.replace(/[$,]/g, ''));
  }

  /**
   * Extract address from StreetEasy URL
   */
  private static extractAddressFromURL(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\/building\/(.+?)\//);
      if (match) {
        // Convert URL format to readable address
        return match[1]
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
          .replace(/(\d+)/, '$1')
          .replace(/\s+/g, ' ')
          .trim();
      }
    } catch (error) {
      console.error('Error extracting address from URL:', error);
    }
    return '';
  }

  /**
   * Extract neighborhood and borough from HTML
   */
  private static extractNeighborhood(html: string): { neighborhood: string; borough: string } | null {
    // Define neighborhood patterns for major NYC areas
    const neighborhoods = {
      'Manhattan': [
        'Upper East Side', 'Upper West Side', 'Midtown', 'Chelsea', 'Greenwich Village',
        'SoHo', 'Tribeca', 'Lower East Side', 'Financial District', 'Hell\'s Kitchen',
        'Murray Hill', 'Gramercy', 'Union Square', 'Flatiron', 'NoMad',
        'Carnegie Hill', 'Yorkville', 'East Village', 'West Village', 'Hudson Square'
      ],
      'Brooklyn': [
        'Park Slope', 'Williamsburg', 'DUMBO', 'Brooklyn Heights', 'Prospect Heights',
        'Fort Greene', 'Carroll Gardens', 'Cobble Hill', 'Red Hook', 'Gowanus',
        'Boerum Hill', 'Downtown Brooklyn', 'Greenpoint', 'Bushwick', 'Bedford-Stuyvesant'
      ],
      'Queens': [
        'Long Island City', 'Astoria', 'Forest Hills', 'Flushing', 'Jamaica',
        'Elmhurst', 'Jackson Heights', 'Woodside', 'Sunnyside', 'Ridgewood'
      ],
      'Bronx': [
        'Riverdale', 'Fordham', 'Bronx Park', 'Mott Haven', 'South Bronx'
      ],
      'Staten Island': [
        'St. George', 'Stapleton', 'New Brighton', 'West Brighton'
      ]
    };

    // Search for neighborhood mentions in the HTML
    for (const [borough, neighborhoodList] of Object.entries(neighborhoods)) {
      for (const neighborhood of neighborhoodList) {
        if (html.includes(neighborhood)) {
          return { neighborhood, borough };
        }
      }
    }

    // Fallback: look for borough mentions
    for (const borough of Object.keys(neighborhoods)) {
      if (html.includes(borough)) {
        return { neighborhood: '', borough };
      }
    }

    return null;
  }
}