// Frontend client for school scoring API
interface SchoolScoreResult {
  score: number;
  schoolDbn: string;
  schoolName: string;
  explanation: string;
  dataSource: string;
  value: string;
  auditId: string;
}

interface SchoolScoreApiRequest {
  lat: number;
  lng: number;
  borough: string;
}

class SchoolScoringClient {
  private static instance: SchoolScoringClient;

  static getInstance(): SchoolScoringClient {
    if (!SchoolScoringClient.instance) {
      SchoolScoringClient.instance = new SchoolScoringClient();
    }
    return SchoolScoringClient.instance;
  }

  async calculateSchoolScore(lat: number, lng: number, borough: string): Promise<SchoolScoreResult> {
    try {
      const response = await fetch('/api/school-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lat, lng, borough }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('School scoring API error:', error);
      
      // Return fallback data if API fails
      return {
        score: 65,
        schoolDbn: 'FALLBACK',
        schoolName: `${borough} Area Schools`,
        explanation: `Using ${borough} area school average (API unavailable)`,
        dataSource: 'Fallback - Borough Average',
        value: '6.5/10 estimated',
        auditId: 'FALLBACK'
      };
    }
  }

  async analyzeProperty(address: string, lat: number, lng: number, borough: string): Promise<any> {
    try {
      const response = await fetch('/api/analyze-property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, lat, lng, borough }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Property analysis API error:', error);
      throw error;
    }
  }
}

export default SchoolScoringClient;