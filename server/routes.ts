import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { SchoolScoringService } from "./services/schoolScoring";

export async function registerRoutes(app: Express): Promise<Server> {
  const schoolScoringService = SchoolScoringService.getInstance();

  // School scoring API endpoint
  app.post("/api/school-score", async (req, res) => {
    try {
      const { lat, lng, borough } = req.body;
      
      if (!lat || !lng || !borough) {
        return res.status(400).json({ 
          error: "Missing required parameters: lat, lng, borough" 
        });
      }

      const result = await schoolScoringService.calculateSchoolScore(lat, lng, borough);
      res.json(result);
      
    } catch (error) {
      console.error("School scoring API error:", error);
      res.status(500).json({ 
        error: "Failed to calculate school score",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Property analysis endpoint (for future integration)
  app.post("/api/analyze-property", async (req, res) => {
    try {
      const { address, lat, lng, borough } = req.body;
      
      if (!lat || !lng || !borough) {
        return res.status(400).json({ 
          error: "Missing required parameters for property analysis" 
        });
      }

      // Calculate school score as part of property analysis
      const schoolScore = await schoolScoringService.calculateSchoolScore(lat, lng, borough);
      
      // Return comprehensive property analysis (school score integrated)
      res.json({
        address,
        coordinates: { lat, lng },
        borough,
        schoolScore,
        // Future: Add other property analysis components here
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Property analysis API error:", error);
      res.status(500).json({ 
        error: "Failed to analyze property",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
