interface WalkabilityResult {
  score: number;
  explanation: string;
  dataSource: string;
  amenitiesNearby: number;
  transitAccess: number;
  pedestrianFriendly: number;
}

interface PlaceSearchResult {
  name: string;
  types: string[];
  rating?: number;
  distance?: number;
  vicinity?: string;
}

export class WalkabilityService {
  private static instance: WalkabilityService;

  static getInstance(): WalkabilityService {
    if (!WalkabilityService.instance) {
      WalkabilityService.instance = new WalkabilityService();
    }
    return WalkabilityService.instance;
  }

  async calculateWalkabilityScore(lat: number, lng: number, address?: string): Promise<WalkabilityResult> {
    try {
      console.log(`[WalkabilityService] Calculating walkability score for: ${lat}, ${lng} (${address || 'no address'})`);
      
      // Use multiple approaches to calculate walkability
      const scores = await Promise.allSettled([
        this.calculateAmenitiesScore(lat, lng),
        this.calculateTransitScore(lat, lng),
        this.calculatePedestrianScore(lat, lng, address)
      ]);

      // Extract scores or use defaults for failed calculations
      const amenitiesScore = scores[0].status === 'fulfilled' ? scores[0].value : 50;
      const transitScore = scores[1].status === 'fulfilled' ? scores[1].value : 50;
      const pedestrianScore = scores[2].status === 'fulfilled' ? scores[2].value : 50;

      // Weighted average: amenities 40%, transit 35%, pedestrian 25%
      const finalScore = Math.round(
        (amenitiesScore * 0.4) + 
        (transitScore * 0.35) + 
        (pedestrianScore * 0.25)
      );

      return {
        score: Math.max(0, Math.min(100, finalScore)),
        explanation: this.generateExplanation(amenitiesScore, transitScore, pedestrianScore, finalScore),
        dataSource: "NYC Open Data + OpenStreetMap",
        amenitiesNearby: amenitiesScore,
        transitAccess: transitScore,
        pedestrianFriendly: pedestrianScore
      };

    } catch (error) {
      console.error("Walkability calculation error:", error);
      return this.getFallbackScore(lat, lng, address);
    }
  }

  private async calculateAmenitiesScore(lat: number, lng: number): Promise<number> {
    try {
      // Search for key amenities using Overpass API (OpenStreetMap)
      const amenityTypes = [
        'grocery', 'supermarket', 'convenience',  // Food
        'restaurant', 'cafe', 'fast_food',       // Dining
        'pharmacy', 'hospital', 'clinic',        // Healthcare
        'bank', 'atm', 'post_office',           // Services
        'school', 'library',                     // Education
        'park', 'playground'                     // Recreation
      ];

      let totalAmenities = 0;
      const searchRadius = 0.75; // Increased to 0.75 miles for better coverage
      
      console.log(`[WalkabilityService] Searching for amenities within ${searchRadius} miles of ${lat}, ${lng}`);

      // Use NYC Open Data for businesses and amenities
      const nyBusinesses = await this.searchNYCBusinesses(lat, lng, searchRadius);
      console.log(`[WalkabilityService] Found ${nyBusinesses} businesses from NYC Open Data`);
      totalAmenities += nyBusinesses;

      // Use Overpass API for OpenStreetMap data as backup
      const osmAmenities = await this.searchOSMAmenities(lat, lng, searchRadius, amenityTypes);
      console.log(`[WalkabilityService] Found ${osmAmenities} amenities from OpenStreetMap`);
      totalAmenities += osmAmenities;
      
      console.log(`[WalkabilityService] Total amenities found: ${totalAmenities}`);

      // Score based on number of amenities within walking distance
      // 0-5 amenities: poor (0-30)
      // 6-15 amenities: fair (31-60)
      // 16-30 amenities: good (61-85)
      // 31+ amenities: excellent (86-100)
      
      if (totalAmenities <= 5) {
        return Math.min(30, totalAmenities * 6);
      } else if (totalAmenities <= 15) {
        return 31 + ((totalAmenities - 5) * 3);
      } else if (totalAmenities <= 30) {
        return 61 + ((totalAmenities - 15) * 1.6);
      } else {
        return Math.min(100, 86 + ((totalAmenities - 30) * 0.5));
      }

    } catch (error) {
      console.error("Amenities score calculation error:", error);
      return 50; // Default neutral score
    }
  }

