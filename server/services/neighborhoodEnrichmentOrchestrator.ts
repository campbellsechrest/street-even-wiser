import { db } from "../db";
import { neighborhoodEnrichmentAudits, InsertNeighborhoodEnrichmentAudit, NeighborhoodEnrichmentAudit } from "../../shared/schema";
import { SubwayProximityService } from "./subwayProximity";
import { WalkabilityService } from "./walkabilityScoring";
import { NoiseScoringService } from "./noiseScoring";
import { ParkingAvailabilityService } from "./parkingAvailability";
import { SchoolScoringService } from "./schoolScoring";
import { safeInsert } from "../utils/database";

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  borough?: string;
}

interface EnrichmentResult {
  location: LocationData;
  scores: {
    subway: number;
    walkability: number;
    noise: number;
    parking: number;
    school?: number;
    overall: number;
  };
  details: {
    subway: any;
    walkability: any;
    noise: any;
    parking: any;
    school?: any;
  };
  explanation: string;
  dataSource: string;
  auditId: string;
  timestamp: string;
}

export class NeighborhoodEnrichmentOrchestrator {
  private static instance: NeighborhoodEnrichmentOrchestrator;
  
  private subwayService: SubwayProximityService;
  private walkabilityService: WalkabilityService;
  private noiseService: NoiseScoringService;
  private parkingService: ParkingAvailabilityService;
  private schoolService: SchoolScoringService;

  constructor() {
    this.subwayService = SubwayProximityService.getInstance();
    this.walkabilityService = WalkabilityService.getInstance();
    this.noiseService = NoiseScoringService.getInstance();
    this.parkingService = ParkingAvailabilityService.getInstance();
    this.schoolService = SchoolScoringService.getInstance();
  }

  static getInstance(): NeighborhoodEnrichmentOrchestrator {
    if (!NeighborhoodEnrichmentOrchestrator.instance) {
      NeighborhoodEnrichmentOrchestrator.instance = new NeighborhoodEnrichmentOrchestrator();
    }
    return NeighborhoodEnrichmentOrchestrator.instance;
  }

  private deriveBoroughFromCoordinates(lat: number, lng: number): string {
    // Simple borough derivation based on coordinate ranges
    // These are approximate boundaries for NYC boroughs
    
    // Staten Island (southernmost)
    if (lat < 40.65) {
      return "Staten Island";
    }
    
    // Brooklyn (southern part of NYC)
    if (lat < 40.75 && lng > -74.05) {
      return "Brooklyn";
    }
    
    // Queens (eastern part)
    if (lng > -73.8) {
      return "Queens";
    }
    
    // Bronx (northern)
    if (lat > 40.8) {
      return "Bronx";
    }
    
    // Default to Manhattan (central)
    return "Manhattan";
  }

