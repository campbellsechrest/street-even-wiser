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
          price: 1250000,
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
            askingPrice: 1250000,
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
            methodology: {
              baseScore: 75,
              calculation: "Base Score (75) + Price Gap Adjustment (+12) + Market Conditions (-5) = 82",
              adjustments: [
                {
                  name: "Price Gap Analysis",
                  impact: +12,
                  weight: 0.5,
                  explanation: "Property asking price is 5.6% below expected market value based on comparable sales analysis",
                  dataSource: "StreetEasy comparable sales",
                  value: "-5.6%"
                },
                {
                  name: "Comparable Sales Quality",
                  impact: +8,
                  weight: 0.3,
                  explanation: "High-quality comparable data with 3 similar sales within 0.2 miles in the last 90 days",
                  dataSource: "MLS & StreetEasy",
                  value: "3 comps"
                },
                {
                  name: "Days on Market",
                  impact: -5,
                  weight: 0.15,
                  explanation: "Property has been on market for 45 days, above neighborhood average of 28 days",
                  dataSource: "StreetEasy market data",
                  value: "45 days"
                },
                {
                  name: "Market Trend",
                  impact: +2,
                  weight: 0.05,
                  explanation: "Greenwich Village prices up 3.2% year-over-year, indicating favorable market conditions",
                  dataSource: "StreetEasy Market Reports",
                  value: "+3.2% YoY"
                }
              ],
              dataQuality: {
                completeness: 92,
                confidence: 88,
                sources: ["StreetEasy", "MLS", "Public Records", "Market Reports"]
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
          <div className="space-y-8">
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