  private async searchNYCBusinesses(lat: number, lng: number, radiusMiles: number): Promise<number> {
    try {
      // Use NYC Open Data for businesses
      const datasets = [
        'https://data.cityofnewyork.us/resource/w7w3-xahh.json', // Business Licenses
        'https://data.cityofnewyork.us/resource/9w7m-hzhe.json'  // Retail Food Stores
      ];

      let businessCount = 0;

      for (const dataset of datasets) {
        try {
          // Fix spatial query syntax for NYC Open Data - try multiple field names
          const radiusMeters = Math.round(radiusMiles * 1609);
          
          // Try different possible location field names
          const locationFields = ['location', 'the_geom', 'georeference', 'coordinates'];
          let foundBusinesses = 0;
          
          for (const field of locationFields) {
            try {
              const query = `$where=within_circle(${field}, ${lat}, ${lng}, ${radiusMeters})`;
              const url = `${dataset}?${query}&$limit=100`;
              console.log(`[WalkabilityService] Trying field '${field}' with query: ${url}`);
              
              const response = await fetch(url);
              if (response.ok) {
                const businesses = await response.json();
                if (businesses.length > 0) {
                  foundBusinesses = businesses.length;
                  businessCount += Math.min(businesses.length, 20); // Cap per dataset
                  console.log(`[WalkabilityService] Found ${businesses.length} businesses using field '${field}'`);
                  break; // Use first successful field
                }
              } else {
                console.log(`[WalkabilityService] Field '${field}' failed: ${response.status}`);
              }
            } catch (fieldError) {
              console.log(`[WalkabilityService] Field '${field}' error:`, fieldError.message);
              continue;
            }
          }
          
          if (foundBusinesses === 0) {
            console.log(`[WalkabilityService] No businesses found for any location field in dataset`);
          }
        } catch (datasetError) {
          console.log(`Error with dataset ${dataset}:`, datasetError);
          continue;
        }
      }

      return businessCount;

    } catch (error) {
      console.error("NYC businesses search error:", error);
      return 0;
    }
  }

  private async searchOSMAmenities(lat: number, lng: number, radiusMiles: number, amenityTypes: string[]): Promise<number> {
    try {
      // Convert miles to meters for Overpass API
      const radiusMeters = Math.round(radiusMiles * 1609.34);
      console.log(`[WalkabilityService] Searching OSM amenities within ${radiusMeters}m (${radiusMiles} miles) of ${lat}, ${lng}`);
      
      // Build proper Overpass QL query for amenities - get actual data, not just count
      const query = `
        [out:json][timeout:25];
        (
          node[amenity~"^(${amenityTypes.join('|')})$"](around:${radiusMeters},${lat},${lng});
          way[amenity~"^(${amenityTypes.join('|')})$"](around:${radiusMeters},${lat},${lng});
        );
        out geom;
      `;

      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      console.log(`[WalkabilityService] Sending Overpass query for amenity types: ${amenityTypes.join(', ')}`);
      
      const response = await fetch(overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'NeighborhoodEnrichment/1.0'
        },
        body: query
      });

