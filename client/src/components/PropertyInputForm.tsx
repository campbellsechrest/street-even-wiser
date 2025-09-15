import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Link, 
  AlertTriangle,
  CheckCircle,
  DollarSign
} from "lucide-react";

const propertyInputSchema = z.object({
  url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  unit: z.string().optional(),
  price: z.number().min(1, "Price must be greater than 0"),
  bedrooms: z.number().min(0).max(10),
  bathrooms: z.number().min(0).max(10),
  squareFeet: z.number().optional(),
  propertyType: z.enum(["condo", "coop", "townhouse"]),
  maintenance: z.number().optional(),
  taxes: z.number().optional(),
  description: z.string().optional(),
});

type PropertyInputData = z.infer<typeof propertyInputSchema>;

interface PropertyInputFormProps {
  onSubmit: (data: PropertyInputData) => void;
  onExtractFromUrl?: (url: string) => void;
  isLoading?: boolean;
  extractionProgress?: {
    step: string;
    confidence: number;
  };
}

export default function PropertyInputForm({
  onSubmit,
  onExtractFromUrl,
  isLoading,
  extractionProgress,
}: PropertyInputFormProps) {
  const [inputMethod, setInputMethod] = useState<"url" | "manual">("url");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PropertyInputData>({
    resolver: zodResolver(propertyInputSchema),
    defaultValues: {
      bedrooms: 1,
      bathrooms: 1,
      propertyType: "condo",
    },
  });

  const urlValue = watch("url");

  const handleExtractFromUrl = () => {
    if (urlValue) {
      console.log("Extract from URL:", urlValue);
      onExtractFromUrl?.(urlValue);
    }
  };

  const onFormSubmit = (data: PropertyInputData) => {
    console.log("Form submitted:", data);
    onSubmit(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5" />
          <span>Property Information</span>
        </CardTitle>
        
        {/* Input Method Toggle */}
        <div className="flex space-x-2">
          <Button
            data-testid="button-url-method"
            variant={inputMethod === "url" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputMethod("url")}
          >
            <Link className="w-4 h-4 mr-2" />
            StreetEasy URL
          </Button>
          <Button
            data-testid="button-manual-method"
            variant={inputMethod === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => setInputMethod("manual")}
          >
            Manual Entry
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* URL Input Method */}
          {inputMethod === "url" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="url">StreetEasy URL</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    data-testid="input-property-url"
                    id="url"
                    placeholder="https://streeteasy.com/building/..."
                    {...register("url")}
                  />
                  <Button
                    data-testid="button-extract"
                    type="button"
                    onClick={handleExtractFromUrl}
                    disabled={!urlValue || isLoading}
                  >
                    Extract
                  </Button>
                </div>
                {errors.url && (
                  <p className="text-sm text-red-500 mt-1">{errors.url.message}</p>
                )}
              </div>

              {/* Extraction Progress */}
              {extractionProgress && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    {extractionProgress.confidence > 70 ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    )}
                    <span className="text-sm font-medium">{extractionProgress.step}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Confidence:</span>
                    <Badge variant={extractionProgress.confidence > 70 ? "default" : "secondary"}>
                      {extractionProgress.confidence}%
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                data-testid="input-address"
                id="address"
                placeholder="123 Main Street, New York, NY"
                {...register("address")}
              />
              {errors.address && (
                <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unit">Unit/Apt #</Label>
              <Input
                data-testid="input-unit"
                id="unit"
                placeholder="5B"
                {...register("unit")}
              />
            </div>

            <div>
              <Label htmlFor="price">Asking Price *</Label>
              <Input
                data-testid="input-price"
                id="price"
                type="number"
                placeholder="1250000"
                {...register("price", { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="text-sm text-red-500 mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                data-testid="input-bedrooms"
                id="bedrooms"
                type="number"
                min="0"
                max="10"
                {...register("bedrooms", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                data-testid="input-bathrooms"
                id="bathrooms"
                type="number"
                min="0"
                max="10"
                step="0.5"
                {...register("bathrooms", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="squareFeet">Square Feet</Label>
              <Input
                data-testid="input-square-feet"
                id="squareFeet"
                type="number"
                placeholder="1200"
                {...register("squareFeet", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="propertyType">Property Type</Label>
              <Select
                onValueChange={(value: "condo" | "coop" | "townhouse") => 
                  setValue("propertyType", value)
                }
                defaultValue="condo"
              >
                <SelectTrigger data-testid="select-property-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="coop">Co-op</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="maintenance">Monthly Maintenance</Label>
              <Input
                data-testid="input-maintenance"
                id="maintenance"
                type="number"
                placeholder="1200"
                {...register("maintenance", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="taxes">Monthly Taxes</Label>
              <Input
                data-testid="input-taxes"
                id="taxes"
                type="number"
                placeholder="950"
                {...register("taxes", { valueAsNumber: true })}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Additional Notes</Label>
              <Textarea
                data-testid="textarea-description"
                id="description"
                placeholder="Any additional details about the property..."
                {...register("description")}
              />
            </div>
          </div>

          <Button
            data-testid="button-analyze-property"
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Analyzing Property..." : "Generate Streetwise Score"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}