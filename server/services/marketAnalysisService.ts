import { db } from "../db";
import { marketAnalysisAudits, comparableProperties, properties } from "@shared/schema";
import type { 
  InsertMarketAnalysisAudit, 
  InsertComparableProperty, 
  MarketAnalysisRequest 
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

interface ComparablePropertyData {
  id: string;
  address: string;
  unit?: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  soldDate?: string;
  distance: number;
  similarity: number;
  priceAdjustment: number;
  building?: string;
}

interface MarketAnalysisResult {
  propertyAddress: string;
  coordinates: { lat: number; lng: number };
  marketScore: number;
  fairValueEstimate: number;
  priceGapPercentage: number;
  marketTrend: 'hot' | 'balanced' | 'cooling';
  daysOnMarketAvg: number;
  pricePerSqftMedian: number;
  comparables: ComparablePropertyData[];
  confidence: number;
  dataQuality: {
    completeness: number;
    sources: string[];
    comparablesFound: number;
  };
}

export class MarketAnalysisService {
  private static instance: MarketAnalysisService;

  static getInstance(): MarketAnalysisService {
    if (!MarketAnalysisService.instance) {
      MarketAnalysisService.instance = new MarketAnalysisService();
    }
    return MarketAnalysisService.instance;
  }

  /**
   * Calculate Haversine distance between two points in miles
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Calculate similarity score between two properties (0-100)
   */
  private calculateSimilarity(
    subject: { bedrooms?: number; bathrooms?: number; squareFeet?: number; propertyType?: string },
    comp: { bedrooms: number; bathrooms: number; squareFeet?: number; buildingType?: string }
  ): number {
    let score = 100;
    
    // Bedroom difference penalty
    if (subject.bedrooms && comp.bedrooms) {
      const bedroomDiff = Math.abs(subject.bedrooms - comp.bedrooms);
      score -= bedroomDiff * 15; // 15 points per bedroom difference
    }
    
    // Bathroom difference penalty  
    if (subject.bathrooms && comp.bathrooms) {
      const bathroomDiff = Math.abs(subject.bathrooms - comp.bathrooms);
      score -= bathroomDiff * 10; // 10 points per bathroom difference
    }
    
    // Square footage difference penalty
    if (subject.squareFeet && comp.squareFeet) {
      const sqftDiff = Math.abs(subject.squareFeet - comp.squareFeet) / subject.squareFeet;
      score -= sqftDiff * 30; // 30 points for 100% sqft difference
    }
    
    // Property type match bonus
    if (subject.propertyType && comp.buildingType) {
      const subjectType = subject.propertyType.toLowerCase();
      const compType = comp.buildingType.toLowerCase();
      if (subjectType === compType || 
          (subjectType === 'condo' && compType.includes('condo')) ||
          (subjectType === 'coop' && compType.includes('co-op'))) {
        score += 5; // 5 point bonus for matching property type
      } else {
        score -= 10; // 10 point penalty for different property type
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Search for comparable properties in our database
   */
  private async searchDatabaseComparables(
    lat: number, 
    lng: number, 
    subject: MarketAnalysisRequest
  ): Promise<ComparablePropertyData[]> {
    console.log(`[MarketAnalysis] Searching database for comparables near ${lat}, ${lng}`);
    
    try {
      // Search properties within reasonable geographic bounds (approximately 2 miles)
      const latRange = 0.029; // ~2 miles in latitude degrees  
      const lngRange = 0.036; // ~2 miles in longitude degrees (NYC area)
      
      const dbProperties = await db
        .select()
        .from(properties)
        .where(
          and(
            gte(properties.lat, lat - latRange),
            lte(properties.lat, lat + latRange),
            gte(properties.lng, lng - lngRange),
            lte(properties.lng, lng + lngRange),
            eq(properties.extractionSuccess, 1), // Only successful extractions
            sql`${properties.lat} IS NOT NULL AND ${properties.lng} IS NOT NULL` // Only properties with coordinates
          )
        )
        .orderBy(desc(properties.extractedAt))
        .limit(50);

      console.log(`[MarketAnalysis] Found ${dbProperties.length} properties in database search`);

      const comparables: ComparablePropertyData[] = [];
      
      for (const prop of dbProperties) {
        // Skip if missing critical data
        if (!prop.priceValue || !prop.bedrooms || !prop.bathrooms || !prop.address || !prop.lat || !prop.lng) {
          continue;
        }

        // Calculate real distance using actual coordinates
        const distance = this.calculateDistance(lat, lng, prop.lat, prop.lng);
        
        // Skip if too far away
        if (distance > 2.0) continue;
        
        const similarity = this.calculateSimilarity(subject, {
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms || 1,
          squareFeet: prop.squareFootage || undefined,
          buildingType: prop.buildingType || undefined
        });
        
        // Only include reasonably similar properties
        if (similarity < 40) continue;
        
        // Calculate price adjustment based on differences
        let priceAdjustment = 0;
        if (subject.squareFeet && prop.squareFootage) {
          priceAdjustment = ((prop.squareFootage - subject.squareFeet) / subject.squareFeet) * 100;
        }
        
        comparables.push({
          id: prop.id,
          address: prop.address,
          unit: undefined, // Not stored in current schema
          price: prop.priceValue,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms || 1,
          squareFeet: prop.squareFootage || undefined,
          soldDate: prop.soldDate || prop.listedDate || undefined,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
          similarity: Math.round(similarity),
          priceAdjustment: Math.round(priceAdjustment * 100) / 100,
          building: undefined
        });
      }
      
      // Sort by similarity and distance, return top 10
      return comparables
        .sort((a, b) => (b.similarity * 0.7 + (2 - a.distance) * 0.3) - (a.similarity * 0.7 + (2 - b.distance) * 0.3))
        .slice(0, 10);

    } catch (error) {
      console.error('[MarketAnalysis] Database search error:', error);
      return [];
    }
  }

  /**
   * Search for comparable properties using NYC Open Data
   */
  private async searchPublicComparables(
    lat: number, 
    lng: number, 
    subject: MarketAnalysisRequest
  ): Promise<ComparablePropertyData[]> {
    console.log(`[MarketAnalysis] Searching NYC Open Data for sales near ${lat}, ${lng}`);
    
    const comparables: ComparablePropertyData[] = [];
    
    try {
      // Use NYC Citywide Rolling Calendar Sales dataset
      // This dataset contains real sales transactions updated regularly
      const salesUrl = 'https://data.cityofnewyork.us/resource/usep-8jbt.json';
      
      // Search within approximately 1 mile radius
      const latRange = 0.014; // ~1 mile in latitude degrees
      const lngRange = 0.018; // ~1 mile in longitude degrees (NYC area)
      
      // NYC Rolling Calendar Sales uses different field names
      const boroughCode = this.getBoroughCode(lat, lng);
      const queryParams = new URLSearchParams({
        '$where': `sale_price > 100000`,
        '$limit': '200',
        '$order': 'sale_date DESC',
        'borough': boroughCode
      });
      
      const url = `${salesUrl}?${queryParams}`;
      console.log(`[MarketAnalysis] Making request to NYC Property Sales API`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'StreetWise/1.0 (Property Analysis Service)'
        }
      });
      
      if (!response.ok) {
        console.log(`[MarketAnalysis] NYC Sales API failed: ${response.status}`);
        return [];
      }
      
      const salesData = await response.json();
      console.log(`[MarketAnalysis] Found ${salesData.length} recent sales from NYC Open Data`);
      
      for (const sale of salesData) {
        // Skip invalid or incomplete sales data  
        // The NYC Rolling Calendar Sales dataset uses different field names
        if (!sale.sale_price || !sale.address) {
          continue;
        }

        // This dataset doesn't have lat/lng, so we'll use zip code proximity for now
        // Skip if no zip code or address info
        if (!sale.zip_code && !sale.address) {
          continue;
        }
        
        // Parse sale data more accurately
        const salePrice = parseFloat(sale.sale_price);
        if (salePrice < 100000) continue; // Skip suspiciously low prices
        
        // Extract property details using the correct field names for this dataset
        const bedrooms = this.extractBedrooms(sale);
        const bathrooms = this.extractBathrooms(sale); 
        const squareFeet = sale.gross_square_feet ? parseInt(sale.gross_square_feet) : undefined;
        
        // Use neighborhood as proxy for distance since we don't have coordinates
        // Properties in same neighborhood are considered close
        const isNearby = sale.neighborhood === subject.neighborhood || 
                        sale.zip_code === subject.zipCode;
        const estimatedDistance = isNearby ? 0.3 : 0.8; // Rough estimate
        
        const similarity = this.calculateSimilarity(subject, {
          bedrooms,
          bathrooms,
          squareFeet,
          buildingType: sale.building_class_category || sale.building_class_final_roll
        });
        
        // Only include reasonably similar properties
        if (similarity < 35) continue;
        
        // Calculate price adjustment based on differences
        let priceAdjustment = 0;
        if (subject.squareFeet && squareFeet && squareFeet > 0) {
          priceAdjustment = ((squareFeet - subject.squareFeet) / subject.squareFeet) * 100;
        }
        
        comparables.push({
          id: `nyc_${sale.bbl || `${sale.block}_${sale.lot}_${Date.parse(sale.sale_date)}`}`,
          address: sale.address,
          unit: sale.apartment_number || undefined,
          price: Math.round(salePrice),
          bedrooms,
          bathrooms,
          squareFeet,
          soldDate: sale.sale_date,
          distance: estimatedDistance, // Estimated based on neighborhood/zip
          similarity: Math.round(similarity),
          priceAdjustment: Math.round(priceAdjustment * 100) / 100,
          building: sale.building_class_category || sale.building_class_final_roll
        });
      }
      
    } catch (error) {
      console.error('[MarketAnalysis] NYC Property Sales search error:', error);
    }
    
    // Sort by similarity and distance, return top comparable properties
    return comparables
      .sort((a, b) => (b.similarity * 0.7 + (1 - a.distance) * 0.3) - (a.similarity * 0.7 + (1 - b.distance) * 0.3))
      .slice(0, 12);
  }

  /**
   * Get NYC borough code for API filtering
   */
  private getBoroughCode(lat: number, lng: number): string {
    // Rough borough boundaries for API filtering
    if (lat >= 40.8 && lng >= -73.95) return '2'; // Bronx
    if (lat <= 40.65 && lng <= -74.0) return '5'; // Staten Island
    if (lat <= 40.75 && lng >= -73.95) return '3'; // Brooklyn
    if (lat >= 40.75 && lng <= -73.85) return '4'; // Queens
    return '1'; // Manhattan (default)
  }

  /**
   * Extract bedroom count from NYC sales data
   */
  private extractBedrooms(sale: any): number {
    // Try multiple fields that might contain bedroom info
    if (sale.total_units && parseInt(sale.total_units) <= 10) {
      return Math.max(1, parseInt(sale.total_units));
    }
    if (sale.residential_units && parseInt(sale.residential_units) <= 10) {
      return Math.max(1, parseInt(sale.residential_units));
    }
    // Default based on building class if available
    const buildingClass = sale.building_class_at_time_of_sale || sale.building_class_category || '';
    if (buildingClass.toLowerCase().includes('studio')) return 0;
    if (buildingClass.toLowerCase().includes('one') || buildingClass.includes('1')) return 1;
    if (buildingClass.toLowerCase().includes('two') || buildingClass.includes('2')) return 2;
    if (buildingClass.toLowerCase().includes('three') || buildingClass.includes('3')) return 3;
    return 1; // Default fallback
  }

  /**
   * Extract bathroom count from NYC sales data
   */
  private extractBathrooms(sale: any): number {
    // NYC sales data doesn't typically include bathroom count
    // Use building class and square footage to estimate
    const squareFeet = sale.gross_square_feet ? parseInt(sale.gross_square_feet) : 0;
    if (squareFeet > 1500) return 2;
    if (squareFeet > 800) return 1.5;
    return 1; // Default fallback
  }

  /**
   * Calculate market trends and scoring
   */
  private analyzeMarketTrends(comparables: ComparablePropertyData[]): {
    marketScore: number;
    marketTrend: 'hot' | 'balanced' | 'cooling';
    daysOnMarketAvg: number;
    pricePerSqftMedian: number;
  } {
    if (comparables.length === 0) {
      return {
        marketScore: 50,
        marketTrend: 'balanced',
        daysOnMarketAvg: 60,
        pricePerSqftMedian: 800
      };
    }
    
    // Calculate price per sqft for comparables
    const pricesPerSqft = comparables
      .filter(c => c.squareFeet && c.squareFeet > 0)
      .map(c => c.price / c.squareFeet!)
      .sort((a, b) => a - b);
    
    const pricePerSqftMedian = pricesPerSqft.length > 0 
      ? pricesPerSqft[Math.floor(pricesPerSqft.length / 2)]
      : 800;
    
    // Mock market analysis based on available data
    const avgSimilarity = comparables.reduce((sum, c) => sum + c.similarity, 0) / comparables.length;
    const avgDistance = comparables.reduce((sum, c) => sum + c.distance, 0) / comparables.length;
    
    // Market score based on data quality and trends
    let marketScore = 50;
    marketScore += Math.min(25, avgSimilarity * 0.3); // Higher similarity = better market
    marketScore += Math.min(15, (2 - avgDistance) * 7.5); // Closer comparables = better market
    marketScore += Math.min(10, (comparables.length - 3) * 2); // More comparables = better market
    
    // Determine market trend (simplified analysis)
    let marketTrend: 'hot' | 'balanced' | 'cooling' = 'balanced';
    if (marketScore > 75) marketTrend = 'hot';
    else if (marketScore < 45) marketTrend = 'cooling';
    
    // Mock days on market (would need real market data)
    const daysOnMarketAvg = marketTrend === 'hot' ? 25 : marketTrend === 'cooling' ? 85 : 45;
    
    return {
      marketScore: Math.round(marketScore),
      marketTrend,
      daysOnMarketAvg,
      pricePerSqftMedian: Math.round(pricePerSqftMedian)
    };
  }

  /**
   * Calculate fair value estimate based on comparables
   */
  private calculateFairValue(
    subject: MarketAnalysisRequest,
    comparables: ComparablePropertyData[]
  ): number {
    if (comparables.length === 0 || !subject.squareFeet) {
      return subject.askingPrice || 1000000; // Return asking price if no comparables
    }
    
    // Calculate weighted average price per sqft
    let totalWeightedPrice = 0;
    let totalWeight = 0;
    
    for (const comp of comparables) {
      if (!comp.squareFeet || comp.squareFeet === 0) continue;
      
      const pricePerSqft = comp.price / comp.squareFeet;
      
      // Weight based on similarity and distance (higher is better)
      const weight = (comp.similarity / 100) * (2 - comp.distance) * 0.5;
      
      totalWeightedPrice += pricePerSqft * weight;
      totalWeight += weight;
    }
    
    if (totalWeight === 0) {
      return subject.askingPrice || 1000000;
    }
    
    const avgPricePerSqft = totalWeightedPrice / totalWeight;
    const fairValue = avgPricePerSqft * subject.squareFeet;
    
    return Math.round(fairValue);
  }

  /**
   * Perform comprehensive market analysis for a property
   */
  async analyzeMarket(request: MarketAnalysisRequest): Promise<MarketAnalysisResult> {
    const startTime = Date.now();
    console.log(`[MarketAnalysis] Starting analysis for ${request.address}`);
    
    // Ensure coordinates are available for comparable searches
    if (!request.lat || !request.lng) {
      throw new Error('Coordinates are required for market analysis');
    }

    // Search for comparable properties from multiple sources
    const [dbComparables, publicComparables] = await Promise.allSettled([
      this.searchDatabaseComparables(request.lat, request.lng, request),
      this.searchPublicComparables(request.lat, request.lng, request)
    ]);
    
    // Combine and deduplicate comparables
    const allComparables = [
      ...(dbComparables.status === 'fulfilled' ? dbComparables.value : []),
      ...(publicComparables.status === 'fulfilled' ? publicComparables.value : [])
    ];
    
    // Remove duplicates based on address similarity
    const uniqueComparables = allComparables.filter((comp, index, arr) => 
      arr.findIndex(c => c.address === comp.address) === index
    );
    
    console.log(`[MarketAnalysis] Found ${uniqueComparables.length} unique comparable properties`);
    
    // Analyze market trends
    const marketAnalysis = this.analyzeMarketTrends(uniqueComparables);
    
    // Calculate fair value estimate
    const fairValueEstimate = this.calculateFairValue(request, uniqueComparables);
    
    // Calculate price gap if asking price provided
    let priceGapPercentage = 0;
    if (request.askingPrice && fairValueEstimate) {
      priceGapPercentage = ((request.askingPrice - fairValueEstimate) / fairValueEstimate) * 100;
    }
    
    // Calculate confidence based on data quality
    let confidence = 30; // Base confidence
    confidence += Math.min(40, uniqueComparables.length * 5); // More comparables = higher confidence
    confidence += Math.min(20, uniqueComparables.reduce((sum, c) => sum + c.similarity, 0) / uniqueComparables.length * 0.3);
    confidence += Math.min(10, (dbComparables.status === 'fulfilled' ? 5 : 0) + (publicComparables.status === 'fulfilled' ? 5 : 0));
    
    // Store analysis in database for audit trail
    try {
      const auditData: InsertMarketAnalysisAudit = {
        propertyAddress: request.address,
        lat: request.lat,
        lng: request.lng,
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms,
        squareFeet: request.squareFeet,
        propertyType: request.propertyType,
        askingPrice: request.askingPrice,
        marketScore: marketAnalysis.marketScore,
        fairValueEstimate,
        priceGapPercentage,
        marketTrend: marketAnalysis.marketTrend,
        daysOnMarketAvg: marketAnalysis.daysOnMarketAvg,
        pricePerSqftMedian: marketAnalysis.pricePerSqftMedian,
        comparablesFound: uniqueComparables.length,
        dataSource: 'database+nyc_open_data'
      };
      
      const [savedAudit] = await db
        .insert(marketAnalysisAudits)
        .values(auditData)
        .returning();
      
      // Store comparable properties
      if (uniqueComparables.length > 0) {
        const comparableData: InsertComparableProperty[] = uniqueComparables.map(comp => ({
          marketAnalysisId: savedAudit.id,
          address: comp.address,
          unit: comp.unit,
          price: comp.price,
          bedrooms: comp.bedrooms,
          bathrooms: comp.bathrooms,
          squareFeet: comp.squareFeet,
          soldDate: comp.soldDate,
          distance: comp.distance,
          similarity: comp.similarity,
          priceAdjustment: comp.priceAdjustment,
          dataSource: comp.id.startsWith('nyc_') ? 'nyc_open_data' : 'internal_database'
        }));
        
        await db.insert(comparableProperties).values(comparableData);
      }
      
    } catch (error) {
      console.error('[MarketAnalysis] Failed to save audit data:', error);
    }
    
    const result: MarketAnalysisResult = {
      propertyAddress: request.address,
      coordinates: { lat: request.lat, lng: request.lng },
      marketScore: marketAnalysis.marketScore,
      fairValueEstimate,
      priceGapPercentage: Math.round(priceGapPercentage * 100) / 100,
      marketTrend: marketAnalysis.marketTrend,
      daysOnMarketAvg: marketAnalysis.daysOnMarketAvg,
      pricePerSqftMedian: marketAnalysis.pricePerSqftMedian,
      comparables: uniqueComparables,
      confidence: Math.round(confidence),
      dataQuality: {
        completeness: Math.min(100, (uniqueComparables.length / 5) * 100),
        sources: [
          ...(dbComparables.status === 'fulfilled' && dbComparables.value.length > 0 ? ['Internal Database'] : []),
          ...(publicComparables.status === 'fulfilled' && publicComparables.value.length > 0 ? ['NYC Open Data'] : [])
        ],
        comparablesFound: uniqueComparables.length
      }
    };
    
    console.log(`[MarketAnalysis] Analysis completed in ${Date.now() - startTime}ms`);
    console.log(`[MarketAnalysis] Market Score: ${result.marketScore}, Fair Value: $${result.fairValueEstimate.toLocaleString()}, Confidence: ${result.confidence}%`);
    
    return result;
  }
}