      if (response.ok) {
        const data = await response.json();
        const amenityCount = data.elements?.length || 0;
        console.log(`[WalkabilityService] OpenStreetMap returned ${amenityCount} amenities`);
        
        // Log some sample amenities for debugging
        if (data.elements && data.elements.length > 0) {
          const samples = data.elements.slice(0, 3).map(el => ({
            type: el.type,
            amenity: el.tags?.amenity,
            name: el.tags?.name || 'unnamed'
          }));
          console.log(`[WalkabilityService] Sample OSM amenities:`, samples);
        }
        
        return amenityCount;
      } else {
        console.log(`[WalkabilityService] Overpass API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log(`[WalkabilityService] Error response:`, errorText.substring(0, 200));
        return 0;
      }

    } catch (error) {
      console.error("[WalkabilityService] OSM amenities search error:", error);
      return 0;
    }
  }

  private async calculateTransitScore(lat: number, lng: number): Promise<number> {
    try {
      // Calculate based on proximity to various transit options
      let transitScore = 0;
      
      // Check subway proximity (use our existing subway service)
      const subwayDistance = await this.findNearestSubway(lat, lng);
      if (subwayDistance <= 0.25) transitScore += 40; // Excellent subway access
      else if (subwayDistance <= 0.5) transitScore += 30; // Good subway access
      else if (subwayDistance <= 1.0) transitScore += 20; // Fair subway access
      else if (subwayDistance <= 1.5) transitScore += 10; // Poor subway access

      // Check bus stops using NYC Open Data
      const busScore = await this.calculateBusProximity(lat, lng);
      transitScore += busScore;

      // Check bike share stations
      const bikeScore = await this.calculateBikeShareProximity(lat, lng);
      transitScore += bikeScore;

      return Math.min(100, transitScore);

    } catch (error) {
      console.error("Transit score calculation error:", error);
      return 50;
    }
  }

  private async findNearestSubway(lat: number, lng: number): Promise<number> {
    try {
      // Use the actual subway service instead of hardcoded stations
      const { SubwayProximityService } = await import('./subwayProximity');
      const subwayService = SubwayProximityService.getInstance();
      const result = await subwayService.calculateSubwayScore(lat, lng);
      
      console.log(`[WalkabilityService] Subway distance from subway service: ${result.distanceInMiles} miles`);
      return result.distanceInMiles;
      
    } catch (error) {
      console.error("[WalkabilityService] Error using subway service, falling back to basic calculation:", error);
      
      // Fallback to basic calculation with comprehensive Upper East Side stations
      const majorSubwayCorridors = [
        { lat: 40.7589, lng: -73.9851, name: "Times Square" },
        { lat: 40.7527, lng: -73.9772, name: "Grand Central" },
        { lat: 40.7348, lng: -73.9897, name: "Union Square" },
        { lat: 40.7794, lng: -73.9554, name: "86th St (Lexington Av)" }, // CRITICAL for UES
        { lat: 40.7782, lng: -73.9535, name: "86th St (2nd Av)" },
        { lat: 40.7738, lng: -73.9626, name: "77th St (Lexington Av)" },
        { lat: 40.7849, lng: -73.9510, name: "96th St (Lexington Av)" },
        { lat: 40.6840, lng: -73.9773, name: "Atlantic Ave" }
      ];

      let minDistance = Infinity;
      for (const station of majorSubwayCorridors) {
        const distance = this.calculateDistance(lat, lng, station.lat, station.lng);
        if (distance < minDistance) {
          minDistance = distance;
        }
      }

      return minDistance;
    }
  }

  private async calculateBusProximity(lat: number, lng: number): Promise<number> {
    try {
      // Use NYC Open Data for bus stops
      const radiusMeters = 800; // ~0.5 miles
      const query = `$where=within_circle(the_geom, ${lat}, ${lng}, ${radiusMeters})`;
      const url = `https://data.cityofnewyork.us/resource/2uk8-8ypb.json?${query}&$limit=20`;

      const response = await fetch(url);
      if (!response.ok) {
        return 15; // Default moderate bus access
      }

      const busStops = await response.json();
      const stopCount = busStops.length;

      // Score based on number of nearby bus stops
      if (stopCount >= 10) return 30; // Excellent
      if (stopCount >= 5) return 25;  // Good
      if (stopCount >= 2) return 20;  // Fair
      if (stopCount >= 1) return 15;  // Poor
      return 10; // Very poor

    } catch (error) {
      console.error("Bus proximity calculation error:", error);
      return 15;
    }
  }

  private async calculateBikeShareProximity(lat: number, lng: number): Promise<number> {
    try {
      // Use NYC Citi Bike station data
      const radiusMeters = 500; // ~0.3 miles
      const query = `$where=within_circle(the_geom, ${lat}, ${lng}, ${radiusMeters})`;
      const url = `https://data.cityofnewyork.us/resource/755u-8jsi.json?${query}&$limit=10`;

      const response = await fetch(url);
      if (!response.ok) {
        return 5; // Default
      }

      const bikeStations = await response.json();
      const stationCount = bikeStations.length;

      // Score based on bike share availability
      if (stationCount >= 5) return 15; // Excellent
      if (stationCount >= 3) return 12; // Good
      if (stationCount >= 1) return 8;  // Fair
      return 5; // Poor

    } catch (error) {
      console.error("Bike share proximity calculation error:", error);
      return 5;
    }
  }

