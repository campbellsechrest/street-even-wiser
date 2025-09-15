import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface ComparableProperty {
  id: string;
  address: string;
  unit?: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  soldDate?: string;
  distance: number; // in miles
  similarity: number; // percentage
  priceAdjustment: number; // percentage difference
  building?: string;
}

interface ComparablePropertiesProps {
  comparables: ComparableProperty[];
  onViewOnMap?: (propertyId: string) => void;
  onViewDetails?: (propertyId: string) => void;
}

export default function ComparableProperties({ 
  comparables, 
  onViewOnMap, 
  onViewDetails 
}: ComparablePropertiesProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDistance = (distance: number) => {
    if (distance < 0.1) return "Same building";
    if (distance < 0.2) return "Same block";
    return `${distance.toFixed(1)} mi`;
  };

  const getPriceAdjustmentIcon = (adjustment: number) => {
    if (adjustment > 2) return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (adjustment < -2) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const getPriceAdjustmentColor = (adjustment: number) => {
    if (adjustment > 2) return "text-green-600";
    if (adjustment < -2) return "text-red-500";
    return "text-muted-foreground";
  };

  const getSimilarityBadge = (similarity: number) => {
    if (similarity >= 85) return { text: "Very Similar", variant: "default" as const };
    if (similarity >= 70) return { text: "Similar", variant: "secondary" as const };
    return { text: "Somewhat Similar", variant: "outline" as const };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <span>Comparable Properties</span>
          <Badge variant="outline" className="ml-2">
            {comparables.length} found
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {comparables.map((comp) => {
            const similarityBadge = getSimilarityBadge(comp.similarity);
            
            return (
              <div
                key={comp.id}
                className="border border-border rounded-lg p-4 hover-elevate transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">
                      {comp.address}
                      {comp.unit && <span className="text-muted-foreground ml-1">#{comp.unit}</span>}
                    </h3>
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      <span>{formatDistance(comp.distance)}</span>
                      <Badge variant={similarityBadge.variant} className="text-xs">
                        {similarityBadge.text}
                      </Badge>
                      {comp.soldDate && (
                        <span>Sold {comp.soldDate}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-primary" data-testid={`text-comp-price-${comp.id}`}>
                      {formatPrice(comp.price)}
                    </div>
                    <div className="flex items-center space-x-1 text-xs">
                      {getPriceAdjustmentIcon(comp.priceAdjustment)}
                      <span className={getPriceAdjustmentColor(comp.priceAdjustment)}>
                        {comp.priceAdjustment > 0 ? '+' : ''}{comp.priceAdjustment.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Bed className="w-3 h-3 text-muted-foreground" />
                      <span data-testid={`text-comp-bedrooms-${comp.id}`}>{comp.bedrooms}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Bath className="w-3 h-3 text-muted-foreground" />
                      <span data-testid={`text-comp-bathrooms-${comp.id}`}>{comp.bathrooms}</span>
                    </div>
                    {comp.squareFeet && (
                      <div className="flex items-center space-x-1">
                        <Square className="w-3 h-3 text-muted-foreground" />
                        <span data-testid={`text-comp-sqft-${comp.id}`}>
                          {comp.squareFeet.toLocaleString()} sq ft
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      data-testid={`button-view-on-map-${comp.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log(`View ${comp.address} on map`);
                        onViewOnMap?.(comp.id);
                      }}
                    >
                      Map
                    </Button>
                    <Button
                      data-testid={`button-view-details-${comp.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log(`View details for ${comp.address}`);
                        onViewDetails?.(comp.id);
                      }}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}