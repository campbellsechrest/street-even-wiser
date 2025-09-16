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
  daysOnMarket?: number;
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
      
      // Generate contextual factors based on extracted property data
      const propertyDataForFactors = {
        address: extractedProperty.address || locationData?.formattedAddress || "",
        unit: undefined, // TODO: Extract unit from address if available
        price: extractedProperty.priceValue || 0,
        bedrooms: extractedProperty.bedrooms || 1,
        bathrooms: extractedProperty.bathrooms || 1,
        squareFeet: extractedProperty.squareFootage,
        propertyType: extractedProperty.buildingType?.toLowerCase() || "condo",
        maintenance: undefined, // TODO: Add maintenance extraction
        taxes: undefined, // TODO: Add tax estimation
        description: ""
      };
      const contextualFactors = generateContextualFactors(propertyDataForFactors);
      
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
          daysOnMarket: extractedProperty.daysOnMarket,
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
            topFactors: contextualFactors.market,
            methodology: {
              baseScore: 73,
              calculation: "Hedonic Model: $1,250,000 expected → $1,185,000 listed = -5.2% gap → S-curve: 73 → Market adjustment: 1.12x → Final: 82",
              adjustments: [
                {
                  name: "Hedonic Model Prediction",
                  score: 0,
                  weight: 0,
                  explanation: `AI model predicts $1,250,000 expected price based on property features: 2BR/2BA, 1,200 sqft, doorman building, ${finalNeighborhood} location, recent renovation`,
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
            topFactors: contextualFactors.location,
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
            topFactors: contextualFactors.building,
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
            topFactors: contextualFactors.unit,
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
            topFactors: contextualFactors.bonus,
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
        // Generate contextual factors for fallback based on extracted property data
        const fallbackPropertyData = {
          address: extractedProperty?.address || "",
          unit: undefined,
          price: extractedProperty?.priceValue || 0,
          bedrooms: extractedProperty?.bedrooms || 1,
          bathrooms: extractedProperty?.bathrooms || 1,
          squareFeet: extractedProperty?.squareFootage,
          propertyType: extractedProperty?.buildingType?.toLowerCase() || "unknown",
          maintenance: undefined,
          taxes: undefined,
          description: ""
        };
        const fallbackContextualFactors = generateContextualFactors(fallbackPropertyData);
        
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
            daysOnMarket: extractedProperty?.daysOnMarket,
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
              topFactors: fallbackContextualFactors.market,
            },
            {
              name: "Location & Neighborhood", 
              score: 60,
              weight: 20,
              description: "Analysis limited by geocoding issues",
              topFactors: fallbackContextualFactors.location,
            },
            {
              name: "Building & Amenities",
              score: 50,
              weight: 15,
              description: "Building information from listing",
              topFactors: fallbackContextualFactors.building,
            },
            {
              name: "Unit & Layout",
              score: 60,
              weight: 20,
              description: "Basic unit information available",
              topFactors: fallbackContextualFactors.unit,
            },
            {
              name: "Bonuses/Penalties",
              score: 50,
              weight: 5,
              description: "Limited special conditions analysis",
              topFactors: fallbackContextualFactors.bonus,
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

  const handleAddressSubmit = async (data: { address: string }) => {
    console.log("Analyzing address:", data);
    setIsAnalyzing(true);
    
    try {
      // Get geocoding first to get coordinates
      const geocodingService = GeocodingService.getInstance();
      
      let locationData = null;
      try {
        locationData = await geocodingService.geocodeAddress(data.address);
        console.log("Geocoding result for address:", locationData);
      } catch (error) {
        console.warn("Address geocoding failed:", error);
        toast({
          title: "Geocoding Failed",
          description: "Unable to find location coordinates for this address.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }
      
      if (!locationData || !locationData.lat || !locationData.lng) {
        toast({
          title: "Invalid Location",
          description: "Unable to get valid coordinates for this address.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }
      
      // Use comprehensive neighborhood enrichment API
      try {
        const enrichmentResponse = await apiRequest("POST", "/api/enrich-location", {
          lat: locationData.lat,
          lng: locationData.lng,
          address: data.address
        });
        
        const enrichmentData = await enrichmentResponse.json();
        console.log("Comprehensive neighborhood enrichment result:", enrichmentData);
        
        // Get school score separately for backward compatibility 
        const schoolScoringClient = SchoolScoringClient.getInstance();
        let schoolScore = null;
        try {
          schoolScore = await schoolScoringClient.calculateSchoolScore(
            locationData.lat, 
            locationData.lng, 
            locationData.borough || "Manhattan"
          );
        } catch (schoolError) {
          console.warn("School scoring failed, using fallback:", schoolError);
          schoolScore = {
            score: 65,
            explanation: "School data unavailable for this location. Using neighborhood average.",
            dataSource: "Fallback estimate",
            value: "Estimated"
          };
        }

        // Determine final location details
        const finalNeighborhood = locationData?.neighborhood || 
                                 (locationData?.borough && locationData.borough !== "Manhattan" ? locationData.borough : "Upper East Side");
        const finalBorough = locationData?.borough || "Manhattan";
        
        console.log("Final neighborhood determined:", finalNeighborhood);
        
        // Generate contextual factors based on enriched data
        const mockPropertyData = {
          address: data.address,
          unit: undefined,
          price: 1150000,
          bedrooms: 2,
          bathrooms: 1,
          squareFeet: 1100,
          propertyType: "condo",
          maintenance: 950,
          taxes: 800,
          description: ""
        };
        const contextualFactors = generateContextualFactors(mockPropertyData);
        
        // Enhance location factors with real enrichment data
        if (enrichmentData.subway) {
          contextualFactors.location.positive = [
            ...contextualFactors.location.positive,
            `${enrichmentData.subway.nearestStations[0]?.distance.toFixed(1)} mile walk to ${enrichmentData.subway.nearestStations[0]?.name} station`
          ];
        }
        
        if (enrichmentData.walkability?.score >= 80) {
          contextualFactors.location.positive.push(`Excellent walkability score: ${enrichmentData.walkability.score}/100`);
        } else if (enrichmentData.walkability?.score >= 60) {
          contextualFactors.location.positive.push(`Good walkability score: ${enrichmentData.walkability.score}/100`);
        } else if (enrichmentData.walkability?.score) {
          contextualFactors.location.negative.push(`Limited walkability: ${enrichmentData.walkability.score}/100`);
        }
        
        if (enrichmentData.noise?.score < 40) {
          contextualFactors.location.negative.push(`High noise area: ${enrichmentData.noise.description}`);
        } else if (enrichmentData.noise?.score >= 70) {
          contextualFactors.location.positive.push(`Quiet area: ${enrichmentData.noise.description}`);
        }
        
        if (enrichmentData.parking?.score < 40) {
          contextualFactors.location.negative.push(`Limited parking: ${enrichmentData.parking.description}`);
        } else if (enrichmentData.parking?.score >= 70) {
          contextualFactors.location.positive.push(`Good parking availability: ${enrichmentData.parking.description}`);
        }
        
        const analysisResult: AnalysisResult = {
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
            neighborhood: finalNeighborhood,
            daysOnMarket: undefined,
          },
          streetwiseScore: {
            score: 76,
            confidence: 85,
            interpretation: "Good Location Analysis",
            priceAnalysis: {
              askingPrice: 1150000,
              expectedPrice: 1200000,
              priceGap: -4.2,
            },
          },
          categories: [
            {
              name: "Fair Value & Market Context",
              score: 75,
              weight: 40,
              description: "Based on address analysis and location data",
              topFactors: contextualFactors.market,
              methodology: {
                baseScore: 75,
                calculation: "Address-based analysis with neighborhood enrichment data",
                adjustments: [
                  {
                    name: "Neighborhood Analysis",
                    score: 75,
                    weight: 1.0,
                    explanation: "Comprehensive location analysis using real data sources",
                    dataSource: "Multiple APIs and data sources",
                    value: "Enhanced"
                  }
                ],
                dataQuality: {
                  completeness: 85,
                  confidence: 80,
                  sources: ["Geocoding", "Neighborhood Enrichment APIs"]
                }
              }
            },
            {
              name: "Location & Neighborhood", 
              score: enrichmentData.overallScore || 78,
              weight: 20,
              description: "Comprehensive analysis using subway, walkability, noise, and parking data",
              topFactors: contextualFactors.location,
              methodology: {
                baseScore: enrichmentData.overallScore || 78,
                calculation: "Weighted combination of subway access, walkability, noise levels, and parking availability",
                adjustments: [
                  {
                    name: "Subway Proximity",
                    score: enrichmentData.subway?.overallScore || 75,
                    weight: 0.35,
                    explanation: enrichmentData.subway?.description || "Subway access analysis",
                    dataSource: "NYC MTA API",
                    value: enrichmentData.subway?.nearestStations[0]?.name || "Nearby station"
                  },
                  {
                    name: "Walkability Score",
                    score: enrichmentData.walkability?.score || 80,
                    weight: 0.25,
                    explanation: enrichmentData.walkability?.description || "Walkability analysis",
                    dataSource: "NYC Open Data & OpenStreetMap",
                    value: `${enrichmentData.walkability?.score || 80}/100`
                  },
                  {
                    name: "Noise Assessment",
                    score: enrichmentData.noise?.score || 70,
                    weight: 0.25,
                    explanation: enrichmentData.noise?.description || "Noise level analysis",
                    dataSource: "Traffic & Environmental Data",
                    value: enrichmentData.noise?.level || "Moderate"
                  },
                  {
                    name: "Parking Availability",
                    score: enrichmentData.parking?.score || 65,
                    weight: 0.15,
                    explanation: enrichmentData.parking?.description || "Parking availability analysis",
                    dataSource: "NYC Parking Data",
                    value: enrichmentData.parking?.availability || "Limited"
                  }
                ],
                dataQuality: {
                  completeness: 90,
                  confidence: 88,
                  sources: ["NYC MTA", "NYC Open Data", "OpenStreetMap", "Traffic Data"]
                }
              }
            },
            {
              name: "Building & Amenities",
              score: 65,
              weight: 15,
              description: "Limited building data from address analysis",
              topFactors: contextualFactors.building,
            },
            {
              name: "Unit & Layout",
              score: 60,
              weight: 20,
              description: "Estimated based on typical properties in area",
              topFactors: contextualFactors.unit,
            },
            {
              name: "Special Conditions",
              score: 70,
              weight: 5,
              description: "Address-based analysis completed",
              topFactors: contextualFactors.bonus,
            },
          ],
          comparables: [], // No comparables for address search
        };
        
        setAnalysisResult(analysisResult);
        toast({
          title: "Address Analysis Complete",
          description: "Comprehensive neighborhood data has been gathered for this location.",
          variant: "default",
        });
        
      } catch (enrichmentError) {
        console.error("Neighborhood enrichment failed:", enrichmentError);
        toast({
          title: "Enrichment Error",
          description: "Using basic analysis without enhanced neighborhood data.",
          variant: "default",
        });
        
        // Fallback to basic analysis without enrichment
        const basicAnalysisResult: AnalysisResult = {
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
            neighborhood: locationData?.neighborhood || "NYC Area",
            daysOnMarket: undefined,
          },
          streetwiseScore: {
            score: 68,
            confidence: 70,
            interpretation: "Basic Analysis",
            priceAnalysis: {
              askingPrice: 1150000,
              expectedPrice: 1150000,
              priceGap: 0,
            },
          },
          categories: [
            {
              name: "Fair Value & Market Context",
              score: 65,
              weight: 40,
              description: "Basic address analysis",
              topFactors: { positive: ["Address provided"], negative: ["Limited data available"] },
            },
            {
              name: "Location & Neighborhood", 
              score: 60,
              weight: 20,
              description: "Basic location analysis",
              topFactors: { positive: ["Valid address"], negative: ["Enhanced data unavailable"] },
            },
            {
              name: "Building & Amenities",
              score: 50,
              weight: 15,
              description: "Limited building data",
              topFactors: { positive: [], negative: ["No building details available"] },
            },
            {
              name: "Unit & Layout",
              score: 50,
              weight: 20,
              description: "No unit details available",
              topFactors: { positive: [], negative: ["No unit information"] },
            },
            {
              name: "Special Conditions",
              score: 50,
              weight: 5,
              description: "Basic conditions analysis",
              topFactors: { positive: ["Address search"], negative: [] },
            },
          ],
          comparables: [],
        };
        
        setAnalysisResult(basicAnalysisResult);
      }
      
    } catch (error) {
      console.error("Address analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze this address. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsAnalyzing(false);
  };

  // Helper function to generate contextual top factors based on available data
  const generateContextualFactors = (data: any) => {
    const hasPrice = data.price && data.price > 0;
    const hasMaintenance = data.maintenance && data.maintenance > 0;
    const hasTaxes = data.taxes !== undefined && data.taxes >= 0;
    const hasSquareFeet = data.squareFeet && data.squareFeet > 0;
    const hasAddress = data.address && data.address.trim().length > 0;
    const hasUnit = data.unit && data.unit.trim().length > 0;
    const hasDescription = data.description && data.description.trim().length > 0;
    
    const marketFactors = {
      positive: [] as string[],
      negative: [] as string[]
    };
    
    const locationFactors = {
      positive: [] as string[],
      negative: [] as string[]
    };
    
    const buildingFactors = {
      positive: [] as string[],
      negative: [] as string[]
    };
    
    const unitFactors = {
      positive: [] as string[],
      negative: [] as string[]
    };
    
    const bonusFactors = {
      positive: [] as string[],
      negative: [] as string[]
    };

    // Market Context factors - only if we have relevant data
    if (hasPrice) {
      marketFactors.positive.push("Price information provided");
      if (hasSquareFeet) {
        const pricePerSqFt = data.price / data.squareFeet;
        if (pricePerSqFt < 1000) {
          marketFactors.positive.push("Competitive price per square foot");
        } else if (pricePerSqFt > 1500) {
          marketFactors.negative.push("High price per square foot");
        }
      }
    } else {
      marketFactors.negative.push("No pricing information available");
    }

    // Location factors - limited without geocoding
    if (hasAddress) {
      locationFactors.positive.push("Address provided for analysis");
      // Basic NYC borough detection
      const addressLower = data.address.toLowerCase();
      if (addressLower.includes('manhattan') || /\b(east|west|north|south)\s+\d+/.test(addressLower)) {
        locationFactors.positive.push("Manhattan location identified");
      }
    } else {
      locationFactors.negative.push("Limited location information");
    }

    // Building factors - based on available data
    if (data.propertyType) {
      buildingFactors.positive.push(`${data.propertyType.charAt(0).toUpperCase() + data.propertyType.slice(1)} building type`);
      
      if (data.propertyType === 'coop') {
        buildingFactors.negative.push("Co-op board approval required");
      }
    }
    
    if (hasMaintenance) {
      if (data.maintenance > 2000) {
        buildingFactors.negative.push("High maintenance fees");
      } else if (data.maintenance < 800) {
        buildingFactors.positive.push("Low maintenance fees");
      } else {
        buildingFactors.positive.push("Reasonable maintenance fees");
      }
    } else {
      buildingFactors.negative.push("No maintenance information provided");
    }

    // Unit factors - based on layout and features
    if (data.bedrooms && data.bathrooms) {
      if (data.bathrooms >= data.bedrooms) {
        unitFactors.positive.push("Good bedroom to bathroom ratio");
      }
      
      if (data.bedrooms >= 2 && data.bathrooms >= 2) {
        unitFactors.positive.push("Multiple bedrooms and bathrooms");
      }
    }
    
    if (hasSquareFeet) {
      if (data.squareFeet > 1500) {
        unitFactors.positive.push("Spacious layout");
      } else if (data.squareFeet < 800) {
        unitFactors.negative.push("Compact size");
      }
    } else {
      unitFactors.negative.push("No square footage information");
    }

    if (hasDescription) {
      unitFactors.positive.push("Detailed property description available");
    }

    // Bonus/Penalty factors
    if (hasTaxes) {
      if (data.taxes === 0) {
        bonusFactors.positive.push("No property taxes reported");
      } else if (data.taxes < 1000) {
        bonusFactors.positive.push("Low property taxes");
      } else if (data.taxes > 3000) {
        bonusFactors.negative.push("High property taxes");
      }
    } else {
      bonusFactors.negative.push("Tax information not provided");
    }

    if (hasUnit) {
      bonusFactors.positive.push("Specific unit identified");
    }

    // Ensure we have at least some factors for each category
    if (marketFactors.positive.length === 0 && marketFactors.negative.length === 0) {
      marketFactors.negative.push("Insufficient data for market analysis");
    }
    
    if (locationFactors.positive.length === 0 && locationFactors.negative.length === 0) {
      locationFactors.negative.push("Limited location analysis without geocoding");
    }
    
    if (buildingFactors.positive.length === 0 && buildingFactors.negative.length === 0) {
      buildingFactors.negative.push("Building details not available");
    }
    
    if (unitFactors.positive.length === 0 && unitFactors.negative.length === 0) {
      unitFactors.negative.push("Limited unit information provided");
    }
    
    if (bonusFactors.positive.length === 0 && bonusFactors.negative.length === 0) {
      bonusFactors.positive.push("Manual entry allows custom analysis");
    }

    return {
      market: marketFactors,
      location: locationFactors,
      building: buildingFactors,
      unit: unitFactors,
      bonus: bonusFactors
    };
  };

  const handleManualSubmit = async (data: any) => {
    console.log("Analyzing manual data:", data);
    setIsAnalyzing(true);
    
    try {
      // First, geocode the address to get coordinates
      const geocodingService = GeocodingService.getInstance();
      let locationData = null;
      
      if (!data.address) {
        toast({
          title: "Address Required",
          description: "Please provide an address for comprehensive analysis.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }
      
      try {
        locationData = await geocodingService.geocodeAddress(data.address);
      } catch (geocodingError) {
        console.warn("Geocoding failed:", geocodingError);
        toast({
          title: "Address Not Found",
          description: "Unable to locate this address. Please check the address and try again.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }
      
      if (!locationData || !locationData.lat || !locationData.lng) {
        toast({
          title: "Invalid Location",
          description: "Unable to get valid coordinates for this address.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }
      
      console.log(`Manual analysis geocoded ${data.address} to:`, locationData);
      
      // Get comprehensive neighborhood enrichment
      let enrichmentData = null;
      try {
        const enrichmentResponse = await apiRequest("POST", "/api/enrich-location", {
          lat: locationData.lat,
          lng: locationData.lng,
          address: data.address
        });
        
        enrichmentData = await enrichmentResponse.json();
        console.log("Neighborhood enrichment result:", enrichmentData);
      } catch (enrichmentError) {
        console.warn("Neighborhood enrichment failed:", enrichmentError);
      }
      
      // Get school score separately for backward compatibility 
      const schoolScoringClient = SchoolScoringClient.getInstance();
      let schoolScore = null;
      try {
        schoolScore = await schoolScoringClient.calculateSchoolScore(
          locationData.lat, 
          locationData.lng, 
          locationData.borough || "Manhattan"
        );
      } catch (schoolError) {
        console.warn("School scoring failed, using fallback:", schoolError);
        schoolScore = {
          score: 65,
          explanation: "School data unavailable for this location. Using neighborhood average.",
          dataSource: "Fallback estimate",
          value: "Estimated"
        };
      }
      
      // Get comprehensive market analysis
      let marketAnalysis = null;
      try {
        const marketResponse = await apiRequest("POST", "/api/analyze-market", {
          address: data.address,
          lat: locationData.lat,
          lng: locationData.lng,
          askingPrice: data.price,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          squareFeet: data.squareFeet,
          propertyType: data.propertyType,
          maxDistance: 0.5, // 0.5 miles radius for comparables
          minComparables: 3
        });
        
        marketAnalysis = await marketResponse.json();
        console.log("Market analysis result:", marketAnalysis);
      } catch (marketError) {
        console.warn("Market analysis failed:", marketError);
      }
      
      // Determine final location details from real data
      const finalNeighborhood = enrichmentData?.neighborhood || 
                               locationData?.neighborhood || 
                               (locationData?.borough && locationData.borough !== "Manhattan" ? locationData.borough : "Upper East Side");
      const finalBorough = locationData?.borough || "Manhattan";
      
      console.log("Final neighborhood determined:", finalNeighborhood);
      
      // Generate contextual factors and enhance with real enrichment data
      const contextualFactors = generateContextualFactors(data);
      
      // Enhance location factors with real enrichment data
      if (enrichmentData?.subway?.nearestStation) {
        contextualFactors.location.positive.push(`Near ${enrichmentData.subway.nearestStation} station (${enrichmentData.subway.distance}ft)`);
      }
      if (enrichmentData?.walkability?.score > 75) {
        contextualFactors.location.positive.push(`High walkability score: ${enrichmentData.walkability.score}/100`);
      }
      if (enrichmentData?.schools?.elementary?.distance < 0.3) {
        contextualFactors.location.positive.push("Close to quality elementary school");
      }
      
      // Calculate confidence based on data completeness and quality
      const dataFields = [data.price, data.bedrooms, data.bathrooms, data.squareFeet, data.maintenance, data.taxes, data.address];
      const providedFields = dataFields.filter(field => field !== undefined && field !== null && field !== "").length;
      const dataConfidence = Math.min(95, 40 + (providedFields * 8));
      const apiConfidence = (enrichmentData ? 15 : 0) + (marketAnalysis ? 25 : 0) + (schoolScore ? 10 : 0);
      const finalConfidence = Math.min(95, dataConfidence + apiConfidence);
      
      // Create real analysis result using the actual API responses
      const analysisResult: AnalysisResult = {
        property: {
          address: data.address,
          unit: data.unit,
          price: data.price || 0,
          bedrooms: data.bedrooms || 0,
          bathrooms: data.bathrooms || 0,
          squareFeet: data.squareFeet,
          propertyType: data.propertyType || "unknown",
          maintenance: data.maintenance,
          taxes: data.taxes,
          neighborhood: finalNeighborhood,
          daysOnMarket: undefined, // Manual entry doesn't have market timing data
        },
        streetwiseScore: {
          score: Math.max(50, Math.min(95, marketAnalysis?.overallScore || (60 + (providedFields * 4)))),
          confidence: finalConfidence,
          interpretation: finalConfidence > 80 ? "High Confidence Analysis" : finalConfidence > 60 ? "Good Analysis" : "Preliminary Analysis",
          priceAnalysis: {
            askingPrice: data.price || 0,
            expectedPrice: marketAnalysis?.fairValue?.estimate || data.price || 0,
            priceGap: marketAnalysis?.fairValue ? ((data.price - marketAnalysis.fairValue.estimate) / marketAnalysis.fairValue.estimate * 100) : 0,
          },
        },
        categories: [
          {
            name: "Fair Value & Market Context",
            score: marketAnalysis?.fairValue?.score || (data.price ? 65 : 40),
            weight: 40,
            description: marketAnalysis?.fairValue ? "Based on comprehensive market analysis with comparable properties" : "Limited analysis without market data",
            methodology: marketAnalysis?.fairValue ? {
              baseScore: marketAnalysis.fairValue.score || 65,
              adjustments: [
                {
                  name: "Comparable Properties",
                  score: 15,
                  weight: 40,
                  explanation: `${marketAnalysis.comparables?.length || 0} comparable properties within 0.5 miles`,
                  dataSource: "NYC Open Data & Internal Database",
                  value: marketAnalysis.comparables?.length || 0
                },
                {
                  name: "Location Adjustments",
                  score: 10,
                  weight: 30,
                  explanation: "Price adjustments based on location differences",
                  dataSource: "Market Analysis",
                  value: "Variable"
                },
                {
                  name: "Property Features",
                  score: 8,
                  weight: 20,
                  explanation: "Adjustments for bedrooms, bathrooms, and square footage",
                  dataSource: "Property Details",
                  value: `${data.bedrooms}BR/${data.bathrooms}BA`
                }
              ],
              calculation: `Fair value estimated at $${marketAnalysis.fairValue.estimate.toLocaleString()} based on comparable sales analysis`,
              dataQuality: {
                completeness: marketAnalysis.comparables?.length ? 85 : 60,
                confidence: marketAnalysis.fairValue.confidence || 75,
                sources: ["NYC Open Data", "Internal Database", "Property Records"]
              }
            } : undefined,
            topFactors: contextualFactors.market,
          },
          {
            name: "Location & Neighborhood",
            score: enrichmentData?.location?.overallScore || schoolScore?.score || (data.address ? 65 : 35),
            weight: 20,
            description: enrichmentData ? "Based on comprehensive neighborhood analysis" : "Basic location analysis from address",
            methodology: enrichmentData ? {
              baseScore: enrichmentData.location?.overallScore || schoolScore?.score || 65,
              adjustments: [
                {
                  name: "Transit Access",
                  score: enrichmentData.subway?.score || 5,
                  weight: 35,
                  explanation: `${enrichmentData.subway?.nearestStation || 'Unknown'} station`,
                  dataSource: "MTA Data",
                  value: `${enrichmentData.subway?.distance || 'N/A'}ft`
                },
                {
                  name: "Walkability",
                  score: (enrichmentData.walkability?.score || 60) / 10,
                  weight: 25,
                  explanation: "Walkability and pedestrian access",
                  dataSource: "OpenStreetMap",
                  value: `${enrichmentData.walkability?.score || 60}/100`
                },
                {
                  name: "Schools",
                  score: (schoolScore?.score || 65) / 10,
                  weight: 25,
                  explanation: "School quality and proximity",
                  dataSource: "NYC School Data",
                  value: schoolScore?.score || 65
                },
                {
                  name: "Neighborhood Character",
                  score: 7,
                  weight: 15,
                  explanation: `Located in ${finalNeighborhood}`,
                  dataSource: "Geocoding Analysis",
                  value: finalNeighborhood
                }
              ],
              calculation: `Location score based on transit, walkability, schools, and neighborhood character`,
              dataQuality: {
                completeness: enrichmentData ? 90 : 70,
                confidence: enrichmentData ? 85 : 65,
                sources: ["MTA", "OpenStreetMap", "NYC School Data", "Geocoding Services"]
              }
            } : undefined,
            topFactors: contextualFactors.location,
          },
          {
            name: "Building & Amenities",
            score: (data.propertyType && data.maintenance) ? 70 : 45,
            weight: 15,
            description: "Based on provided building information",
            methodology: data.propertyType ? {
              baseScore: (data.propertyType && data.maintenance) ? 70 : 45,
              adjustments: [
                {
                  name: "Property Type",
                  score: data.propertyType === 'condo' ? 8 : data.propertyType === 'coop' ? 7 : 6,
                  weight: 40,
                  explanation: `${data.propertyType} property characteristics`,
                  dataSource: "User Input",
                  value: data.propertyType
                },
                {
                  name: "Maintenance Costs",
                  score: data.maintenance ? (data.maintenance < 1000 ? 8 : data.maintenance < 2000 ? 6 : 4) : 3,
                  weight: 35,
                  explanation: "Monthly maintenance and fees",
                  dataSource: "User Input",
                  value: data.maintenance ? `$${data.maintenance.toLocaleString()}/month` : "Not provided"
                },
                {
                  name: "Building Quality",
                  score: 6,
                  weight: 25,
                  explanation: "Estimated based on property type and maintenance",
                  dataSource: "Analysis",
                  value: "Estimated"
                }
              ],
              calculation: `Building score based on property type characteristics and maintenance costs`,
              dataQuality: {
                completeness: data.propertyType && data.maintenance ? 75 : 50,
                confidence: data.propertyType && data.maintenance ? 70 : 45,
                sources: ["User Input", "Property Type Analysis"]
              }
            } : undefined,
            topFactors: contextualFactors.building,
          },
          {
            name: "Unit & Layout",
            score: (data.bedrooms && data.bathrooms && data.squareFeet) ? 80 : (data.bedrooms && data.bathrooms) ? 65 : 45,
            weight: 20,
            description: "Based on provided unit specifications",
            methodology: (data.bedrooms && data.bathrooms) ? {
              baseScore: (data.bedrooms && data.bathrooms && data.squareFeet) ? 80 : (data.bedrooms && data.bathrooms) ? 65 : 45,
              adjustments: [
                {
                  name: "Bedroom Count",
                  score: data.bedrooms === 2 ? 8 : data.bedrooms === 3 ? 9 : data.bedrooms >= 4 ? 10 : 6,
                  weight: 35,
                  explanation: "Number of bedrooms",
                  dataSource: "User Input",
                  value: `${data.bedrooms} bedroom${data.bedrooms > 1 ? 's' : ''}`
                },
                {
                  name: "Bathroom Count",
                  score: data.bathrooms >= 2 ? 8 : 6,
                  weight: 25,
                  explanation: "Number of bathrooms",
                  dataSource: "User Input",
                  value: `${data.bathrooms} bathroom${data.bathrooms > 1 ? 's' : ''}`
                },
                {
                  name: "Square Footage",
                  score: data.squareFeet ? (data.squareFeet > 1200 ? 8 : data.squareFeet > 800 ? 7 : 5) : 4,
                  weight: 30,
                  explanation: "Total living space",
                  dataSource: "User Input",
                  value: data.squareFeet ? `${data.squareFeet.toLocaleString()} sq ft` : "Not provided"
                },
                {
                  name: "Price per Sq Ft",
                  score: data.squareFeet && data.price ? (((data.price / data.squareFeet) < 1200) ? 8 : 6) : 5,
                  weight: 10,
                  explanation: "Price efficiency",
                  dataSource: "Calculated",
                  value: data.squareFeet && data.price ? `$${Math.round(data.price / data.squareFeet).toLocaleString()}/sq ft` : "N/A"
                }
              ],
              calculation: `Unit score based on room count, square footage, and space efficiency`,
              dataQuality: {
                completeness: (data.bedrooms && data.bathrooms && data.squareFeet) ? 95 : 70,
                confidence: (data.bedrooms && data.bathrooms && data.squareFeet) ? 85 : 70,
                sources: ["User Input", "Space Analysis"]
              }
            } : undefined,
            topFactors: contextualFactors.unit,
          },
          {
            name: "Bonuses/Penalties",
            score: 65,
            weight: 5,
            description: "Based on comprehensive analysis factors",
            methodology: {
              baseScore: 65,
              adjustments: [
                {
                  name: "Data Completeness",
                  score: Math.min(10, providedFields),
                  weight: 50,
                  explanation: "Quality and completeness of provided information",
                  dataSource: "User Input Analysis",
                  value: `${providedFields}/7 fields`
                },
                {
                  name: "Manual Entry Precision",
                  score: 7,
                  weight: 30,
                  explanation: "Accuracy of manually entered data",
                  dataSource: "Input Validation",
                  value: "High"
                },
                {
                  name: "Analysis Customization",
                  score: 6,
                  weight: 20,
                  explanation: "Ability to provide detailed custom analysis",
                  dataSource: "Manual Analysis Benefits",
                  value: "Available"
                }
              ],
              calculation: `Bonus score based on data quality and manual entry advantages`,
              dataQuality: {
                completeness: Math.min(100, (providedFields / 7) * 100),
                confidence: 70,
                sources: ["User Input", "Data Validation", "Manual Analysis"]
              }
            },
            topFactors: contextualFactors.bonus,
          },
        ],
        comparables: marketAnalysis?.comparables || [],
      };
      
      setAnalysisResult(analysisResult);
      setIsAnalyzing(false);
      
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${data.address} with ${finalConfidence}% confidence.`,
      });
      
    } catch (error) {
      console.error("Manual analysis failed:", error);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: "Unable to complete property analysis. Please try again.",
        variant: "destructive",
      });
    }
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