  async enrichLocation(locationData: LocationData): Promise<EnrichmentResult> {
    const startTime = Date.now();
    console.log(`Starting neighborhood enrichment for: ${locationData.address || `${locationData.lat}, ${locationData.lng}`}`);
    
    // Ensure borough is available for school scoring
    if (!locationData.borough) {
      locationData.borough = this.deriveBoroughFromCoordinates(locationData.lat, locationData.lng);
      console.log(`[Orchestrator] Derived borough: ${locationData.borough} from coordinates`);
    }

    try {
      // Run all enrichment services in parallel for better performance
      const enrichmentPromises = [
        this.subwayService.calculateSubwayScore(locationData.lat, locationData.lng),
        this.walkabilityService.calculateWalkabilityScore(locationData.lat, locationData.lng, locationData.address),
        this.noiseService.calculateNoiseScore(locationData.lat, locationData.lng, locationData.address),
        this.parkingService.calculateParkingScore(locationData.lat, locationData.lng, locationData.address)
      ];

      // Always add school service now that borough is derived
      enrichmentPromises.push(
        this.schoolService.calculateSchoolScore(locationData.lat, locationData.lng, locationData.borough || 'Manhattan')
      );

      // Execute all services in parallel
      const results = await Promise.allSettled(enrichmentPromises);
      
      // Extract results or use fallbacks
      const subwayResult = results[0].status === 'fulfilled' ? results[0].value : this.getSubwayFallback();
      const walkabilityResult = results[1].status === 'fulfilled' ? results[1].value : this.getWalkabilityFallback();
      const noiseResult = results[2].status === 'fulfilled' ? results[2].value : this.getNoiseFallback();
      const parkingResult = results[3].status === 'fulfilled' ? results[3].value : this.getParkingFallback();
      
      // Always extract school result since it's always included now
      const schoolResult = results[4].status === 'fulfilled' ? results[4].value : this.getSchoolFallback();

      // Calculate overall score
      const scores = {
        subway: subwayResult.score,
        walkability: walkabilityResult.score,
        noise: noiseResult.score,
        parking: parkingResult.score,
        school: schoolResult?.score,
        overall: this.calculateOverallScore({
          subway: subwayResult.score,
          walkability: walkabilityResult.score,
          noise: noiseResult.score,
          parking: parkingResult.score,
          school: schoolResult?.score
        })
      };

      // Store audit trail
      const auditData: InsertNeighborhoodEnrichmentAudit = {
        lat: locationData.lat,
        lng: locationData.lng,
        address: locationData.address || null,
        subwayScore: scores.subway,
        walkabilityScore: scores.walkability,
        noiseScore: scores.noise,
        parkingScore: scores.parking,
        nearestSubwayStation: subwayResult.nearestStation || null,
        nearestSubwayDistance: subwayResult.distanceInMiles || null,
        dataSource: this.combineDataSources([subwayResult, walkabilityResult, noiseResult, parkingResult, schoolResult])
      };

      const audit = await safeInsert<NeighborhoodEnrichmentAudit>(
        db.insert(neighborhoodEnrichmentAudits),
        auditData,
        { ensureId: true }
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      console.log(`Neighborhood enrichment completed in ${processingTime}ms for: ${locationData.address || `${locationData.lat}, ${locationData.lng}`}`);
      console.log(`Scores - Subway: ${scores.subway}, Walkability: ${scores.walkability}, Noise: ${scores.noise}, Parking: ${scores.parking}, Overall: ${scores.overall}`);

      return {
        location: locationData,
        scores,
        details: {
          subway: subwayResult,
          walkability: walkabilityResult,
          noise: noiseResult,
          parking: parkingResult,
          school: schoolResult
        },
        explanation: this.generateOverallExplanation(scores, [subwayResult, walkabilityResult, noiseResult, parkingResult, schoolResult]),
        dataSource: auditData.dataSource,
        auditId: audit.id,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("Neighborhood enrichment orchestration error:", error);
      return this.getFallbackEnrichment(locationData);
    }
  }

  private calculateOverallScore(scores: {
    subway: number;
    walkability: number;
    noise: number;
    parking: number;
    school?: number;
  }): number {
    // Weighted scoring system based on NYC residential priorities
    const weights = {
      subway: 0.25,        // Transit access is crucial in NYC
      walkability: 0.25,   // Walkability is highly valued
      noise: 0.20,         // Noise impacts quality of life
      parking: 0.15,       // Parking is important but less critical
      school: 0.15         // School quality (when available)
    };

    let weightedSum = 0;
    let totalWeight = 0;

    // Include subway score
    weightedSum += scores.subway * weights.subway;
    totalWeight += weights.subway;

    // Include walkability score
    weightedSum += scores.walkability * weights.walkability;
    totalWeight += weights.walkability;

    // Include noise score
    weightedSum += scores.noise * weights.noise;
    totalWeight += weights.noise;

    // Include parking score
    weightedSum += scores.parking * weights.parking;
    totalWeight += weights.parking;

    // Include school score if available
    if (scores.school !== null && scores.school !== undefined) {
      weightedSum += scores.school * weights.school;
      totalWeight += weights.school;
    }

    // Calculate final weighted average
    const overallScore = Math.round(weightedSum / totalWeight);
    
    return Math.max(0, Math.min(100, overallScore));
  }

  private generateOverallExplanation(scores: any, results: any[]): string {
    let quality = "poor";
    if (scores.overall >= 80) quality = "excellent";
    else if (scores.overall >= 65) quality = "good";
    else if (scores.overall >= 50) quality = "moderate";
    else if (scores.overall >= 35) quality = "fair";

    const highlights = [];
    const concerns = [];

    // Analyze each component
    if (scores.subway >= 70) highlights.push("excellent transit access");
    else if (scores.subway < 40) concerns.push("limited transit options");

    if (scores.walkability >= 70) highlights.push("very walkable");
    else if (scores.walkability < 40) concerns.push("car-dependent area");

    if (scores.noise >= 70) highlights.push("quiet environment");
    else if (scores.noise < 40) concerns.push("noisy area");

    if (scores.parking >= 70) highlights.push("good parking availability");
    else if (scores.parking < 40) concerns.push("difficult parking");

    if (scores.school && scores.school >= 70) highlights.push("excellent schools");
    else if (scores.school && scores.school < 40) concerns.push("limited school options");

    let explanation = `${quality} neighborhood livability (${scores.overall}/100)`;
    
    if (highlights.length > 0) {
      explanation += ` - strengths: ${highlights.join(", ")}`;
    }
    
    if (concerns.length > 0) {
      explanation += ` - concerns: ${concerns.join(", ")}`;
    }

    return explanation;
  }

  private combineDataSources(results: any[]): string {
    const sources = new Set<string>();
    
    for (const result of results) {
      if (result && result.dataSource) {
        sources.add(result.dataSource);
      }
    }
    
    return Array.from(sources).join(" + ") || "Multiple NYC Open Data sources";
  }

  // Fallback methods for service failures
  private getSubwayFallback() {
    return {
      score: 50,
      nearestStation: "Data unavailable",
      distanceInMiles: 0,
      explanation: "Unable to calculate subway proximity",
      dataSource: "Fallback"
    };
  }

  private getWalkabilityFallback() {
    return {
      score: 50,
      explanation: "Unable to calculate walkability",
      dataSource: "Fallback",
      amenitiesNearby: 50,
      transitAccess: 50,
      pedestrianFriendly: 50
    };
  }

  private getNoiseFallback() {
    return {
      score: 60,
      explanation: "Unable to calculate noise level",
      dataSource: "Fallback",
      trafficLevel: 40,
      airportProximity: 15,
      constructionRisk: 20
    };
  }

  private getParkingFallback() {
    return {
      score: 50,
      explanation: "Unable to calculate parking availability",
      dataSource: "Fallback",
      streetParking: 50,
      garageProximity: 50,
      parkingRegulations: "Standard NYC regulations"
    };
  }

  private getSchoolFallback() {
    return {
      score: 60,
      explanation: "Unable to calculate school quality",
      dataSource: "Fallback",
      elementaryScore: 60,
      middleScore: 60,
      highScore: 60,
      compositeRating: 60
    };
  }

  private getFallbackEnrichment(locationData: LocationData): EnrichmentResult {
    // Provide basic fallback based on location
    let baseScore = 50;
    
    // Manhattan gets higher base score due to general urban amenities
    if (locationData.lat >= 40.70 && locationData.lat <= 40.88 && 
        locationData.lng >= -74.02 && locationData.lng <= -73.93) {
      baseScore = 65;
    }

    const scores = {
      subway: baseScore,
      walkability: baseScore,
      noise: baseScore,
      parking: Math.max(20, baseScore - 20), // Parking generally worse
      overall: baseScore
    };

    return {
      location: locationData,
      scores,
      details: {
        subway: this.getSubwayFallback(),
        walkability: this.getWalkabilityFallback(),
        noise: this.getNoiseFallback(),
        parking: this.getParkingFallback()
      },
      explanation: `Basic location assessment (${baseScore}/100) - detailed analysis unavailable`,
      dataSource: "Geographic estimation fallback",
      auditId: "FALLBACK",
      timestamp: new Date().toISOString()
    };
  }

  // Public method to get enrichment summary for multiple locations
  async enrichMultipleLocations(locations: LocationData[]): Promise<EnrichmentResult[]> {
    const results = await Promise.allSettled(
      locations.map(location => this.enrichLocation(location))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Failed to enrich location ${index}:`, result.reason);
        return this.getFallbackEnrichment(locations[index]);
      }
    });
  }

  // Method to refresh/update existing enrichment data
  async refreshEnrichment(lat: number, lng: number, address?: string, borough?: string): Promise<EnrichmentResult> {
    return this.enrichLocation({ lat, lng, address, borough });
  }
}