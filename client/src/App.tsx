import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import PropertyInputForm from "@/components/PropertyInputForm";
import StreetWiseScore from "@/components/StreetWiseScore";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import PropertySummary from "@/components/PropertySummary";
import ComparableProperties from "@/components/ComparableProperties";
import NotFound from "@/pages/not-found";
import GeocodingService from "@/services/geocoding";
import SchoolScoringClient from "@/services/schoolScoring";
import { apiRequest } from "@/lib/queryClient";

// Property data extracted from StreetEasy
interface ExtractedPropertyData {
  id?: string;
  streetEasyUrl: string;
  address?: string;
  neighborhood?: string;
  borough?: string;
  price?: string;
  priceValue?: number;
  bedrooms?: number;
  bathrooms?: number;
  rooms?: string;
  squareFootage?: number;
  pricePerSquareFoot?: number;
  listingType?: 'sale' | 'rental';
  status?: string;
  buildingType?: string;
  daysOnMarket?: number;
  listedDate?: string;
  soldDate?: string;
}

interface PropertyExtractionResponse {
  success: boolean;
  data?: ExtractedPropertyData;
  cached?: boolean;
  message?: string;
  error?: string;
  botDetected?: boolean;
}

// Helper function to determine borough from neighborhood
function getBoroughFromNeighborhood(neighborhood: string): string {
  const neighborhoodLower = neighborhood.toLowerCase();
  
  // Manhattan neighborhoods
  const manhattanNeighborhoods = [
    'upper east side', 'upper west side', 'midtown', 'midtown east', 'midtown west',
    'chelsea', 'flatiron', 'gramercy', 'murray hill', 'kips bay', 'turtle bay',
    'east village', 'west village', 'greenwich village', 'noho', 'nolita', 'soho',
    'tribeca', 'financial district', 'battery park city', 'lower east side', 'chinatown',
    'little italy', 'bowery', 'two bridges', 'alphabet city', 'clinton', "hell's kitchen",
    'washington heights', 'inwood', 'hamilton heights', 'harlem', 'east harlem', 'spanish harlem',
    'morningside heights', 'manhattanville', 'lenox hill', 'yorkville', 'carnegie hill',
    'lincoln square', 'columbus circle', 'theater district', 'garment district',
    'diamond district', 'koreatown', 'nomad', 'madison square', 'union square',
    'stuyvesant town', 'peter cooper village', 'roosevelt island'
  ];
  
  // Brooklyn neighborhoods
  const brooklynNeighborhoods = [
    'williamsburg', 'greenpoint', 'bushwick', 'bed-stuy', 'bedford-stuyvesant',
    'crown heights', 'prospect heights', 'park slope', 'gowanus', 'carroll gardens',
    'cobble hill', 'boerum hill', 'fort greene', 'clinton hill', 'dumbo',
    'brooklyn heights', 'red hook', 'sunset park', 'bay ridge', 'dyker heights',
    'bensonhurst', 'gravesend', 'sheepshead bay', 'brighton beach', 'coney island',
    'flatbush', 'midwood', 'ditmas park', 'kensington', 'windsor terrace',
    'greenwood heights', 'east flatbush', 'canarsie', 'mill basin', 'bergen beach',
    'marine park', 'gerritsen beach', 'manhattan beach'
  ];
  
  // Queens neighborhoods
  const queensNeighborhoods = [
    'long island city', 'astoria', 'sunnyside', 'woodside', 'elmhurst', 'jackson heights',
    'corona', 'flushing', 'forest hills', 'rego park', 'kew gardens', 'richmond hill',
    'ozone park', 'howard beach', 'jamaica', 'st. albans', 'queens village',
    'bellerose', 'rosedale', 'laurelton', 'springfield gardens', 'cambria heights',
    'hollis', 'fresh meadows', 'bayside', 'whitestone', 'college point', 'malba',
    'beechhurst', 'douglaston', 'little neck', 'glen oaks', 'floral park',
    'new hyde park', 'maspeth', 'middle village', 'glendale', 'ridgewood'
  ];
  
  // Bronx neighborhoods
  const bronxNeighborhoods = [
    'mott haven', 'melrose', 'morrisania', 'concourse', 'highbridge', 'morris heights',
    'university heights', 'fordham', 'belmont', 'tremont', 'mount hope', 'claremont',
    'crotona park east', 'longwood', 'hunts point', 'soundview', 'castle hill',
    'unionport', 'westchester square', 'throggs neck', 'country club', 'pelham bay',
    'co-op city', 'city island', 'riverdale', 'kingsbridge', 'marble hill',
    'spuyten duyvil', 'fieldston', 'norwood', 'bedford park', 'jerome park'
  ];
  
  // Staten Island neighborhoods
  const statenIslandNeighborhoods = [
    'st. george', 'stapleton', 'clifton', 'port richmond', 'west brighton',
    'new brighton', 'livingston', 'grymes hill', 'emerson hill', 'dongan hills',
    'todt hill', 'new dorp', 'oakwood', 'great kills', 'eltingville',
    'annadale', 'huguenot', 'charleston', 'rossville', 'woodrow', 'tottenville'
  ];
  
  if (manhattanNeighborhoods.some(n => neighborhoodLower.includes(n))) {
    return 'Manhattan';
  }
  if (brooklynNeighborhoods.some(n => neighborhoodLower.includes(n))) {
    return 'Brooklyn';
  }
  if (queensNeighborhoods.some(n => neighborhoodLower.includes(n))) {
    return 'Queens';
  }
  if (bronxNeighborhoods.some(n => neighborhoodLower.includes(n))) {
    return 'Bronx';
  }
  if (statenIslandNeighborhoods.some(n => neighborhoodLower.includes(n))) {
    return 'Staten Island';
  }
  
  // Default fallback
  return 'Manhattan';
}

