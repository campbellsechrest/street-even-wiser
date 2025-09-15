import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  MapPin, 
  Building, 
  Home, 
  Plus,
  InfoIcon,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface CategoryScore {
  name: string;
  score: number;
  weight: number;
  description: string;
  topFactors: {
    positive: string[];
    negative: string[];
  };
}

interface CategoryBreakdownProps {
  categories: CategoryScore[];
  onViewDetails?: (categoryName: string) => void;
}

export default function CategoryBreakdown({ categories, onViewDetails }: CategoryBreakdownProps) {
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

  const getProgressColor = (score: number) => {
    if (score >= 70) return "bg-green-600";
    if (score >= 50) return "bg-yellow-600";
    return "bg-red-500";
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
          
          return (
            <div key={index} className="space-y-3">
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
                  <Button
                    data-testid={`button-details-${category.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log(`View details for ${category.name}`);
                      onViewDetails?.(category.name);
                    }}
                  >
                    Details
                  </Button>
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}