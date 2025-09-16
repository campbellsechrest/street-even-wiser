import { eq } from "drizzle-orm";
import { db } from "../db";
import { schoolScoreAudits, boroughSchoolMedians, InsertSchoolScoreAudit, InsertBoroughSchoolMedian, SchoolScoreAudit } from "../../shared/schema";
import { generateId, safeInsert } from "../utils/database";

interface SchoolZoneResult {
  dbn: string;
  school_name: string;
  grades: string;
  address: string;
}

interface SchoolQualityData {
  dbn: string;
  school_name: string;
  ela_proficiency?: number;
  math_proficiency?: number;
  school_environment?: number;
  attendance_rate?: number;
  grade_span_all?: string;
}

interface SchoolScoreResult {
  score: number;
  schoolDbn: string;
  schoolName: string;
  explanation: string;
  dataSource: string;
  value: string;
  auditId: string;
}

export class SchoolScoringService {
  private static instance: SchoolScoringService;
  private boroughMedians: Map<string, number> = new Map();

  static getInstance(): SchoolScoringService {
    if (!SchoolScoringService.instance) {
      SchoolScoringService.instance = new SchoolScoringService();
    }
    return SchoolScoringService.instance;
  }

  async calculateSchoolScore(lat: number, lng: number, borough: string): Promise<SchoolScoreResult> {
    try {
      // 1. Find school zone using SODA spatial query
      const schoolZone = await this.findSchoolZone(lat, lng);
      
      if (!schoolZone) {
        return this.getDistrictAverageScore(borough);
      }

      // 2. Get school quality data from NYC DOE Quality Reports
      const qualityData = await this.getSchoolQuality(schoolZone.dbn);
      
      // 3. Calculate composite rating
      const compositeRating = this.calculateCompositeRating(qualityData);
      
      // 4. Get borough median for relative adjustment
      const boroughMedian = await this.getBoroughMedian(borough);
      
      // 5. Apply logistic transform with borough adjustment
      const k = 0.8; // Steepness parameter
      const rawScore = 100 * (1 / (1 + Math.exp(-k * (compositeRating - boroughMedian))));
      const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));
      
      // 6. Store audit trail with database-agnostic approach
      const auditData: InsertSchoolScoreAudit = {
        schoolDbn: schoolZone.dbn,
        schoolName: schoolZone.school_name,
        elaScore: qualityData.ela_proficiency || null,
        mathScore: qualityData.math_proficiency || null,
        environmentScore: qualityData.school_environment || null,
        attendanceRate: qualityData.attendance_rate || null,
        compositeRating,
        boroughMedian,
        finalScore,
        dataSource: "doe_quality_reports"
      };
      
      // Use safe insert that properly handles databases with/without .returning() support
      const audit = await safeInsert<SchoolScoreAudit>(
        db.insert(schoolScoreAudits),
        auditData,
        { ensureId: true } // Ensure ID is generated for non-returning databases
      );
      
      // 7. Generate explanation
      const explanation = this.generateExplanation(qualityData, compositeRating, boroughMedian, borough);
      const value = this.generateValue(qualityData, boroughMedian);
      