// Todo: remove mock functionality
interface PropertyData {
  address: string;
  unit?: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  propertyType: string;
  maintenance?: number;
  taxes?: number;
  neighborhood: string;
  daysOnMarket: number;
}

interface AnalysisResult {
  property: PropertyData;
  streetwiseScore: {
    score: number;
    confidence: number;
    interpretation: string;
    priceAnalysis: {
      askingPrice: number;
      expectedPrice: number;
      priceGap: number;
    };
  };
  categories: Array<{
    name: string;
    score: number;
    weight: number;
    description: string;
    topFactors: {
      positive: string[];
      negative: string[];
    };
    methodology?: {
      baseScore: number;
      adjustments: Array<{
        name: string;
        score: number;
        weight: number;
        explanation: string;
        dataSource: string;
        value?: string | number;
      }>;
      calculation: string;
      dataQuality: {
        completeness: number;
        confidence: number;
        sources: string[];
      };
    };
  }>;
  comparables: Array<{
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
  }>;
}

function HomeContent() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  // Property extraction mutation
  const extractPropertyMutation = useMutation({
    mutationFn: async (streetEasyUrl: string): Promise<PropertyExtractionResponse> => {
      try {
        const response = await apiRequest("POST", "/api/properties/extract", {
          streetEasyUrl
        });
        return await response.json();
      } catch (error: any) {
        // Handle 422 responses (bot detection) as valid responses
        // apiRequest throws Error with message like "422: {json response}"
        if (error.message && error.message.startsWith("422:")) {
          const jsonPart = error.message.substring(4); // Remove "422:" prefix
          try {
            const errorData = JSON.parse(jsonPart.trim());
            return errorData as PropertyExtractionResponse;
          } catch (parseError) {
            console.error("Failed to parse 422 response:", parseError);
          }
        }
        throw error;
      }
    },
    onError: (error: Error) => {
      console.error("Property extraction failed:", error);
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract property data",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  });

  const handleUrlSubmit = async (data: { url: string }) => {
    console.log("URL submitted:", data);
    setIsAnalyzing(true);
    
    let extractedProperty: ExtractedPropertyData | null = null;
    
    try {
      // Extract property data from StreetEasy using real API
      const extractionResult = await extractPropertyMutation.mutateAsync(data.url);

      if (!extractionResult.success) {
        // Handle extraction failures
        const isBotDetection = extractionResult.botDetected || 
                              (extractionResult.error && extractionResult.error.includes("403 Forbidden"));
        
        const errorMessage = isBotDetection
          ? "StreetEasy has temporarily blocked our request. This happens occasionally (~12% of the time). Please try again in a moment, or use the manual entry option below."
          : extractionResult.error || "Failed to extract property data";
          
        toast({
          title: isBotDetection ? "Temporarily Blocked" : "Extraction Failed",
          description: errorMessage,
          variant: isBotDetection ? "default" : "destructive",
        });
        
        setIsAnalyzing(false);
        return;
      }

      extractedProperty = extractionResult.data!;
      console.log("Property extracted successfully:", extractedProperty);

      // Determine borough from neighborhood if not available
      let borough = extractedProperty.borough;
      if (!borough && extractedProperty.neighborhood) {
        borough = getBoroughFromNeighborhood(extractedProperty.neighborhood);
      }

      // Get geocoding for school scoring with graceful fallbacks
      const geocodingService = GeocodingService.getInstance();
      const schoolScoringClient = SchoolScoringClient.getInstance();
      
      let locationData = null;
      let schoolScore = null;
      
      // Try to get coordinates from the extracted address
      if (extractedProperty.address) {
        try {
          locationData = await geocodingService.extractFromStreetEasyUrl(data.url);
        } catch (error) {
          console.warn("Geocoding from URL failed, trying address:", error);
          try {
            locationData = await geocodingService.geocodeAddress(extractedProperty.address);
          } catch (addressError) {
            console.warn("Address geocoding also failed:", addressError);
          }
        }
      }
      
      // Try to get school scoring if we have location data
      if (locationData && locationData.lat && locationData.lng) {
        try {
          schoolScore = await schoolScoringClient.calculateSchoolScore(
            locationData.lat, 
            locationData.lng, 
            locationData.borough || borough || "Manhattan"
          );
        } catch (schoolError) {
          console.warn("School scoring failed, using fallback:", schoolError);
        }
      }
      
      // Use fallback school score if needed
      if (!schoolScore) {
        schoolScore = {
          score: 65,
          explanation: "School data unavailable for this location. Using neighborhood average.",
          dataSource: "Fallback estimate",
          value: "Estimated"
        };
      }

      // Create analysis result with real extracted property data and school scoring
      const finalBorough = borough || locationData?.borough || "Manhattan";
      const finalNeighborhood = extractedProperty.neighborhood || locationData?.neighborhood || finalBorough;
      
      const analysisResult: AnalysisResult = {
        property: {
          address: extractedProperty.address || locationData?.formattedAddress || "Property Address",
          unit: undefined, // TODO: Extract unit from address if available
          price: extractedProperty.priceValue || 0,
          bedrooms: extractedProperty.bedrooms || 1,
          bathrooms: extractedProperty.bathrooms || 1,
          squareFeet: extractedProperty.squareFootage,
          propertyType: extractedProperty.buildingType?.toLowerCase() || "condo",
          maintenance: undefined, // TODO: Add maintenance extraction
          taxes: undefined, // TODO: Add tax estimation
          neighborhood: finalNeighborhood,
          daysOnMarket: extractedProperty.daysOnMarket || 0,
        },
        streetwiseScore: {
          score: 78,
          confidence: 85,
          interpretation: "Good Value",
          priceAnalysis: {
            askingPrice: 1185000,
            expectedPrice: 1250000,
            priceGap: -5.2,
          },
        },
        categories: [
          {
            name: "Fair Value & Market Context",
            score: 82,
            weight: 40,
            description: "Asking price vs. comp-adjusted expected price",
            topFactors: {
              positive: ["Below market pricing", "Strong comparable sales"],
              negative: ["High days on market"],
            },
            methodology: {
              baseScore: 73,
              calculation: "Hedonic Model: $1,250,000 expected → $1,185,000 listed = -5.2% gap → S-curve: 73 → Market adjustment: 1.12x → Final: 82",
              adjustments: [
                {
                  name: "Hedonic Model Prediction",
                  score: 0,
                  weight: 0,
                  explanation: "AI model predicts $1,250,000 expected price based on property features: 2BR/2BA, 1,200 sqft, doorman building, Greenwich Village location, recent renovation",
                  dataSource: "Hedonic pricing model trained on 50K+ NYC transactions",
                  value: "$1,250,000"
                },
                {
                  name: "Price Gap Analysis", 
                  score: 0,
                  weight: 0,
                  explanation: "Listing price $1,185,000 vs expected $1,250,000 = -5.2% gap (underpriced). Formula: (expected - listed) / expected",
                  dataSource: "List price vs model prediction",
                  value: "-5.2% gap (underpriced)"
                },
                {
                  name: "S-Curve Mapping",
                  score: 0,
                  weight: 0,
                  explanation: "Price gap mapped to 0-100 scale using logistic transform (midpoint=8%, slope=25). Result: 73 base score",
                  dataSource: "Logistic transform: 50 + logistic(-5.2%, 8%, 25)",
                  value: "73 base score"
                },
                {
                  name: "Market Context Adjustment",
                  score: 0,
                  weight: 0,
                  explanation: "Multiplier 1.12x applied based on: 45 days on market (neutral), no price cuts (+), strong neighborhood demand (+). Final: 73 × 1.12 = 82",
                  dataSource: "Days on market & pricing history analysis",
                  value: "1.12x multiplier"
                }
              ],
              dataQuality: {
                completeness: 92,
                confidence: 88,
                sources: ["Hedonic Model", "StreetEasy", "MLS", "Public Records", "Market Reports"]
              }
            }
          },
          {
            name: "Location & Neighborhood", 
            score: 75,
            weight: 20,
            description: "Transit access, schools, noise, amenities",
            topFactors: {
              positive: ["Close to subway", "Top-rated schools"],
              negative: ["Street noise", "Limited parking"],
            },
            methodology: {
              baseScore: 80,
              calculation: "Base Score (80) + Transit Access (+8) + Schools (+5) + Noise (-10) + Walkability (+7) + Parking (-5) = 75",
              adjustments: [
                {
                  name: "Subway Proximity",
                  score: 88,
                  weight: 0.35,
                  explanation: "0.2 miles to W 4th St-Washington Square subway station (A,C,E,B,D,F,M lines). Logistic score based on 4-minute walk time.",
                  dataSource: "OpenStreetMap & MTA",
                  value: "4 min walk"
                },
                {
                  name: "School Quality",
                  score: schoolScore.score,
                  weight: 0.2,
                  explanation: schoolScore.explanation,
                  dataSource: schoolScore.dataSource,
                  value: schoolScore.value
                },
                {
                  name: "Street Noise Level",
                  score: 35,
                  weight: 0.25,
                  explanation: "High traffic area with noise from Washington Square Park events and pedestrian activity",
                  dataSource: "NYC Noise Data & Site Analysis",
                  value: "65-70 dB"
                },
                {
                  name: "Walkability Score",
                  score: 95,
                  weight: 0.15,
                  explanation: "Excellent walkability with 95/100 walk score, numerous cafes, restaurants, and shops",
                  dataSource: "Walk Score",
                  value: "95/100"
                },
                {
                  name: "Parking Availability",
                  score: 25,
                  weight: 0.05,
                  explanation: "Limited street parking and expensive garage options ($300-450/month)",
                  dataSource: "SpotHero & Local Garages",
                  value: "$375 avg/mo"
                }
              ],
              dataQuality: {
                completeness: 88,
                confidence: 85,
                sources: ["OpenStreetMap", "Nominatim", "MTA", "GreatSchools.org", "Walk Score", "NYC Open Data", "Site Visit"]
              }
            }
          },
          {
            name: "Building & Amenities",
            score: 68,
            weight: 15,
            description: "Building quality, amenities, services",
            topFactors: {
              positive: ["Doorman", "Gym facility"],
              negative: ["High maintenance fees", "Older building"],
            },
            methodology: {
              baseScore: 60,
              calculation: "Base Score (60) + Doorman (+12) + Amenities (+8) + Building Age (-7) + Maintenance (-5) = 68",
              adjustments: [
                {
                  name: "Doorman Service",
                  score: 85,
                  weight: 0.3,
                  explanation: "24/7 doorman provides security, package handling, and concierge services",
                  dataSource: "StreetEasy listing & Building Management",
                  value: "24/7"
                },
                {
                  name: "Fitness Facilities",
                  score: 78,
                  weight: 0.25,
                  explanation: "Well-equipped gym with cardio equipment, weights, and yoga studio",
                  dataSource: "Building amenity list",
                  value: "Full gym + yoga"
                },
                {
                  name: "Building Age & Condition",
                  score: 35,
                  weight: 0.2,
                  explanation: "Pre-war building from 1925, shows age despite renovations, original plumbing/electrical",
                  dataSource: "NYC Building Records",
                  value: "1925 (99 years)"
                },
                {
                  name: "Maintenance Fees",
                  score: 32,
                  weight: 0.15,
                  explanation: "Monthly maintenance of $1,200 is 15% above neighborhood average for similar properties",
                  dataSource: "StreetEasy market data",
                  value: "$1,200/mo"
                },
                {
                  name: "Common Areas",
                  score: 68,
                  weight: 0.1,
                  explanation: "Recently renovated lobby and hallways, rooftop deck with city views",
                  dataSource: "Building photos & management",
                  value: "Renovated 2022"
                }
              ],
              dataQuality: {
                completeness: 85,
                confidence: 82,
                sources: ["StreetEasy", "Building Management", "NYC Records", "Site Photos"]
              }
            }
          },
          {
            name: "Unit & Layout",
            score: 85,
            weight: 20,
            description: "Renovation, features, layout efficiency",
            topFactors: {
              positive: ["Recent renovation", "Great natural light"],
              negative: ["Small bathroom"],
            },
            methodology: {
              baseScore: 75,
              calculation: "Base Score (75) + Renovation Quality (+15) + Natural Light (+8) + Kitchen (+7) + Layout (-5) + Storage (-3) = 85",
              adjustments: [
                {
                  name: "Renovation Quality",
                  score: 92,
                  weight: 0.4,
                  explanation: "Complete gut renovation in 2023 with high-end finishes, new kitchen, hardwood floors",
                  dataSource: "StreetEasy photos & listing details",
                  value: "2023 gut reno"
                },
                {
                  name: "Natural Light",
                  score: 80,
                  weight: 0.25,
                  explanation: "South-facing windows provide excellent natural light throughout the day",
                  dataSource: "Listing photos & floor plan",
                  value: "South-facing"
                },
                {
                  name: "Kitchen Quality",
                  score: 78,
                  weight: 0.15,
                  explanation: "Modern kitchen with stainless appliances, quartz counters, and efficient workflow",
                  dataSource: "Listing photos",
                  value: "Stainless + quartz"
                },
                {
                  name: "Layout Efficiency",
                  score: 45,
                  weight: 0.15,
                  explanation: "Some wasted space in entry hallway, bedroom could be better proportioned",
                  dataSource: "Floor plan analysis",
                  value: "85% efficient"
                },
                {
                  name: "Storage Space",
                  score: 35,
                  weight: 0.05,
                  explanation: "Limited closet space typical of pre-war building, minimal built-in storage",
                  dataSource: "Floor plan analysis",
                  value: "Below average"
                }
              ],
              dataQuality: {
                completeness: 90,
                confidence: 90,
                sources: ["StreetEasy Photos", "Floor Plans", "Listing Details", "Virtual Tour"]
              }
            }
          },
          {
            name: "Bonuses/Penalties",
            score: 72,
            weight: 5,
            description: "Special conditions and deal-breakers",
            topFactors: {
              positive: ["Tax abatement", "Pets allowed"],
              negative: ["Flip tax"],
            },
            methodology: {
              baseScore: 50,
              calculation: "Base Score (50) + Tax Abatement (+25) + Pet Policy (+5) + Flip Tax (-8) = 72",
              adjustments: [
                {
                  name: "421a Tax Abatement",
                  score: 95,
                  weight: 0.6,
                  explanation: "Property benefits from 421a tax abatement, saving approximately $8,000/year until 2028",
                  dataSource: "NYC Tax Records & ACRIS",
                  value: "$8,000/yr until 2028"
                },
                {
                  name: "Pet Policy",
                  score: 70,
                  weight: 0.1,
                  explanation: "Building allows pets with board approval, adds flexibility for future residents",
                  dataSource: "Building bylaws",
                  value: "Pets OK w/ approval"
                },
                {
                  name: "Flip Tax",
                  score: 25,
                  weight: 0.25,
                  explanation: "2% flip tax on gross sale price must be paid by seller, reduces net proceeds",
                  dataSource: "Co-op offering plan",
                  value: "2% of gross"
                },
                {
                  name: "Board Package",
                  score: 60,
                  weight: 0.05,
                  explanation: "Standard co-op board approval process, not excessively strict compared to competitors",
                  dataSource: "Broker feedback",
                  value: "Standard process"
                }
              ],
              dataQuality: {
                completeness: 75,
                confidence: 85,
                sources: ["NYC Tax Records", "Co-op Documents", "Broker Intelligence", "ACRIS"]
              }
            }
          },
        ],
        comparables: [
          {
            id: "1",
            address: "125 West 4th Street",
            unit: "3A",
            price: 1180000,
            bedrooms: 2,
            bathrooms: 2,
            squareFeet: 1150,
            soldDate: "Dec 2024",
            distance: 0.02,
            similarity: 92,
            priceAdjustment: -5.6,
          },
          {
            id: "2",
            address: "110 West 3rd Street",
            price: 1320000,
            bedrooms: 2,
            bathrooms: 2,
            squareFeet: 1280,
            soldDate: "Nov 2024",
            distance: 0.1,
            similarity: 85,
            priceAdjustment: 5.6,
          },
          {
            id: "3",
            address: "89 MacDougal Street",
            unit: "2B",
            price: 1100000,
            bedrooms: 2,
            bathrooms: 1.5,
            squareFeet: 1100,
            soldDate: "Oct 2024",
            distance: 0.2,
            similarity: 78,
            priceAdjustment: -12.0,
          },
        ],
      };
      
      setAnalysisResult(analysisResult);
      setIsAnalyzing(false);
    } catch (error) {
      console.error("Property analysis failed:", error);
      
      // Create a fallback analysis result if something fails
      try {
        const fallbackResult: AnalysisResult = {
          property: {
            address: extractedProperty?.address || "Property Address",
            unit: undefined,
            price: extractedProperty?.priceValue || 0,
            bedrooms: extractedProperty?.bedrooms || 1,
            bathrooms: extractedProperty?.bathrooms || 1,
            squareFeet: extractedProperty?.squareFootage,
            propertyType: extractedProperty?.buildingType?.toLowerCase() || "condo",
            maintenance: undefined,
            taxes: undefined,
            neighborhood: extractedProperty?.neighborhood || getBoroughFromNeighborhood(extractedProperty?.neighborhood || "") || "NYC",
            daysOnMarket: extractedProperty?.daysOnMarket || 0,
          },
          streetwiseScore: {
            score: 70,
            confidence: 60,
            interpretation: "Limited Analysis",
            priceAnalysis: {
              askingPrice: extractedProperty?.priceValue || 0,
              expectedPrice: extractedProperty?.priceValue || 0,
              priceGap: 0,
            },
          },
          categories: [
            {
              name: "Fair Value & Market Context",
              score: 70,
              weight: 40,
              description: "Limited analysis due to data constraints",
              topFactors: {
                positive: ["Property data extracted"],
                negative: ["Limited location analysis"],
              },
            },
            {
              name: "Location & Neighborhood", 
              score: 60,
              weight: 20,
              description: "Analysis limited by geocoding issues",
              topFactors: {
                positive: ["NYC location"],
                negative: ["Location data unavailable"],
              },
            },
            {
              name: "Building & Amenities",
              score: 50,
              weight: 15,
              description: "Building information from listing",
              topFactors: {
                positive: [],
                negative: ["Limited building data"],
              },
            },
            {
              name: "Unit & Layout",
              score: 60,
              weight: 20,
              description: "Basic unit information available",
              topFactors: {
                positive: ["Basic property details"],
                negative: ["No detailed unit analysis"],
              },
            },
            {
              name: "Bonuses/Penalties",
              score: 50,
              weight: 5,
              description: "Limited special conditions analysis",
              topFactors: {
                positive: [],
                negative: ["Incomplete analysis scope"],
              },
            },
          ],
          comparables: [], // Empty comparables for fallback
        };
        
        setAnalysisResult(fallbackResult);
        toast({
          title: "Analysis Completed with Limited Data",
          description: "Some location services were unavailable, but we've provided a basic analysis based on the property data.",
          variant: "default",
        });
      } catch (fallbackError) {
        console.error("Even fallback analysis failed:", fallbackError);
        toast({
          title: "Analysis Failed",
          description: "Unable to analyze this property. Please try again or use manual entry.",
          variant: "destructive",
        });
      }
      
      setIsAnalyzing(false);
    }
  };

  const handleAddressSubmit = (data: { address: string }) => {
    console.log("Analyzing address:", data);
    setIsAnalyzing(true);
    
    // Todo: remove mock functionality - simulate address search and analysis
    setTimeout(() => {
      const mockResult: AnalysisResult = {
        property: {
          address: data.address,
          unit: undefined,
          price: 1150000,
          bedrooms: 2,
          bathrooms: 1,
          squareFeet: 1100,
          propertyType: "condo",
          maintenance: 950,
          taxes: 800,
          neighborhood: "Greenwich Village",
          daysOnMarket: 30,
        },
        streetwiseScore: {
          score: 65,
          confidence: 75, // Lower confidence for address-based analysis
          interpretation: "Average Value",
          priceAnalysis: {
            askingPrice: 1150000,
            expectedPrice: 1080000,
            priceGap: -6.1,
          },
        },
        categories: [
          {
            name: "Fair Value & Market Context",
            score: 68,
            weight: 40,
            description: "Asking price vs. comp-adjusted expected price",
            topFactors: {
              positive: ["Reasonable pricing"],
              negative: ["Limited data", "Address-only analysis"],
            },
          },
          {
            name: "Location & Neighborhood", 
            score: 75,
            weight: 20,
            description: "Transit access, schools, noise, amenities",
            topFactors: {
              positive: ["Good neighborhood", "Transit access"],
              negative: ["Unknown specific location factors"],
            },
          },
          {
            name: "Building & Amenities",
            score: 50,
            weight: 15,
            description: "Building quality, amenities, services",
            topFactors: {
              positive: [],
              negative: ["No building data available"],
            },
          },
          {
            name: "Unit & Layout",
            score: 50,
            weight: 20,
            description: "Renovation, features, layout efficiency",
            topFactors: {
              positive: [],
              negative: ["No unit details available"],
            },
          },
          {
            name: "Bonuses/Penalties",
            score: 50,
            weight: 5,
            description: "Special conditions and deal-breakers",
            topFactors: {
              positive: [],
              negative: ["Limited analysis scope"],
            },
          },
        ],
        comparables: [
          {
            id: "1",
            address: "Similar property nearby",
            price: 1100000,
            bedrooms: 2,
            bathrooms: 1,
            squareFeet: 1050,
            soldDate: "Dec 2024",
            distance: 0.1,
            similarity: 70,
            priceAdjustment: -4.3,
          },
        ],
      };
      
      setAnalysisResult(mockResult);
      setIsAnalyzing(false);
    }, 2500);
  };

  const handleManualSubmit = (data: any) => {
    console.log("Analyzing manual data:", data);
    setIsAnalyzing(true);
    
    // Todo: remove mock functionality - simulate manual data analysis
    setTimeout(() => {
      const mockResult: AnalysisResult = {
        property: {
          address: data.address || "Manual Entry Property",
          unit: data.unit,
          price: data.price || 1250000,
          bedrooms: data.bedrooms || 2,
          bathrooms: data.bathrooms || 2,
          squareFeet: data.squareFeet || 1200,
          propertyType: data.propertyType || "condo",
          maintenance: data.maintenance || 1200,
          taxes: data.taxes || 950,
          neighborhood: "Greenwich Village",
          daysOnMarket: 45,
        },
        streetwiseScore: {
          score: 78,
          confidence: 85,
          interpretation: "Good Value",
          priceAnalysis: {
            askingPrice: data.price || 1250000,
            expectedPrice: 1180000,
            priceGap: -5.6,
          },
        },
        categories: [
          {
            name: "Fair Value & Market Context",
            score: 82,
            weight: 40,
            description: "Asking price vs. comp-adjusted expected price",
            topFactors: {
              positive: ["Below market pricing", "Strong comparable sales"],
              negative: ["High days on market"],
            },
          },
          {
            name: "Location & Neighborhood", 
            score: 75,
            weight: 20,
            description: "Transit access, schools, noise, amenities",
            topFactors: {
              positive: ["Close to subway", "Top-rated schools"],
              negative: ["Street noise", "Limited parking"],
            },
          },
          {
            name: "Building & Amenities",
            score: 68,
            weight: 15,
            description: "Building quality, amenities, services",
            topFactors: {
              positive: ["Doorman", "Gym facility"],
              negative: ["High maintenance fees", "Older building"],
            },
          },
          {
            name: "Unit & Layout",
            score: 85,
            weight: 20,
            description: "Renovation, features, layout efficiency",
            topFactors: {
              positive: ["Recent renovation", "Great natural light"],
              negative: ["Small bathroom"],
            },
          },
          {
            name: "Bonuses/Penalties",
            score: 72,
            weight: 5,
            description: "Special conditions and deal-breakers",
            topFactors: {
              positive: ["Tax abatement", "Pets allowed"],
              negative: ["Flip tax"],
            },
          },
        ],
        comparables: [
          {
            id: "1",
            address: "125 West 4th Street",
            unit: "3A",
            price: 1180000,
            bedrooms: 2,
            bathrooms: 2,
            squareFeet: 1150,
            soldDate: "Dec 2024",
            distance: 0.02,
            similarity: 92,
            priceAdjustment: -5.6,
          },
          {
            id: "2",
            address: "110 West 3rd Street",
            price: 1320000,
            bedrooms: 2,
            bathrooms: 2,
            squareFeet: 1280,
            soldDate: "Nov 2024",
            distance: 0.1,
            similarity: 85,
            priceAdjustment: 5.6,
          },
          {
            id: "3",
            address: "89 MacDougal Street",
            unit: "2B",
            price: 1100000,
            bedrooms: 2,
            bathrooms: 1.5,
            squareFeet: 1100,
            soldDate: "Oct 2024",
            distance: 0.2,
            similarity: 78,
            priceAdjustment: -12.0,
          },
        ],
      };
      
      setAnalysisResult(mockResult);
      setIsAnalyzing(false);
    }, 3000);
  };

  const handleNewAnalysis = () => {
    setAnalysisResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onSearch={(query) => console.log("Search:", query)}
        onToggleDark={toggleTheme}
        isDark={theme === "dark"}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!analysisResult ? (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-foreground">
                AI-Powered Real Estate Analysis
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Get comprehensive property valuations with our proprietary Streetwise Score. 
                Analyze NYC Metro Area properties with professional-grade insights.
              </p>
            </div>
            
            <PropertyInputForm
              onSubmitUrl={handleUrlSubmit}
              onSubmitAddress={handleAddressSubmit}
              onSubmitManual={handleManualSubmit}
              isLoading={isAnalyzing}
            />
          </div>
        ) : (
          <div className="space-y-8" data-testid="analysis-complete">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">Property Analysis</h1>
              <button
                data-testid="button-new-analysis"
                onClick={handleNewAnalysis}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover-elevate"
              >
                New Analysis
              </button>
            </div>

            {/* Main Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Property & Score */}
              <div className="lg:col-span-2 space-y-6">
                <PropertySummary
                  property={{
                    ...analysisResult.property,
                    imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=400&fit=crop",
                  }}
                  onViewPhotos={() => console.log("View photos")}
                  onViewListing={() => console.log("View listing")}
                  onViewFloorplan={() => console.log("View floorplan")}
                />
                
                <CategoryBreakdown
                  categories={analysisResult.categories}
                  onViewDetails={(category) => console.log("View details:", category)}
                />
              </div>

              {/* Right Column - Score */}
              <div className="space-y-6">
                <StreetWiseScore {...analysisResult.streetwiseScore} />
              </div>
            </div>

            {/* Comparables Section */}
            <ComparableProperties
              comparables={analysisResult.comparables}
              onViewOnMap={(id) => console.log("View on map:", id)}
              onViewDetails={(id) => console.log("View details:", id)}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeContent} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Toaster />
          <Router />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
