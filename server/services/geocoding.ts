interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  confidence: number;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
  importance: number;
}

export class GeocodingService {
  private static instance: GeocodingService;
  private readonly baseUrl = 'https://nominatim.openstreetmap.org/search';
  
  static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  /**
   * Geocode an address to coordinates using OpenStreetMap Nominatim API
   */
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    console.log(`[Geocoding] Geocoding address: ${address}`);
    
    try {
      // Add NYC context to improve accuracy for NYC addresses
      const searchQuery = address.toLowerCase().includes('new york') || 
                         address.toLowerCase().includes('nyc') || 
                         address.toLowerCase().includes('brooklyn') ||
                         address.toLowerCase().includes('manhattan') ||
                         address.toLowerCase().includes('queens') ||
                         address.toLowerCase().includes('bronx') ||
                         address.toLowerCase().includes('staten island')
                         ? address 
                         : `${address}, New York, NY, USA`;

      const params = new URLSearchParams({
        q: searchQuery,
        format: 'json',
        limit: '1',
        countrycodes: 'US', // Limit to United States
        bounded: '1',
        viewbox: '-74.2591,40.4774,-73.7004,40.9176', // NYC bounding box
        addressdetails: '1'
      });

      const url = `${this.baseUrl}?${params}`;
      console.log(`[Geocoding] Making request to: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'StreetWise/1.0 (Property Analysis Service)'
        }
      });

      if (!response.ok) {
        console.error(`[Geocoding] API request failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: NominatimResponse[] = await response.json();
      console.log(`[Geocoding] Received ${data.length} results`);

      if (data.length === 0) {
        console.log(`[Geocoding] No results found for address: ${address}`);
        return null;
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      // Validate coordinates are in reasonable NYC area
      if (lat < 40.4 || lat > 41.0 || lng < -74.3 || lng > -73.6) {
        console.warn(`[Geocoding] Coordinates outside NYC area: ${lat}, ${lng}`);
        // Still return the result but with lower confidence
      }

      const geocodingResult: GeocodingResult = {
        lat,
        lng,
        formattedAddress: result.display_name,
        confidence: Math.min(100, (result.importance || 0.5) * 100) // Convert importance to 0-100 scale
      };

      console.log(`[Geocoding] Geocoded "${address}" to ${lat}, ${lng} (confidence: ${geocodingResult.confidence})`);
      return geocodingResult;

    } catch (error) {
      console.error(`[Geocoding] Error geocoding address "${address}":`, error);
      return null;
    }
  }

  /**
   * Validate if coordinates are within NYC boundaries
   */
  isWithinNYC(lat: number, lng: number): boolean {
    return lat >= 40.4774 && lat <= 40.9176 && lng >= -74.2591 && lng <= -73.7004;
  }

  /**
   * Get borough name from coordinates (rough approximation)
   */
  getBoroughFromCoordinates(lat: number, lng: number): string {
    // Very rough borough boundaries for basic classification
    if (lat >= 40.8 && lng >= -73.95) return 'Bronx';
    if (lat <= 40.65 && lng <= -74.0) return 'Staten Island';
    if (lat <= 40.75 && lng >= -73.95) return 'Brooklyn';
    if (lat >= 40.75 && lng <= -73.85) return 'Queens';
    return 'Manhattan'; // Default fallback
  }
}