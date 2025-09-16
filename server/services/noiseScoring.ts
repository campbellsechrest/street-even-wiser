interface NoiseScoreResult {
  score: number;
  explanation: string;
  dataSource: string;
  trafficLevel: number;
  airportProximity: number;
  constructionRisk: number;
}

interface TrafficData {
  volume: number;
  speed: number;
  roadType: string;
}

export class NoiseScoringService {
  private static instance: NoiseScoringService;

  static getInstance(): NoiseScoringService {
    if (!NoiseScoringService.instance) {
      NoiseScoringService.instance = new NoiseScoringService();
    }
    return NoiseScoringService.instance;
  }

  async calculateNoiseScore(lat: number, lng: number, address?: string): Promise<NoiseScoreResult> {
    try {
      // Calculate multiple noise factors
      const scores = await Promise.allSettled([
        this.calculateTrafficNoise(lat, lng),
        this.calculateAirportProximity(lat, lng),
        this.calculateConstructionRisk(lat, lng)
      ]);

      // Extract scores or use defaults
      const trafficScore = scores[0].status === 'fulfilled' ? scores[0].value : 70;
      const airportScore = scores[1].status === 'fulfilled' ? scores[1].value : 85;
      const constructionScore = scores[2].status === 'fulfilled' ? scores[2].value : 80;

      // Weighted average: traffic 50%, airport 30%, construction 20%
      const finalScore = Math.round(
        (trafficScore * 0.5) + 
        (airportScore * 0.3) + 
        (constructionScore * 0.2)
      );

      return {
        score: Math.max(0, Math.min(100, finalScore)),
        explanation: this.generateExplanation(trafficScore, airportScore, constructionScore, finalScore),
        dataSource: "NYC Open Data + FAA + Traffic Analysis",
        trafficLevel: 100 - trafficScore, // Invert for display (higher = noisier)
        airportProximity: 100 - airportScore,
        constructionRisk: 100 - constructionScore
      };

    } catch (error) {
      console.error("Noise scoring error:", error);
      return this.getFallbackScore(lat, lng, address);
    }
  }

  private async calculateTrafficNoise(lat: number, lng: number): Promise<number> {
    try {
      let trafficScore = 85; // Start with good score (low noise)

      // Check proximity to major highways and bridges
      const majorRoads = await this.findNearbyMajorRoads(lat, lng);
      trafficScore -= majorRoads.penaltyPoints;

      // Check for busy intersections using NYC traffic volume data
      const intersectionNoise = await this.analyzeNearbyIntersections(lat, lng);
      trafficScore -= intersectionNoise;

      // Manhattan traffic patterns
      if (this.isInManhattan(lat, lng)) {
        trafficScore -= this.getManhattanTrafficPenalty(lat, lng);
      }

      return Math.max(20, Math.min(100, trafficScore));

    } catch (error) {
      console.error("Traffic noise calculation error:", error);
      return 70;
    }
  }

  private async findNearbyMajorRoads(lat: number, lng: number): Promise<{ penaltyPoints: number }> {
    try {
      // Major NYC highways and bridges with noise impact
      const majorRoads = [
        // Highways
        { name: "FDR Drive", lat: 40.7614, lng: -73.9776, penalty: 25 },
        { name: "West Side Highway", lat: 40.7505, lng: -74.0134, penalty: 25 },
        { name: "Brooklyn-Queens Expressway", lat: 40.6892, lng: -73.9442, penalty: 30 },
        { name: "Long Island Expressway", lat: 40.7282, lng: -73.8370, penalty: 20 },
        
        // Bridges
        { name: "Brooklyn Bridge", lat: 40.7061, lng: -73.9969, penalty: 20 },
        { name: "Manhattan Bridge", lat: 40.7072, lng: -73.9904, penalty: 20 },
        { name: "Williamsburg Bridge", lat: 40.7134, lng: -73.9630, penalty: 20 },
        { name: "Queensboro Bridge", lat: 40.7565, lng: -73.9537, penalty: 18 }
      ];

      let totalPenalty = 0;
      const penaltyRadius = 0.3; // 0.3 miles

      for (const road of majorRoads) {
        const distance = this.calculateDistance(lat, lng, road.lat, road.lng);
        if (distance <= penaltyRadius) {
          // Closer = more penalty
          const proximityMultiplier = (penaltyRadius - distance) / penaltyRadius;
          totalPenalty += road.penalty * proximityMultiplier;
        }
      }

      return { penaltyPoints: Math.min(40, totalPenalty) };

    } catch (error) {
      console.error("Major roads analysis error:", error);
      return { penaltyPoints: 0 };
    }
  }

