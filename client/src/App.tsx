import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import Header from "@/components/Header";
import PropertyInputForm from "@/components/PropertyInputForm";
import StreetWiseScore from "@/components/StreetWiseScore";
import CategoryBreakdown from "@/components/CategoryBreakdown";
import PropertySummary from "@/components/PropertySummary";
import ComparableProperties from "@/components/ComparableProperties";
import NotFound from "@/pages/not-found";

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
        impact: number;
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

  const handleUrlSubmit = (data: { url: string }) => {
    console.log("Analyzing URL:", data);
    setIsAnalyzing(true);
    
    // Todo: remove mock functionality - simulate URL extraction and analysis
    setTimeout(() => {
      const mockResult: AnalysisResult = {
        property: {
          address: "123 West 4th Street",
          unit: "5B",
          price: 1185000,
          bedrooms: 2,
          bathrooms: 2,
          squareFeet: 1200,
          propertyType: "condo",
          maintenance: 1200,
          taxes: 950,
          neighborhood: "Greenwich Village",
          daysOnMarket: 45,
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
                  impact: 0,
                  weight: 0,
                  explanation: "AI model predicts $1,250,000 expected price based on property features: 2BR/2BA, 1,200 sqft, doorman building, Greenwich Village location, recent renovation",
                  dataSource: "Hedonic pricing model trained on 50K+ NYC transactions",
                  value: "$1,250,000"
                },
                {
                  name: "Price Gap Analysis", 
                  impact: 0,
                  weight: 0,
                  explanation: "Listing price $1,185,000 vs expected $1,250,000 = -5.2% gap (underpriced). Formula: (expected - listed) / expected",
                  dataSource: "List price vs model prediction",
                  value: "-5.2% gap (underpriced)"
                },
                {
                  name: "S-Curve Mapping",
                  impact: 0,
                  weight: 0,
                  explanation: "Price gap mapped to 0-100 scale using logistic transform (midpoint=8%, slope=25). Result: 73 base score",
                  dataSource: "Logistic transform: 50 + logistic(-5.2%, 8%, 25)",
                  value: "73 base score"
                },
                {
                  name: "Market Context Adjustment",
                  impact: 0,
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
                  impact: +8,
                  weight: 0.35,
                  explanation: "0.2 miles to W 4th St-Washington Square subway station (A,C,E,B,D,F,M lines)",
                  dataSource: "MTA & Google Maps",
                  value: "0.2 mi"
                },
                {
                  name: "School Quality",
                  impact: +5,
                  weight: 0.2,
                  explanation: "Excellent public schools nearby including IS 70 (rated 8/10) and multiple private options",
                  dataSource: "GreatSchools.org",
                  value: "8/10 avg"
                },
                {
                  name: "Street Noise Level",
                  impact: -10,
                  weight: 0.25,
                  explanation: "High traffic area with noise from Washington Square Park events and pedestrian activity",
                  dataSource: "NYC Noise Data & Site Analysis",
                  value: "65-70 dB"
                },
                {
                  name: "Walkability Score",
                  impact: +7,
                  weight: 0.15,
                  explanation: "Excellent walkability with 95/100 walk score, numerous cafes, restaurants, and shops",
                  dataSource: "Walk Score",
                  value: "95/100"
                },
                {
                  name: "Parking Availability",
                  impact: -5,
                  weight: 0.05,
                  explanation: "Limited street parking and expensive garage options ($300-450/month)",
                  dataSource: "SpotHero & Local Garages",
                  value: "$375 avg/mo"
                }
              ],
              dataQuality: {
                completeness: 88,
                confidence: 85,
                sources: ["MTA", "GreatSchools.org", "Walk Score", "NYC Open Data", "Site Visit"]
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
                  impact: +12,
                  weight: 0.3,
                  explanation: "24/7 doorman provides security, package handling, and concierge services",
                  dataSource: "StreetEasy listing & Building Management",
                  value: "24/7"
                },
                {
                  name: "Fitness Facilities",
                  impact: +8,
                  weight: 0.25,
                  explanation: "Well-equipped gym with cardio equipment, weights, and yoga studio",
                  dataSource: "Building amenity list",
                  value: "Full gym + yoga"
                },
                {
                  name: "Building Age & Condition",
                  impact: -7,
                  weight: 0.2,
                  explanation: "Pre-war building from 1925, shows age despite renovations, original plumbing/electrical",
                  dataSource: "NYC Building Records",
                  value: "1925 (99 years)"
                },
                {
                  name: "Maintenance Fees",
                  impact: -5,
                  weight: 0.15,
                  explanation: "Monthly maintenance of $1,200 is 15% above neighborhood average for similar properties",
                  dataSource: "StreetEasy market data",
                  value: "$1,200/mo"
                },
                {
                  name: "Common Areas",
                  impact: +2,
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
                  impact: +15,
                  weight: 0.4,
                  explanation: "Complete gut renovation in 2023 with high-end finishes, new kitchen, hardwood floors",
                  dataSource: "StreetEasy photos & listing details",
                  value: "2023 gut reno"
                },
                {
                  name: "Natural Light",
                  impact: +8,
                  weight: 0.25,
                  explanation: "South-facing windows provide excellent natural light throughout the day",
                  dataSource: "Listing photos & floor plan",
                  value: "South-facing"
                },
                {
                  name: "Kitchen Quality",
                  impact: +7,
                  weight: 0.15,
                  explanation: "Modern kitchen with stainless appliances, quartz counters, and efficient workflow",
                  dataSource: "Listing photos",
                  value: "Stainless + quartz"
                },
                {
                  name: "Layout Efficiency",
                  impact: -5,
                  weight: 0.15,
                  explanation: "Some wasted space in entry hallway, bedroom could be better proportioned",
                  dataSource: "Floor plan analysis",
                  value: "85% efficient"
                },
                {
                  name: "Storage Space",
                  impact: -3,
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
                  impact: +25,
                  weight: 0.6,
                  explanation: "Property benefits from 421a tax abatement, saving approximately $8,000/year until 2028",
                  dataSource: "NYC Tax Records & ACRIS",
                  value: "$8,000/yr until 2028"
                },
                {
                  name: "Pet Policy",
                  impact: +5,
                  weight: 0.1,
                  explanation: "Building allows pets with board approval, adds flexibility for future residents",
                  dataSource: "Building bylaws",
                  value: "Pets OK w/ approval"
                },
                {
                  name: "Flip Tax",
                  impact: -8,
                  weight: 0.25,
                  explanation: "2% flip tax on gross sale price must be paid by seller, reduces net proceeds",
                  dataSource: "Co-op offering plan",
                  value: "2% of gross"
                },
                {
                  name: "Board Package",
                  impact: +2,
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
      
      setAnalysisResult(mockResult);
      setIsAnalyzing(false);
    }, 3000);
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
