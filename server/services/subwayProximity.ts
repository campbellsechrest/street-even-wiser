import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { subwayStations, InsertSubwayStation, SubwayStation } from "../../shared/schema";

interface SubwayStationData {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  location_type?: string;
  parent_station?: string;
}

interface SubwayProximityResult {
  score: number;
  nearestStation: string;
  distanceInMiles: number;
  explanation: string;
  dataSource: string;
}

export class SubwayProximityService {
  private static instance: SubwayProximityService;
  private stationsCache: Map<string, SubwayStation> = new Map();
  private cacheExpiry: number = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): SubwayProximityService {
    if (!SubwayProximityService.instance) {
      SubwayProximityService.instance = new SubwayProximityService();
    }
    return SubwayProximityService.instance;
  }

  async calculateSubwayScore(lat: number, lng: number): Promise<SubwayProximityResult> {
    try {
      console.log(`[SubwayService] Calculating subway score for coordinates: ${lat}, ${lng}`);
      
      // 1. Ensure we have fresh subway station data
      await this.ensureStationData();
      
      // 2. Find all stations within reasonable distance (5 miles)
      const nearbyStations = await this.findNearbyStations(lat, lng, 5.0);
      console.log(`[SubwayService] Found ${nearbyStations.length} stations within 5 miles`);
      
      if (nearbyStations.length === 0) {
        console.log(`[SubwayService] WARNING: No subway stations found within 5 miles of ${lat}, ${lng}`);
        // Try a larger radius to see if there are any stations at all
        const allStations = await this.findNearbyStations(lat, lng, 10.0);
        console.log(`[SubwayService] DEBUG: Found ${allStations.length} stations within 10 miles`);
        if (allStations.length > 0) {
          console.log(`[SubwayService] DEBUG: Closest station is ${allStations[0].name} at ${allStations[0].distance.toFixed(2)} miles`);
        }
        return {
          score: 0,
          nearestStation: "No nearby stations",
          distanceInMiles: 999,
          explanation: "No subway stations within 5 miles",
          dataSource: "NYC MTA GTFS Data"
        };
      }
      
      // 3. Find the closest station
      const closestStation = nearbyStations[0];
      const distanceInMiles = closestStation.distance;
      
      // 4. Calculate score based on distance with NYC-specific weighting
      const score = this.calculateScoreFromDistance(distanceInMiles);
      
      // 5. Generate explanation
      const explanation = this.generateExplanation(closestStation, distanceInMiles, score);
      
      return {
        score,
        nearestStation: closestStation.name,
        distanceInMiles,
        explanation,
        dataSource: "NYC MTA GTFS Data"
      };
      
    } catch (error) {
      console.error("Subway proximity calculation error:", error);
      return {
        score: 50, // Default neutral score
        nearestStation: "Data unavailable",
        distanceInMiles: 0,
        explanation: "Unable to calculate subway proximity",
        dataSource: "Fallback"
      };
    }
  }

  private async ensureStationData(): Promise<void> {
    try {
      // Check if we have recent station data
      const stationCount = await db.select({ count: sql<number>`count(*)` }).from(subwayStations);
      const hasData = stationCount[0]?.count > 0;
      
      console.log(`[SubwayService] Station data check: ${stationCount[0]?.count || 0} stations in database`);
      
      if (!hasData) {
        console.log("[SubwayService] No station data found, loading fallback stations directly...");
        // Load fallback stations immediately since external APIs are unreliable
        await this.loadFallbackStations();
        
        // Try external sources as supplement (but don't rely on them)
        try {
          await this.loadStationDataFromMTA();
        } catch (error) {
          console.log("[SubwayService] External MTA data failed, using fallback stations only");
        }
        
        // Verify stations were loaded
        const newCount = await db.select({ count: sql<number>`count(*)` }).from(subwayStations);
        console.log(`[SubwayService] After loading: ${newCount[0]?.count || 0} stations in database`);
      } else {
        console.log(`[SubwayService] Using existing ${stationCount[0].count} stations from cache`);
      }
      
    } catch (error) {
      console.error("[SubwayService] Error ensuring station data:", error);
      // Continue with existing data or fallback
    }
  }

  private async loadStationDataFromMTA(): Promise<void> {
    try {
      // Use NYC MTA GTFS data - stops.txt equivalent via SODA API
      const urls = [
        'https://data.ny.gov/resource/39hk-dx4f.json', // NYC Transit Subway Entrances and Exits
        'https://data.cityofnewyork.us/resource/kk4q-3rt2.json' // Subway Stations
      ];

      for (const url of urls) {
        try {
          console.log(`Fetching subway data from: ${url}`);
          
          const response = await fetch(`${url}?$limit=1000`);
          if (!response.ok) {
            console.log(`Failed to fetch from ${url}: ${response.status}`);
            continue;
          }
          
          const stations = await response.json();
          console.log(`Received ${stations.length} station records`);
          
          if (stations.length > 0) {
            await this.processAndStoreStations(stations, url);
            break; // Use first successful source
          }
          
        } catch (sourceError) {
          console.error(`Error with source ${url}:`, sourceError);
          continue;
        }
      }
      
    } catch (error) {
      console.error("Error loading MTA station data:", error);
      // Fallback to hardcoded major stations
      await this.loadFallbackStations();
    }
  }

  private async processAndStoreStations(stationsData: any[], source: string): Promise<void> {
    try {
      const processedStations: InsertSubwayStation[] = [];
      
      for (const station of stationsData) {
        const processed = this.normalizeStationData(station, source);
        if (processed) {
          processedStations.push(processed);
        }
      }
      
      if (processedStations.length > 0) {
        console.log(`Inserting ${processedStations.length} processed stations`);
        
        // Use upsert to handle duplicates
        for (const station of processedStations) {
          await db.insert(subwayStations)
            .values(station)
            .onConflictDoUpdate({
              target: subwayStations.id,
              set: {
                name: station.name,
                lat: station.lat,
                lng: station.lng,
                lines: station.lines,
                borough: station.borough,
                lastUpdated: sql`now()`
              }
            });
        }
        
        console.log(`Successfully stored ${processedStations.length} subway stations`);
      }
      
    } catch (error) {
      console.error("Error processing station data:", error);
    }
  }

  private normalizeStationData(rawStation: any, source: string): InsertSubwayStation | null {
    try {
      // Handle different data formats from different NYC Open Data sources
      let id: string;
      let name: string;
      let lat: number | null = null;
      let lng: number | null = null;
      let lines: string = "Unknown";
      let borough: string | undefined;
      
      // Extract station basic info
      if (source.includes('39hk-dx4f')) {
        // NYC Transit Subway Entrances format
        id = rawStation.station_name?.replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 5);
        name = rawStation.station_name || rawStation.stop_name || 'Unknown Station';
        lines = rawStation.daytime_routes || rawStation.line || "Unknown";
        borough = rawStation.borough;
      } else {
        // Generic format
        id = rawStation.objectid?.toString() || rawStation.stop_id || rawStation.id?.toString() || Math.random().toString(36);
        name = rawStation.name || rawStation.stop_name || rawStation.station_name || 'Unknown Station';
        lines = rawStation.line || rawStation.routes || rawStation.lines || "Unknown";
        borough = rawStation.borough || rawStation.boro;
      }
      
      // Robust coordinate extraction with comprehensive field checking
      const coords = this.extractCoordinates(rawStation, source);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
      
      // Validate coordinates - reject if parsing failed
      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
        console.log(`[SubwayService] Skipping station ${name}: failed to extract valid coordinates from data:`, {
          rawFields: Object.keys(rawStation).filter(k => k.toLowerCase().includes('lat') || k.toLowerCase().includes('lng') || k.toLowerCase().includes('geo') || k.toLowerCase().includes('location')),
          extractedLat: lat,
          extractedLng: lng
        });
        return null;
      }
      
      // NYC bounds check with tolerance
      if (lat < 40.4 || lat > 41.0 || lng < -74.3 || lng > -73.7) {
        console.log(`[SubwayService] Skipping station ${name}: outside NYC bounds lat=${lat}, lng=${lng}`);
        return null;
      }
      
      console.log(`[SubwayService] Successfully normalized station: ${name} at ${lat}, ${lng}`);
      
      return {
        id: id.toString(),
        name: name.trim(),
        lat,
        lng,
        lines: JSON.stringify(typeof lines === 'string' ? lines.split(',').map(l => l.trim()) : [lines]),
        borough
      };
      
    } catch (error) {
      console.error("Error normalizing station data:", error, rawStation);
      return null;
    }
  }

  private extractCoordinates(rawStation: any, source: string): { lat: number; lng: number } | null {
    try {
      // Method 1: Direct numeric fields
      const directFields = [
        // Standard coordinate field names
        { lat: 'lat', lng: 'lng' },
        { lat: 'latitude', lng: 'longitude' },
        { lat: 'stop_lat', lng: 'stop_lon' },
        { lat: 'station_lat', lng: 'station_lon' },
        { lat: 'station_latitude', lng: 'station_longitude' },
        // Dataset-specific fields
        { lat: 'gtfs_latitude', lng: 'gtfs_longitude' },
        { lat: 'entrance_latitude', lng: 'entrance_longitude' },
        { lat: 'exit_latitude', lng: 'exit_longitude' }
      ];
      
      for (const fieldPair of directFields) {
        const latVal = rawStation[fieldPair.lat];
        const lngVal = rawStation[fieldPair.lng];
        
        if (latVal != null && lngVal != null) {
          const lat = this.parseNumeric(latVal);
          const lng = this.parseNumeric(lngVal);
          if (lat !== null && lng !== null && lat !== 0 && lng !== 0) {
            console.log(`[SubwayService] Extracted coordinates from ${fieldPair.lat}/${fieldPair.lng}: ${lat}, ${lng}`);
            return { lat, lng };
          }
        }
      }
      
      // Method 2: Geometry objects with coordinates array
      const geomFields = ['the_geom', 'geom', 'location', 'georeference', 'geometry'];
      for (const field of geomFields) {
        const geom = rawStation[field];
        if (geom && typeof geom === 'object') {
          // Check for coordinates array: { coordinates: [lng, lat] }
          if (geom.coordinates && Array.isArray(geom.coordinates)) {
            const coords = geom.coordinates;
            if (coords.length >= 2) {
              const lng = this.parseNumeric(coords[0]);
              const lat = this.parseNumeric(coords[1]);
              if (lat !== null && lng !== null && lat !== 0 && lng !== 0) {
                console.log(`[SubwayService] Extracted coordinates from ${field}.coordinates: ${lat}, ${lng}`);
                return { lat, lng };
              }
            }
          }
          
          // Check for nested lat/lng fields
          if (geom.latitude != null && geom.longitude != null) {
            const lat = this.parseNumeric(geom.latitude);
            const lng = this.parseNumeric(geom.longitude);
            if (lat !== null && lng !== null && lat !== 0 && lng !== 0) {
              console.log(`[SubwayService] Extracted coordinates from ${field} nested: ${lat}, ${lng}`);
              return { lat, lng };
            }
          }
        }
        
        // Method 3: WKT string parsing (e.g., "POINT (-73.955 40.779)")
        if (typeof geom === 'string' && geom.includes('POINT')) {
          const coords = this.parseWKTPoint(geom);
          if (coords) {
            console.log(`[SubwayService] Extracted coordinates from WKT ${field}: ${coords.lat}, ${coords.lng}`);
            return coords;
          }
        }
      }
      
      // Method 4: Try parsing string fields that might contain coordinates
      const stringFields = ['coordinates', 'coord', 'point', 'pos', 'position'];
      for (const field of stringFields) {
        const value = rawStation[field];
        if (typeof value === 'string') {
          const coords = this.parseCoordinateString(value);
          if (coords) {
            console.log(`[SubwayService] Extracted coordinates from string ${field}: ${coords.lat}, ${coords.lng}`);
            return coords;
          }
        }
      }
      
      console.log(`[SubwayService] Failed to extract coordinates from station data. Available fields:`, Object.keys(rawStation));
      return null;
      
    } catch (error) {
      console.error('[SubwayService] Error extracting coordinates:', error);
      return null;
    }
  }
  
  private parseNumeric(value: any): number | null {
    if (typeof value === 'number') {
      return isNaN(value) ? null : value;
    }
    if (typeof value === 'string') {
      // Remove common non-numeric characters but preserve decimal points and minus signs
      const cleaned = value.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }
  
  private parseWKTPoint(wktString: string): { lat: number; lng: number } | null {
    try {
      // Parse WKT POINT format: "POINT (-73.955 40.779)" or "POINT(-73.955 40.779)"
      const match = wktString.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i);
      if (match) {
        const lng = parseFloat(match[1]);
        const lat = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          return { lat, lng };
        }
      }
    } catch (error) {
      console.error('[SubwayService] Error parsing WKT:', error);
    }
    return null;
  }
  
  private parseCoordinateString(coordString: string): { lat: number; lng: number } | null {
    try {
      // Try to parse various coordinate string formats:
      // "40.779,-73.955" or "40.779, -73.955" or "lat:40.779,lng:-73.955"
      
      // Remove common prefixes and clean
      let cleaned = coordString.replace(/[^\d.,-]/g, '');
      
      // Split by comma and try to get two numbers
      const parts = cleaned.split(',').map(p => p.trim());
      if (parts.length === 2) {
        const num1 = parseFloat(parts[0]);
        const num2 = parseFloat(parts[1]);
        
        if (!isNaN(num1) && !isNaN(num2) && num1 !== 0 && num2 !== 0) {
          // Determine which is lat and which is lng based on typical NYC ranges
          // NYC latitude: ~40.4 to 41.0, longitude: ~-74.3 to -73.7
          if (num1 > 40 && num1 < 41 && num2 < -73 && num2 > -75) {
            return { lat: num1, lng: num2 };
          } else if (num2 > 40 && num2 < 41 && num1 < -73 && num1 > -75) {
            return { lat: num2, lng: num1 };
          }
        }
      }
    } catch (error) {
      console.error('[SubwayService] Error parsing coordinate string:', error);
    }
    return null;
  }

  private async loadFallbackStations(): Promise<void> {
    // Comprehensive NYC subway stations including Upper East Side
    const majorStations: InsertSubwayStation[] = [
      // Manhattan - Midtown/Times Square area
      { id: "times_square", name: "Times Square-42nd St", lat: 40.7590, lng: -73.9845, lines: '["N","Q","R","W","S","1","2","3","7"]', borough: "Manhattan" },
      { id: "grand_central", name: "Grand Central-42nd St", lat: 40.7527, lng: -73.9772, lines: '["S","4","5","6","7"]', borough: "Manhattan" },
      { id: "penn_station", name: "34th St-Penn Station", lat: 40.7505, lng: -73.9934, lines: '["A","C","E","1","2","3"]', borough: "Manhattan" },
      
      // Manhattan - Upper East Side (CRITICAL FOR 86TH ST)
      { id: "lexington_86", name: "86th St (Lexington Av)", lat: 40.7794, lng: -73.9554, lines: '["4","5","6"]', borough: "Manhattan" },
      { id: "lexington_77", name: "77th St (Lexington Av)", lat: 40.7738, lng: -73.9626, lines: '["6"]', borough: "Manhattan" },
      { id: "lexington_96", name: "96th St (Lexington Av)", lat: 40.7849, lng: -73.9510, lines: '["6"]', borough: "Manhattan" },
      { id: "second_ave_86", name: "86th St (2nd Av)", lat: 40.7782, lng: -73.9535, lines: '["Q"]', borough: "Manhattan" },
      { id: "second_ave_96", name: "96th St (2nd Av)", lat: 40.7845, lng: -73.9473, lines: '["Q"]', borough: "Manhattan" },
      
      // Manhattan - Upper West Side
      { id: "broadway_96", name: "96th St (Broadway)", lat: 40.7937, lng: -73.9727, lines: '["1","2","3"]', borough: "Manhattan" },
      { id: "broadway_86", name: "86th St (Broadway)", lat: 40.7886, lng: -73.9764, lines: '["1"]', borough: "Manhattan" },
      { id: "cpw_86", name: "86th St (Central Park West)", lat: 40.7851, lng: -73.9697, lines: '["B","C"]', borough: "Manhattan" },
      
      // Manhattan - Downtown
      { id: "union_square", name: "Union Square-14th St", lat: 40.7348, lng: -73.9897, lines: '["L","N","Q","R","W","4","5","6"]', borough: "Manhattan" },
      { id: "wall_st", name: "Wall St", lat: 40.7074, lng: -74.0113, lines: '["4","5"]', borough: "Manhattan" },
      
      // Brooklyn
      { id: "atlantic_ave", name: "Atlantic Ave-Barclays Ctr", lat: 40.6840, lng: -73.9773, lines: '["B","D","N","Q","R","W","2","3","4","5"]', borough: "Brooklyn" },
      { id: "prospect_park", name: "Prospect Park", lat: 40.6619, lng: -73.9619, lines: '["B","Q"]', borough: "Brooklyn" },
      
      // Queens
      { id: "jamaica_center", name: "Jamaica Center-Parsons/Archer", lat: 40.7022, lng: -73.8006, lines: '["E","J","Z"]', borough: "Queens" },
      { id: "roosevelt_av", name: "Roosevelt Av/Jackson Hts", lat: 40.7465, lng: -73.8913, lines: '["E","F","M","R","7"]', borough: "Queens" },
      
      // Bronx
      { id: "yankee_stadium", name: "161st St-Yankee Stadium", lat: 40.8276, lng: -73.9266, lines: '["B","D","4"]', borough: "Bronx" },
      { id: "149th_grand", name: "149th St-Grand Concourse", lat: 40.8183, lng: -73.9276, lines: '["2","4","5"]', borough: "Bronx" },
      
      // Staten Island
      { id: "st_george", name: "St George", lat: 40.6439, lng: -74.0739, lines: '["SIR"]', borough: "Staten Island" }
    ];
    
    try {
      for (const station of majorStations) {
        await db.insert(subwayStations)
          .values(station)
          .onConflictDoNothing();
      }
      console.log("Loaded fallback subway stations");
    } catch (error) {
      console.error("Error loading fallback stations:", error);
    }
  }

  private async findNearbyStations(lat: number, lng: number, maxDistance: number): Promise<Array<SubwayStation & { distance: number }>> {
    try {
      console.log(`[SubwayService] Searching for stations within ${maxDistance} miles of ${lat}, ${lng}`);
      
      // First, let's check how many total stations we have in the database
      const totalStations = await db.select({ count: sql<number>`count(*)` }).from(subwayStations);
      console.log(`[SubwayService] Total stations in database: ${totalStations[0]?.count || 0}`);
      
      // Get a sample of stations to verify data integrity
      const sampleStations = await db.select().from(subwayStations).limit(3);
      console.log(`[SubwayService] Sample stations:`, sampleStations.map(s => ({ name: s.name, lat: s.lat, lng: s.lng })));
      
      // Use improved Haversine formula in SQL with better precision
      const stations = await db.execute(sql`
        SELECT *,
        (
          3959 * acos(
            LEAST(1.0, 
              cos(radians(${lat})) * cos(radians(lat)) * 
              cos(radians(lng) - radians(${lng})) + 
              sin(radians(${lat})) * sin(radians(lat))
            )
          )
        ) AS distance
        FROM ${subwayStations}
        WHERE lat IS NOT NULL AND lng IS NOT NULL
        AND (
          3959 * acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(lat)) * 
              cos(radians(lng) - radians(${lng})) + 
              sin(radians(${lat})) * sin(radians(lat))
            )
          )
        ) <= ${maxDistance}
        ORDER BY distance
        LIMIT 10
      `);
      
      const results = stations.rows.map(row => ({
        id: row.id as string,
        name: row.name as string,
        lat: row.lat as number,
        lng: row.lng as number,
        lines: row.lines as string,
        borough: row.borough as string,
        lastUpdated: row.last_updated as Date,
        distance: parseFloat(row.distance as string)
      }));
      
      console.log(`[SubwayService] Query returned ${results.length} stations within ${maxDistance} miles`);
      if (results.length > 0) {
        console.log(`[SubwayService] Closest stations:`, results.slice(0, 3).map(s => ({ 
          name: s.name, 
          distance: s.distance.toFixed(2), 
          lat: s.lat, 
          lng: s.lng 
        })));
      }
      
      return results;
      
    } catch (error) {
      console.error(`[SubwayService] Error finding nearby stations for ${lat}, ${lng}:`, error);
      return [];
    }
  }

  private calculateScoreFromDistance(distanceInMiles: number): number {
    // NYC-specific scoring based on walking distance to subway
    // 0.25 miles (4-5 blocks) or less = excellent (90-100)
    // 0.5 miles (8-10 blocks) = good (70-89) 
    // 1 mile = fair (40-69)
    // 1.5+ miles = poor (0-39)
    
    if (distanceInMiles <= 0.25) {
      return Math.round(90 + (0.25 - distanceInMiles) * 40); // 90-100
    } else if (distanceInMiles <= 0.5) {
      return Math.round(70 + (0.5 - distanceInMiles) * 80); // 70-89
    } else if (distanceInMiles <= 1.0) {
      return Math.round(40 + (1.0 - distanceInMiles) * 60); // 40-69
    } else if (distanceInMiles <= 1.5) {
      return Math.round(10 + (1.5 - distanceInMiles) * 60); // 10-39
    } else {
      return Math.max(0, Math.round(10 - (distanceInMiles - 1.5) * 5)); // 0-10
    }
  }

  private generateExplanation(station: SubwayStation & { distance: number }, distance: number, score: number): string {
    const walkingTime = Math.round(distance * 20); // ~20 minutes per mile walking
    const blocks = Math.round(distance * 20); // ~20 blocks per mile in Manhattan
    
    let quality = "poor";
    if (score >= 90) quality = "excellent";
    else if (score >= 70) quality = "good";
    else if (score >= 40) quality = "fair";
    
    const lines = JSON.parse(station.lines || '[]');
    const linesText = Array.isArray(lines) ? lines.join(', ') : 'unknown lines';
    
    return `${quality} subway access: ${station.name} (${linesText}) is ${distance.toFixed(2)} miles away (~${walkingTime} min walk, ~${blocks} blocks)`;
  }
}