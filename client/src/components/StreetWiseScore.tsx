import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface StreetWiseScoreProps {
  score: number;
  confidence: number;
  interpretation: string;
  priceAnalysis: {
    askingPrice: number;
    expectedPrice: number;
    priceGap: number;
  };
}

export default function StreetWiseScore({
  score,
  confidence,
  interpretation,
  priceAnalysis,
}: StreetWiseScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-green-500";
    if (score >= 50) return "text-yellow-600";
    if (score >= 30) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 70) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (confidence >= 60) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return "High Confidence";
    if (confidence >= 60) return "Preliminary Analysis";
    return "Limited Analysis";
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card className="w-full hover-elevate">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center space-x-2 mb-2">
          {getConfidenceIcon(confidence)}
          <span className="text-sm text-muted-foreground">
            {getConfidenceLabel(confidence)} ({confidence}%)
          </span>
        </div>
        <CardTitle className="text-2xl">Streetwise Score</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="text-center space-y-4">
          <div className={`text-6xl font-bold ${getScoreColor(score)}`} data-testid="text-score">
            {score}
          </div>
          <Badge 
            data-testid="badge-interpretation"
            variant={getScoreBadgeVariant(score)} 
            className="text-lg px-4 py-2"
          >
            {interpretation}
          </Badge>
          <Progress value={score} className="w-full h-3" />
        </div>

        {/* Price Analysis */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Price Analysis</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Asking Price</p>
              <p className="font-semibold" data-testid="text-asking-price">
                {formatPrice(priceAnalysis.askingPrice)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Expected Price</p>
              <p className="font-semibold" data-testid="text-expected-price">
                {formatPrice(priceAnalysis.expectedPrice)}
              </p>
            </div>
          </div>
          
          <div className="pt-2 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Price Gap:</span>
              <span 
                className={`font-semibold ${priceAnalysis.priceGap > 0 ? 'text-green-600' : 'text-red-500'}`}
                data-testid="text-price-gap"
              >
                {priceAnalysis.priceGap > 0 ? '+' : ''}{priceAnalysis.priceGap.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}