  private async calculatePedestrianScore(lat: number, lng: number, address?: string): Promise<number> {
    try {
      let pedestrianScore = 60; // Start with neutral base

      // Analyze neighborhood characteristics
      const neighborhood = await this.analyzeNeighborhoodWalkability(lat, lng);
      pedestrianScore += neighborhood;

      // Check for pedestrian infrastructure using address patterns
      if (address) {
        const addressScore = this.analyzeAddressWalkability(address);
        pedestrianScore += addressScore;
      }

      return Math.max(0, Math.min(100, pedestrianScore));

    } catch (error) {
      console.error("Pedestrian score calculation error:", error);
      return 60;
    }
  }

  private async analyzeNeighborhoodWalkability(lat: number, lng: number): Promise<number> {
    try {
      // Manhattan generally has higher walkability
      if (lat >= 40.70 && lat <= 40.88 && lng >= -74.02 && lng <= -73.93) {
        if (lat >= 40.75 && lat <= 40.78) return 25; // Midtown - excellent
        if (lat >= 40.72 && lat <= 40.75) return 20; // Lower Manhattan - very good
        if (lat >= 40.78 && lat <= 40.82) return 15; // Upper Manhattan - good
        return 10; // Other Manhattan areas - fair
      }

      // Brooklyn - varies by area
      if (lat >= 40.57 && lat <= 40.74 && lng >= -74.04 && lng <= -73.83) {
        return 5; // Generally moderate walkability
      }

      // Queens, Bronx, Staten Island - generally lower walkability
      return 0;

    } catch (error) {
      console.error("Neighborhood walkability analysis error:", error);
      return 5;
    }
  }

  private analyzeAddressWalkability(address: string): number {
    const lowerAddress = address.toLowerCase();
    
    // Manhattan streets tend to be more walkable
    if (lowerAddress.includes('avenue') || lowerAddress.includes('street')) {
      if (lowerAddress.includes('broadway') || lowerAddress.includes('madison') || 
          lowerAddress.includes('lexington') || lowerAddress.includes('park avenue')) {
        return 10; // Major avenues - excellent walkability
      }
      return 5; // Regular streets - good walkability
    }
    
    return 0; // Other address patterns
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Haversine formula to calculate distance in miles
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private generateExplanation(amenities: number, transit: number, pedestrian: number, final: number): string {
    let quality = "poor";
    if (final >= 80) quality = "excellent";
    else if (final >= 65) quality = "good";
    else if (final >= 50) quality = "moderate";
    else if (final >= 35) quality = "fair";

    const details = [];
    if (amenities >= 70) details.push("many nearby amenities");
    else if (amenities >= 50) details.push("some nearby amenities");
    else details.push("few nearby amenities");

    if (transit >= 70) details.push("excellent transit access");
    else if (transit >= 50) details.push("good transit access");
    else details.push("limited transit access");

    if (pedestrian >= 70) details.push("very pedestrian-friendly");
    else if (pedestrian >= 50) details.push("pedestrian-friendly");
    else details.push("car-dependent area");

    return `${quality} walkability (${final}/100): ${details.join(", ")}`;
  }

  private getFallbackScore(lat: number, lng: number, address?: string): WalkabilityResult {
    // Provide basic fallback scoring based on NYC geography
    let score = 40; // Base score
    
    // Manhattan gets higher base score
    if (lat >= 40.70 && lat <= 40.88 && lng >= -74.02 && lng <= -73.93) {
      score = 75;
    }
    // Brooklyn downtown areas
    else if (lat >= 40.68 && lat <= 40.72 && lng >= -73.99 && lng <= -73.95) {
      score = 65;
    }
    // Other areas
    else {
      score = 45;
    }

    return {
      score,
      explanation: `Estimated walkability based on neighborhood characteristics (${score}/100)`,
      dataSource: "Geographic estimation",
      amenitiesNearby: Math.round(score * 0.8),
      transitAccess: Math.round(score * 0.9),
      pedestrianFriendly: Math.round(score * 0.7)
    };
  }
}