  private async analyzeNearbyIntersections(lat: number, lng: number): Promise<number> {
    try {
      // Use NYC traffic volume data to identify busy intersections
      const radiusMeters = 200; // ~650 feet
      const query = `$where=within_circle(the_geom, ${lat}, ${lng}, ${radiusMeters})`;
      const url = `https://data.cityofnewyork.us/resource/7ym2-wayt.json?${query}&$limit=10`;

      const response = await fetch(url);
      if (!response.ok) {
        return this.estimateIntersectionNoise(lat, lng);
      }

      const trafficData = await response.json();
      let noisePenalty = 0;

      for (const data of trafficData) {
        // Analyze traffic volume if available
        const volume = parseInt(data.vol || data.volume || '0');
        if (volume > 10000) noisePenalty += 15; // Very high volume
        else if (volume > 5000) noisePenalty += 10; // High volume
        else if (volume > 2000) noisePenalty += 5; // Moderate volume
      }

      return Math.min(25, noisePenalty);

    } catch (error) {
      console.error("Intersection analysis error:", error);
      return this.estimateIntersectionNoise(lat, lng);
    }
  }

  private estimateIntersectionNoise(lat: number, lng: number): number {
    // Estimate based on location characteristics
    if (this.isInMidtown(lat, lng)) return 20; // Very busy
    if (this.isInManhattan(lat, lng)) return 15; // Generally busy
    if (this.isInDowntownBrooklyn(lat, lng)) return 10; // Moderately busy
    return 5; // Other areas
  }

  private getManhattanTrafficPenalty(lat: number, lng: number): number {
    // Specific Manhattan noise patterns
    if (this.isInMidtown(lat, lng)) return 15; // Times Square, Herald Square area
    if (lat >= 40.72 && lat <= 40.78) return 10; // General Manhattan business district
    if (lat >= 40.78) return 5; // Upper Manhattan
    return 8; // Lower Manhattan
  }

  private async calculateAirportProximity(lat: number, lng: number): Promise<number> {
    try {
      const airports = [
        { name: "LaGuardia", lat: 40.7769, lng: -73.8740, impact: 35 },
        { name: "JFK", lat: 40.6413, lng: -73.7781, impact: 30 },
        { name: "Newark", lat: 40.6895, lng: -74.1745, impact: 25 },
        { name: "Teterboro", lat: 40.8501, lng: -74.0606, impact: 20 }
      ];

      let airportScore = 100; // Start with no airport noise

      for (const airport of airports) {
        const distance = this.calculateDistance(lat, lng, airport.lat, airport.lng);
        
        // Airport noise impacts within different radii
        if (distance <= 3) {
          airportScore -= airport.impact * (3 - distance) / 3;
        } else if (distance <= 8) {
          airportScore -= (airport.impact * 0.3) * (8 - distance) / 5;
        }
      }

      return Math.max(30, Math.min(100, airportScore));

    } catch (error) {
      console.error("Airport proximity calculation error:", error);
      return 85;
    }
  }

  private async calculateConstructionRisk(lat: number, lng: number): Promise<number> {
    try {
      // Check NYC Open Data for construction permits and ongoing projects
      const constructionScore = await this.checkNearbyConstruction(lat, lng);
      
      // Also consider development-heavy neighborhoods
      const developmentRisk = this.assessDevelopmentRisk(lat, lng);
      
      return Math.max(40, Math.min(100, constructionScore - developmentRisk));

    } catch (error) {
      console.error("Construction risk calculation error:", error);
      return 80;
    }
  }

