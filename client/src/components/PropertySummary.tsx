import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Calendar,
  DollarSign,
  ExternalLink,
  Camera,
  FileText
} from "lucide-react";

interface PropertySummaryProps {
  property: {
    address: string;
    unit?: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number;
    daysOnMarket: number;
    propertyType: string;
    neighborhood: string;
    yearBuilt?: number;
    maintenance?: number;
    taxes?: number;
    imageUrl?: string;
  };
  onViewPhotos?: () => void;
  onViewListing?: () => void;
  onViewFloorplan?: () => void;
}

export default function PropertySummary({ 
  property, 
  onViewPhotos, 
  onViewListing,
  onViewFloorplan 
}: PropertySummaryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatPricePerSqFt = (price: number, sqft?: number) => {
    if (!sqft) return "N/A";
    return `$${Math.round(price / sqft)}/sq ft`;
  };

  const getStatusBadge = (dom: number) => {
    if (dom < 30) return { text: "Fresh", variant: "default" as const };
    if (dom < 90) return { text: "Active", variant: "secondary" as const };
    return { text: "Stale", variant: "destructive" as const };
  };

  const status = getStatusBadge(property.daysOnMarket);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl">
              {property.address}
              {property.unit && <span className="text-muted-foreground ml-2">#{property.unit}</span>}
            </CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{property.neighborhood}</span>
              <Badge variant={status.variant}>{status.text}</Badge>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-primary" data-testid="text-property-price">
              {formatPrice(property.price)}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatPricePerSqFt(property.price, property.squareFeet)}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Property Image */}
        {property.imageUrl && (
          <div className="relative">
            <img
              src={property.imageUrl}
              alt={`${property.address} property`}
              className="w-full h-48 object-cover rounded-md"
            />
            <Button
              data-testid="button-view-photos"
              onClick={() => {
                console.log("View photos triggered");
                onViewPhotos?.();
              }}
              size="sm"
              className="absolute bottom-2 right-2"
            >
              <Camera className="w-4 h-4 mr-2" />
              View Photos
            </Button>
          </div>
        )}

        {/* Key Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center">
              <Bed className="w-4 h-4 text-muted-foreground mr-1" />
              <span className="font-semibold" data-testid="text-bedrooms">{property.bedrooms}</span>
            </div>
            <p className="text-xs text-muted-foreground">Bedrooms</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center">
              <Bath className="w-4 h-4 text-muted-foreground mr-1" />
              <span className="font-semibold" data-testid="text-bathrooms">{property.bathrooms}</span>
            </div>
            <p className="text-xs text-muted-foreground">Bathrooms</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center">
              <Square className="w-4 h-4 text-muted-foreground mr-1" />
              <span className="font-semibold" data-testid="text-square-feet">
                {property.squareFeet ? property.squareFeet.toLocaleString() : "N/A"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Sq Ft</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center">
              <Calendar className="w-4 h-4 text-muted-foreground mr-1" />
              <span className="font-semibold" data-testid="text-days-on-market">{property.daysOnMarket}</span>
            </div>
            <p className="text-xs text-muted-foreground">Days on Market</p>
          </div>
        </div>

        {/* Financial Details */}
        {(property.maintenance || property.taxes) && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Monthly Costs
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {property.maintenance && (
                <div>
                  <p className="text-muted-foreground">Maintenance</p>
                  <p className="font-semibold" data-testid="text-maintenance">
                    {formatPrice(property.maintenance)}
                  </p>
                </div>
              )}
              {property.taxes && (
                <div>
                  <p className="text-muted-foreground">Taxes (Monthly)</p>
                  <p className="font-semibold" data-testid="text-taxes">
                    {formatPrice(property.taxes)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="button-view-listing"
            onClick={() => {
              console.log("View listing triggered");
              onViewListing?.();
            }}
            className="flex items-center space-x-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Original Listing</span>
          </Button>
          
          <Button
            data-testid="button-view-floorplan"
            variant="outline"
            onClick={() => {
              console.log("View floorplan triggered");
              onViewFloorplan?.();
            }}
            className="flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>View Floorplan</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}