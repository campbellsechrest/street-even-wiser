// Geocoding service using NYC Geoclient API and OpenStreetMap
interface GeocodingResult {
  lat: number;
  lng: number;
  borough: string;
  formattedAddress: string;
  neighborhood?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city?: string;
    borough?: string;
    state?: string;
  };
}

class GeocodingService {
  private static instance: GeocodingService;

  static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
      // Use OpenStreetMap Nominatim for free geocoding
      const encodedAddress = encodeURIComponent(`${address}, New York, NY, USA`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Streetwise-RealEstate-Platform'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }
      
      const results: NominatimResult[] = await response.json();
      
      if (results.length === 0) {
        return null;
      }
      
      const result = results[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      
      // Determine NYC borough from coordinates
      const borough = this.getBoroughFromCoordinates(lat, lng);
      
      // Extract raw neighborhood from OSM - prefer quarter for accurate neighborhood data
      const rawNeighborhood = result.address?.quarter || result.address?.neighbourhood || result.address?.suburb;
      
      // Refine neighborhood based on address and raw neighborhood data
      const refinedNeighborhood = this.refineNeighborhood(rawNeighborhood, result.display_name);
      
      return {
        lat,
        lng,
        borough,
        formattedAddress: result.display_name,
        neighborhood: refinedNeighborhood
      };
      
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  }

  async extractFromStreetEasyUrl(url: string): Promise<GeocodingResult | null> {
    try {
      // Extract address from StreetEasy URL pattern
      // Example: https://streeteasy.com/building/41-5-avenue-new_york/1f
      const matches = url.match(/building\/([^\/]+)/);
      if (!matches) {
        return null;
      }
      
      // Convert URL format to readable address
      const addressSlug = matches[1];
      const address = addressSlug
        .replace(/-/g, ' ')
        .replace('_new_york', '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
      
      return this.geocodeAddress(address);
      
    } catch (error) {
      console.error("StreetEasy URL parsing error:", error);
      return null;
    }
  }

  private refineNeighborhood(rawNeighborhood: string | undefined, fullAddress: string): string | undefined {
    if (!rawNeighborhood) return undefined;
    
    const rawLower = rawNeighborhood.toLowerCase();
    const addressLower = fullAddress.toLowerCase();
    
    // Refine Upper East Side neighborhoods based on street addresses
    if (rawLower.includes('upper east side')) {
      // Lenox Hill: East 60th to East 84th Streets (between Park Ave and East River)
      if (addressLower.includes(' east ') || addressLower.includes(' e ')) {
        const streetMatch = addressLower.match(/\b(?:east\s+|e\s+)(\d+)(?:st|nd|rd|th)/);
        if (streetMatch) {
          const streetNum = parseInt(streetMatch[1]);
          if (streetNum >= 60 && streetNum <= 84) {
            return "Lenox Hill";
          }
          if (streetNum >= 85 && streetNum <= 96) {
            return "Yorkville";
          }
          if (streetNum >= 96) {
            return "Carnegie Hill";
          }
        }
      }
      
      // Check for specific avenue patterns
      if (addressLower.includes('lexington') || addressLower.includes('park avenue') || addressLower.includes('madison')) {
        const streetMatch = addressLower.match(/\b(\d+)\s+(?:east|e)\s+(\d+)(?:st|nd|rd|th)/);
        if (streetMatch) {
          const streetNum = parseInt(streetMatch[2]);
          if (streetNum >= 60 && streetNum <= 84) {
            return "Lenox Hill";
          }
        }
      }
      
      // Default to Upper East Side if no specific refinement found
      return "Upper East Side";
    }
    
    // Refine Upper West Side neighborhoods
    if (rawLower.includes('upper west side')) {
      if (addressLower.includes(' west ') || addressLower.includes(' w ')) {
        const streetMatch = addressLower.match(/\b(?:west\s+|w\s+)(\d+)(?:st|nd|rd|th)/);
        if (streetMatch) {
          const streetNum = parseInt(streetMatch[1]);
          if (streetNum >= 59 && streetNum <= 72) {
            return "Lincoln Square";
          }
          if (streetNum >= 73 && streetNum <= 89) {
            return "Upper West Side";
          }
          if (streetNum >= 90) {
            return "Manhattan Valley";
          }
        }
      }
      return "Upper West Side";
    }
    
    // Refine Midtown neighborhoods
    if (rawLower.includes('midtown')) {
      if (addressLower.includes(' east ') || addressLower.includes(' e ')) {
        return "Midtown East";
      }
      if (addressLower.includes(' west ') || addressLower.includes(' w ')) {
        return "Midtown West";
      }
      if (addressLower.includes('5th avenue') || addressLower.includes('fifth avenue')) {
        return "Midtown";
      }
      return rawNeighborhood; // Keep original if no specific refinement
    }
    
    // Return original neighborhood if no refinement rules apply
    return rawNeighborhood;
  }

  private getBoroughFromCoordinates(lat: number, lng: number): string {
    // Approximate borough boundaries for NYC
    // These are rough estimates - in production, use proper borough boundary shapefiles
    
    // Manhattan: roughly south of 220th St, west of East River
    if (lat >= 40.70 && lat <= 40.88 && lng >= -74.02 && lng <= -73.93) {
      return "Manhattan";
    }
    
    // Brooklyn: south of Manhattan, west of Queens
    if (lat >= 40.57 && lat <= 40.74 && lng >= -74.04 && lng <= -73.83) {
      return "Brooklyn";
    }
    
    // Queens: east of Manhattan/Brooklyn
    if (lat >= 40.54 && lat <= 40.80 && lng >= -73.96 && lng <= -73.70) {
      return "Queens";
    }
    
    // Bronx: north of Manhattan
    if (lat >= 40.79 && lat <= 40.92 && lng >= -73.93 && lng <= -73.76) {
      return "Bronx";
    }
    
    // Staten Island: southwest of other boroughs
    if (lat >= 40.50 && lat <= 40.65 && lng >= -74.26 && lng <= -74.05) {
      return "Staten Island";
    }
    
    // Default fallback
    return "Manhattan";
  }
}

export default GeocodingService;