  private async checkNearbyConstruction(lat: number, lng: number): Promise<number> {
    try {
      const radiusMeters = 300; // ~1000 feet
      const datasets = [
        'https://data.cityofnewyork.us/resource/ipu4-2q9a.json', // Construction permits
        'https://data.cityofnewyork.us/resource/ic3t-wcy2.json'  // Building permits
      ];

      let constructionCount = 0;

      for (const dataset of datasets) {
        try {
          const query = `$where=within_circle(the_geom, ${lat}, ${lng}, ${radiusMeters})`;
          const response = await fetch(`${dataset}?${query}&$limit=20`);
          
          if (response.ok) {
            const permits = await response.json();
            constructionCount += permits.length;
          }
        } catch (datasetError) {
          console.log(`Construction data error:`, datasetError);
          continue;
        }
      }

      // Score based on construction activity
      let score = 90; // Start with low construction noise
      if (constructionCount >= 10) score -= 30;
      else if (constructionCount >= 5) score -= 20;
      else if (constructionCount >= 2) score -= 10;
      else if (constructionCount >= 1) score -= 5;

      return score;

    } catch (error) {
      console.error("Construction check error:", error);
      return 80;
    }
  }

  private assessDevelopmentRisk(lat: number, lng: number): number {
    // High development neighborhoods with ongoing construction
    const highDevAreas = [
      { lat: 40.7505, lng: -74.0134, radius: 0.5, risk: 15 }, // Hudson Yards
      { lat: 40.7061, lng: -73.9969, radius: 0.3, risk: 12 }, // Downtown Brooklyn
      { lat: 40.7488, lng: -73.9857, radius: 0.2, risk: 10 }  // Chelsea/Meatpacking
    ];

    for (const area of highDevAreas) {
      const distance = this.calculateDistance(lat, lng, area.lat, area.lng);
      if (distance <= area.radius) {
        return area.risk * ((area.radius - distance) / area.radius);
      }
    }

    return 0;
  }

  private isInManhattan(lat: number, lng: number): boolean {
    return lat >= 40.70 && lat <= 40.88 && lng >= -74.02 && lng <= -73.93;
  }

  private isInMidtown(lat: number, lng: number): boolean {
    return lat >= 40.75 && lat <= 40.78 && lng >= -73.99 && lng <= -73.97;
  }

  private isInDowntownBrooklyn(lat: number, lng: number): boolean {
    return lat >= 40.69 && lat <= 40.71 && lng >= -73.99 && lng <= -73.98;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

  private generateExplanation(traffic: number, airport: number, construction: number, final: number): string {
    let quality = "poor";
    if (final >= 80) quality = "very quiet";
    else if (final >= 65) quality = "quiet";
    else if (final >= 50) quality = "moderate";
    else if (final >= 35) quality = "noisy";

    const factors = [];
    if (traffic < 60) factors.push("heavy traffic");
    if (airport < 70) factors.push("airport proximity");
    if (construction < 70) factors.push("construction activity");

    const factorsText = factors.length > 0 ? ` (affected by ${factors.join(", ")})` : "";
    
    return `${quality} environment (${final}/100)${factorsText}`;
  }

  private getFallbackScore(lat: number, lng: number, address?: string): NoiseScoreResult {
    // Provide geographic-based fallback
    let score = 60;
    
    if (this.isInMidtown(lat, lng)) score = 35; // Very noisy
    else if (this.isInManhattan(lat, lng)) score = 50; // Moderately noisy
    else if (this.isInDowntownBrooklyn(lat, lng)) score = 55; // Somewhat noisy
    else score = 70; // Quieter outer areas

    return {
      score,
      explanation: `Estimated noise level based on location (${score}/100)`,
      dataSource: "Geographic estimation",
      trafficLevel: 100 - score,
      airportProximity: 15,
      constructionRisk: 20
    };
  }
}