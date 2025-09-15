import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  DollarSign, 
  MapPin, 
  Building, 
  Home, 
  Plus,
  InfoIcon,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Calculator,
  Target,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

interface ScoringFactor {
  name: string;
  score: number; // 0-100 normalized score
  weight: number; // 0-1 representing importance in category
  explanation: string;
  dataSource: string;
  value?: string | number;
  verdict?: "underpriced" | "overpriced" | "fair";
  multiplier?: number;
}

interface CategoryScore {
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
    adjustments: ScoringFactor[];
    calculation: string;
    dataQuality: {
      completeness: number; // 0-100%
      confidence: number; // 0-100%
      sources: string[];
    };
  };
}

interface CategoryBreakdownProps {
  categories: CategoryScore[];
  onViewDetails?: (categoryName: string) => void;
}

function CategoryDetailsExplainer({ category }: { category: CategoryScore }) {
  if (!category.methodology) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">Detailed methodology not available for this category.</span>
        </div>
      </div>
    );
  }

  const { baseScore, adjustments, calculation, dataQuality } = category.methodology;

  return (
    <div className="space-y-6 p-4 bg-muted/30 rounded-lg border">
      {/* Score Calculation Overview */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Calculator className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Score Calculation</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground">Base Score</span>
            <div className="font-mono text-lg">{baseScore}/100</div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">After Adjustments</span>
            <div className="font-mono text-lg font-semibold">{category.score}/100</div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Category Weight</span>
            <div className="font-mono text-lg">{category.weight}%</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border-l-2 border-primary">
          <strong>Formula:</strong> {calculation}
        </div>
      </div>

      {/* Scoring Factors */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Scoring Factors</h4>
        </div>
        <div className="space-y-3">
          {adjustments.map((factor, index) => {
            // Special handling for Fair Value category
            const isFairValue = category.name === "Fair Value & Market Context";
            
            // Conditional coloring for price gap analysis
            let impactColor = 'text-muted-foreground';
            let impactBg = 'bg-muted/50';
            
            if (factor.name === "Price Gap Analysis" && factor.value && typeof factor.value === 'string') {
              if (factor.value.includes('underpriced')) {
                impactColor = 'text-green-600';
                impactBg = 'bg-green-50 dark:bg-green-950/30';
              } else if (factor.value.includes('overpriced')) {
                impactColor = 'text-red-500';
                impactBg = 'bg-red-50 dark:bg-red-950/30';
              }
            } else if (factor.name === "Market Context Adjustment" && factor.value && typeof factor.value === 'string') {
              // Parse multiplier from value string like "1.12x multiplier"
              const multiplierMatch = factor.value.match(/(\d+\.?\d*)x/);
              if (multiplierMatch) {
                const multiplier = parseFloat(multiplierMatch[1]);
                if (multiplier > 1.0) {
                  impactColor = 'text-green-600';
                  impactBg = 'bg-green-50 dark:bg-green-950/30';
                } else if (multiplier < 1.0) {
                  impactColor = 'text-red-500';
                  impactBg = 'bg-red-50 dark:bg-red-950/30';
                }
              }
            } else if (!isFairValue) {
              // Normalized score coloring for non-Fair Value categories
              if (factor.score >= 70) {
                impactColor = 'text-green-600';
                impactBg = 'bg-green-50 dark:bg-green-950/30';
              } else if (factor.score <= 30) {
                impactColor = 'text-red-500';
                impactBg = 'bg-red-50 dark:bg-red-950/30';
              } else {
                impactColor = 'text-muted-foreground';
                impactBg = 'bg-muted/50';
              }
            }
            
            return (
              <div key={index} className={`p-3 rounded border ${impactBg}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{factor.name}</span>
                      {factor.value && (
                        <Badge variant="outline" className="text-xs">
                          {factor.value}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{factor.explanation}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Source: {factor.dataSource}</span>
                      {!isFairValue && (
                        <span>Weight: {Math.round(factor.weight * 100)}%</span>
                      )}
                    </div>
                  </div>
                  {!isFairValue && (
                    <div className="text-right">
                      <div className={`font-mono font-semibold ${impactColor}`}>
                        {factor.score}/100
                      </div>
                      <div className="text-xs text-muted-foreground">score</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Quality */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <InfoIcon className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Data Quality & Sources</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Data Completeness</span>
              <span className="font-medium">{dataQuality.completeness}%</span>
            </div>
            <Progress value={dataQuality.completeness} className="h-1" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Confidence Level</span>
              <span className="font-medium">{dataQuality.confidence}%</span>
            </div>
            <Progress value={dataQuality.confidence} className="h-1" />
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Data Sources:</span>
          <div className="flex flex-wrap gap-1">
            {dataQuality.sources.map((source, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {source}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CategoryBreakdown({ categories, onViewDetails }: CategoryBreakdownProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "fair value & market context":
        return DollarSign;
      case "location & neighborhood":
        return MapPin;
      case "building & amenities":
        return Building;
      case "unit & layout":
        return Home;
      case "bonuses/penalties":
        return Plus;
      default:
        return InfoIcon;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-500";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <InfoIcon className="w-5 h-5" />
          <span>Category Breakdown</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {categories.map((category, index) => {
          const Icon = getCategoryIcon(category.name);
          const isExpanded = expandedCategories.has(category.name);
          
          return (
            <Collapsible 
              key={index}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category.name)}
            >
              <div className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-sm">{category.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Weight: {category.weight}% • {category.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span 
                      className={`text-xl font-bold ${getScoreColor(category.score)}`}
                      data-testid={`text-score-${category.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      {category.score}
                    </span>
                    <CollapsibleTrigger asChild>
                      <Button
                        data-testid={`button-details-${category.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        {isExpanded ? (
                          <><ChevronDown className="w-3 h-3" /><span>Hide Details</span></>
                        ) : (
                          <><ChevronRight className="w-3 h-3" /><span>Show Details</span></>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                {/* Progress Bar */}
                <Progress 
                  value={category.score} 
                  className="h-2"
                />

                {/* Top Factors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {category.topFactors.positive.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span className="font-medium text-green-600">Top Positives</span>
                      </div>
                      <div className="space-y-1">
                        {category.topFactors.positive.slice(0, 2).map((factor, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {category.topFactors.negative.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1">
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        <span className="font-medium text-red-500">Areas of Concern</span>
                      </div>
                      <div className="space-y-1">
                        {category.topFactors.negative.slice(0, 2).map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Detailed Explanation */}
                <CollapsibleContent className="mt-4">
                  <CategoryDetailsExplainer category={category} />
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}