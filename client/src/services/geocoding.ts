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
      
      return {
        lat,
        lng,
        borough,
        formattedAddress: result.display_name,
        neighborhood: result.address?.neighbourhood || result.address?.suburb
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