      return {
        score: finalScore,
        schoolDbn: schoolZone.dbn,
        schoolName: schoolZone.school_name,
        explanation,
        dataSource: "NYC DOE Quality Reports + Zone Data",
        value,
        auditId: audit.id
      };
      
    } catch (error) {
      console.error("School scoring error:", error);
      return this.getDistrictAverageScore(borough);
    }
  }

  private async findSchoolZone(lat: number, lng: number): Promise<SchoolZoneResult | null> {
    try {
      console.log(`Finding school zone for coordinates: ${lat}, ${lng}`);
      
      // Try multiple NYC Open Data endpoints for school zones
      const endpoints = [
        {
          url: 'https://data.cityofnewyork.us/resource/cmjf-yawu.json', // Elementary 2024-2025
          name: 'Elementary 2024-2025'
        },
        {
          url: 'https://data.cityofnewyork.us/resource/ghq4-ydq4.json', // 2017-2018 zones (more stable)
          name: '2017-2018 zones'
        },
        {
          url: 'https://data.cityofnewyork.us/resource/shkv-c3w7.json', // School zones map 2024-2025
          name: 'School zones map 2024-2025'
        }
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying ${endpoint.name} endpoint...`);
          
          // Use proper SODA spatial query syntax with intersects
          const query = `$where=intersects(the_geom, 'POINT (${lng} ${lat})')&$limit=1`;
          const fullUrl = `${endpoint.url}?${query}`;
          
          console.log(`SODA API request: ${fullUrl}`);
          
          const response = await fetch(fullUrl);
          console.log(`Response status: ${response.status}`);
          
          if (!response.ok) {
            console.log(`Endpoint ${endpoint.name} failed with status ${response.status}`);
            continue;
          }
          
          const zones = await response.json();
          console.log(`Found ${zones.length} zones from ${endpoint.name}`);
          
          if (zones.length > 0) {
            console.log(`School zone found:`, zones[0]);
            const normalizedZone = this.normalizeZoneData(zones[0]);
            console.log(`Normalized zone data:`, normalizedZone);
            return normalizedZone;
          }
          
        } catch (endpointError) {
          console.error(`Error with ${endpoint.name}:`, endpointError);
          continue;
        }
      }
      
      console.log("No school zones found in any endpoint");
      return null;
      
    } catch (error) {
      console.error("Error finding school zone:", error);
      return null;
    }
  }

  private async getSchoolQuality(dbn: string): Promise<SchoolQualityData> {
    try {
      console.log(`Fetching school quality data for DBN: ${dbn}`);
      
      // Try multiple NYC DOE datasets for school information
      const datasets = [
        {
          url: 'https://data.cityofnewyork.us/resource/8b6c-7uty.json', // School Quality Reports 2022-23
          name: 'School Quality Reports 2022-23'
        },
        {
          url: 'https://data.cityofnewyork.us/resource/s3k6-pzi2.json', // School Directory 2017-18
          name: 'School Directory 2017-18'
        },
        {
          url: 'https://data.cityofnewyork.us/resource/7yaw-nu3x.json', // DOE High School Directory 2019-20
          name: 'DOE High School Directory 2019-20'
        }
      ];

      for (const dataset of datasets) {
        try {
          console.log(`Trying ${dataset.name} for DBN ${dbn}...`);
          
          const query = `dbn=${dbn}`;
          const fullUrl = `${dataset.url}?${query}`;
          
          console.log(`Quality API request: ${fullUrl}`);
          
          const response = await fetch(fullUrl);
          console.log(`${dataset.name} response status: ${response.status}`);
          
          if (!response.ok) {
            console.log(`${dataset.name} failed with status ${response.status}`);
            continue;
          }
          
          const schools = await response.json();
          console.log(`${dataset.name} returned ${schools.length} schools for DBN ${dbn}`);
          
          if (schools.length > 0) {
            console.log(`School found in ${dataset.name}:`, schools[0]);
            // Use school name from either 'school_name', 'schoolname', or 'school_name_2'
            const schoolName = schools[0].school_name || schools[0].schoolname || schools[0].school_name_2 || `School ${dbn}`;
            return {
              ...schools[0],
              school_name: schoolName,
              dbn: dbn
            };
          }
          
        } catch (datasetError) {
          console.error(`Error with ${dataset.name}:`, datasetError);
          continue;
        }
      }
      
      console.log(`No school quality data found for DBN ${dbn} in any dataset`);
      
      // Fallback: create basic school info from DBN
      const schoolName = this.generateSchoolNameFromDBN(dbn);
      return { 
        dbn, 
        school_name: schoolName,
        school_environment: 6, // Default moderate rating
        attendance_rate: 85 // Default good attendance
      };
      
    } catch (error) {
      console.error("Error getting school quality:", error);
      const schoolName = this.generateSchoolNameFromDBN(dbn);
      return { dbn, school_name: schoolName };
    }
  }

  private normalizeZoneData(rawZone: any): SchoolZoneResult {
    // Map various field names from different NYC Open Data endpoints to consistent format
    const dbnFieldNames = ['dbn', 'school_code', 'ats_system_code', 'school_dbn'];
    const nameFieldNames = ['school_name', 'schoolname', 'school_nm', 'name', 'sch_name'];
    const gradeFieldNames = ['grades', 'grade_levels', 'served_grades', 'grades_served'];
    const addressFieldNames = ['address', 'location', 'school_address', 'primary_address'];
    
    console.log(`Normalizing zone data with keys: ${Object.keys(rawZone).join(', ')}`);
    
    // Find DBN using possible field names
    let dbn = '';
    for (const fieldName of dbnFieldNames) {
      if (rawZone[fieldName]) {
        dbn = rawZone[fieldName].toString().trim();
        console.log(`Found DBN '${dbn}' in field '${fieldName}'`);
        break;
      }
    }
    
    // Find school name using possible field names
    let school_name = '';
    for (const fieldName of nameFieldNames) {
      if (rawZone[fieldName]) {
        school_name = rawZone[fieldName].toString().trim();
        console.log(`Found school name '${school_name}' in field '${fieldName}'`);
        break;
      }
    }
    
    // Find grades using possible field names
    let grades = '';
    for (const fieldName of gradeFieldNames) {
      if (rawZone[fieldName]) {
        grades = rawZone[fieldName].toString().trim();
        console.log(`Found grades '${grades}' in field '${fieldName}'`);
        break;
      }
    }
    
    // Find address using possible field names
    let address = '';
    for (const fieldName of addressFieldNames) {
      if (rawZone[fieldName]) {
        address = rawZone[fieldName].toString().trim();
        console.log(`Found address '${address}' in field '${fieldName}'`);
        break;
      }
    }
    
    // If no DBN found, return null
    if (!dbn) {
      console.warn(`No DBN found in zone data. Available fields: ${Object.keys(rawZone).join(', ')}`);
      throw new Error('No valid DBN found in zone data');
    }
    
    // If no school name found, generate one from DBN
    if (!school_name) {
      school_name = this.generateSchoolNameFromDBN(dbn);
      console.log(`Generated school name '${school_name}' from DBN '${dbn}'`);
    }
    
    // Default values for missing optional fields
    if (!grades) {
      grades = 'K-5'; // Default elementary grades
      console.log(`Using default grades '${grades}' for DBN '${dbn}'`);
    }
    
    if (!address) {
      address = 'NYC School Zone'; // Default address
      console.log(`Using default address '${address}' for DBN '${dbn}'`);
    }
    
    return {
      dbn,
      school_name,
      grades,
      address
    };
  }

  private generateSchoolNameFromDBN(dbn: string): string {
    // Parse DBN format: DistrictBoroSchoolNumber (e.g., "02M003" = District 2, Manhattan, School 003)
    if (dbn.length >= 6) {
      const district = dbn.substring(0, 2);
      const boro = dbn.substring(2, 3);
      const schoolNum = dbn.substring(3);
      
      const boroMap: { [key: string]: string } = {
        'M': 'Manhattan',
        'X': 'Bronx', 
        'K': 'Brooklyn',
        'Q': 'Queens',
        'R': 'Staten Island'
      };
      
      const boroName = boroMap[boro] || 'NYC';
      return `PS ${parseInt(schoolNum)} (District ${parseInt(district)}, ${boroName})`;
    }
    
    return `School ${dbn}`;
  }

  private calculateCompositeRating(qualityData: SchoolQualityData): number {
    const scores: number[] = [];
    
    // ELA proficiency (0-100%) → normalized to 1-10
    if (qualityData.ela_proficiency) {
      scores.push(Math.min(10, (qualityData.ela_proficiency / 100) * 10));
    }
    
    // Math proficiency (0-100%) → normalized to 1-10  
    if (qualityData.math_proficiency) {
      scores.push(Math.min(10, (qualityData.math_proficiency / 100) * 10));
    }
    
    // School environment (typically 1-10 scale)
    if (qualityData.school_environment) {
      scores.push(Math.min(10, qualityData.school_environment));
    }
    
    // Attendance rate (0-100%) → normalized to 1-10, weighted lower
    if (qualityData.attendance_rate) {
      const attendanceScore = Math.min(10, (qualityData.attendance_rate / 100) * 10);
      scores.push(attendanceScore * 0.5); // Lower weight for attendance
    }
    
    // Return weighted average, fallback to 5.0 (median)
    return scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 5.0;
  }

  private async getBoroughMedian(borough: string): Promise<number> {
    // Check cache first
    if (this.boroughMedians.has(borough)) {
      return this.boroughMedians.get(borough)!;
    }
    
    try {
      // Check database
      const existing = await db.select().from(boroughSchoolMedians).where(eq(boroughSchoolMedians.borough, borough));
      
      if (existing.length > 0) {
        const median = existing[0].median;
        this.boroughMedians.set(borough, median);
        return median;
      }
      
      // Calculate and store new median (using default estimates for now)
      const medianEstimates: Record<string, number> = {
        'Manhattan': 7.2,
        'Brooklyn': 6.5, 
        'Queens': 6.8,
        'Bronx': 5.9,
        'Staten Island': 6.7
      };
      
      const median = medianEstimates[borough] || 6.5;
      
      await db.insert(boroughSchoolMedians).values({
        borough,
        median
      });
      
      this.boroughMedians.set(borough, median);
      return median;
      
    } catch (error) {
      console.error("Error getting borough median:", error);
      return 6.5; // Default fallback
    }
  }

  private generateExplanation(qualityData: SchoolQualityData, compositeRating: number, boroughMedian: number, borough: string): string {
    const schoolName = qualityData.school_name || "Local school";
    const comparison = compositeRating > boroughMedian ? "above" : compositeRating < boroughMedian ? "below" : "at";
    
    let details = "";
    if (qualityData.ela_proficiency && qualityData.math_proficiency) {
      details = ` (ELA ${Math.round(qualityData.ela_proficiency)}%, Math ${Math.round(qualityData.math_proficiency)}%)`;
    }
    
    return `Zoned for ${schoolName}${details}, rated ${comparison} ${borough} median`;
  }

  private generateValue(qualityData: SchoolQualityData, boroughMedian: number): string {
    if (qualityData.ela_proficiency && qualityData.math_proficiency) {
      return `ELA ${Math.round(qualityData.ela_proficiency)}%, Math ${Math.round(qualityData.math_proficiency)}%`;
    }
    return `Median: ${boroughMedian.toFixed(1)}/10`;
  }

  private async getDistrictAverageScore(borough: string): Promise<SchoolScoreResult> {
    const median = await this.getBoroughMedian(borough);
    const score = Math.round(50 + (median - 6.5) * 10); // Approximate score based on median
    
    return {
      score: Math.max(0, Math.min(100, score)),
      schoolDbn: "DISTRICT_AVG",
      schoolName: `${borough} District Average`,
      explanation: `Using ${borough} district average (insufficient zone data)`,
      dataSource: "Borough District Average",
      value: `${median.toFixed(1)}/10 median`,
      auditId: "DISTRICT_FALLBACK"
    };
  }
}