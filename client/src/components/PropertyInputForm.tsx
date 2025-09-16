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
  DollarSign,
  Edit3,
  Search
} from "lucide-react";

// Separate schemas for different input methods
const urlInputSchema = z.object({
  url: z.string().url("Please enter a valid StreetEasy URL"),
});

const addressInputSchema = z.object({
  address: z.string().min(1, "Address is required"),
});

const manualInputSchema = z.object({
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

type UrlInputData = z.infer<typeof urlInputSchema>;
type AddressInputData = z.infer<typeof addressInputSchema>;
type ManualInputData = z.infer<typeof manualInputSchema>;

interface PropertyInputFormProps {
  onSubmitUrl: (data: UrlInputData) => void;
  onSubmitAddress: (data: AddressInputData) => void;
  onSubmitManual: (data: ManualInputData) => void;
  isLoading?: boolean;
  extractionProgress?: {
    step: string;
    confidence: number;
    extractedData?: Partial<ManualInputData>;
    needsManualInput?: boolean;
  };
}

export default function PropertyInputForm({
  onSubmitUrl,
  onSubmitAddress,
  onSubmitManual,
  isLoading,
  extractionProgress,
}: PropertyInputFormProps) {
  const [inputMethod, setInputMethod] = useState<"url" | "address" | "manual">("url");
  const [showManualCorrections, setShowManualCorrections] = useState(false);

  // URL form
  const urlForm = useForm<UrlInputData>({
    resolver: zodResolver(urlInputSchema),
  });

  // Address form
  const addressForm = useForm<AddressInputData>({
    resolver: zodResolver(addressInputSchema),
  });

  // Manual form
  const manualForm = useForm<ManualInputData>({
    resolver: zodResolver(manualInputSchema),
    defaultValues: {
      bedrooms: 1,
      bathrooms: 1,
      propertyType: "condo",
      ...extractionProgress?.extractedData,
    },
  });

  // Handle URL submission
  const onUrlSubmit = (data: UrlInputData) => {
    console.log("URL submitted:", data);
    onSubmitUrl(data);
  };

  // Handle address submission
  const onAddressSubmit = (data: AddressInputData) => {
    console.log("Address submitted:", data);
    onSubmitAddress(data);
  };

  // Handle manual submission
  const onManualSubmit = (data: ManualInputData) => {
    console.log("Manual data submitted:", data);
    onSubmitManual(data);
  };

  // Show manual corrections when extraction confidence is low
  if (extractionProgress?.needsManualInput && !showManualCorrections) {
    setShowManualCorrections(true);
    setInputMethod("manual");
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <p className="text-sm text-muted-foreground">
          Enter a StreetEasy URL for automatic data extraction, or search by address, or enter details manually.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Primary: URL Input */}
        {inputMethod === "url" && !showManualCorrections && (
          <div className="space-y-4">
            <form onSubmit={urlForm.handleSubmit(onUrlSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="url" className="text-base font-medium">
                  StreetEasy URL
                </Label>
                <div className="flex space-x-2 mt-2">
                  <Input
                    data-testid="input-streeteasy-url"
                    id="url"
                    placeholder="https://streeteasy.com/building/..."
                    className="flex-1"
                    {...urlForm.register("url")}
                  />
                  <Button
                    data-testid="button-analyze-url"
                    type="submit"
                    disabled={isLoading}
                  >
                    <Link className="w-4 h-4 mr-2" />
                    {isLoading ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
                {urlForm.formState.errors.url && (
                  <p className="text-sm text-red-500 mt-1">
                    {urlForm.formState.errors.url.message}
                  </p>
                )}
              </div>
            </form>

            {/* Alternative Options */}
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-muted-foreground">Or:</span>
              <Button
                data-testid="button-search-by-address"
                variant="outline"
                size="sm"
                onClick={() => setInputMethod("address")}
              >
                <Search className="w-4 h-4 mr-2" />
                Search by Address
              </Button>
              <Button
                data-testid="button-enter-manually"
                variant="outline"
                size="sm"
                onClick={() => setInputMethod("manual")}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Enter Manually
              </Button>
            </div>
          </div>
        )}

        {/* Secondary: Address Search */}
        {inputMethod === "address" && (
          <div className="space-y-4">
            <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="address" className="text-base font-medium">
                  Property Address
                </Label>
                <div className="flex space-x-2 mt-2">
                  <Input
                    data-testid="input-property-address"
                    id="address"
                    placeholder="123 Main Street, New York, NY"
                    className="flex-1"
                    {...addressForm.register("address")}
                  />
                  <Button
                    data-testid="button-search-address"
                    type="submit"
                    disabled={isLoading}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {isLoading ? "Searching..." : "Search"}
                  </Button>
                </div>
                {addressForm.formState.errors.address && (
                  <p className="text-sm text-red-500 mt-1">
                    {addressForm.formState.errors.address.message}
                  </p>
                )}
              </div>
            </form>

            <div className="flex items-center space-x-4 text-sm">
              <Button
                data-testid="button-back-to-url"
                variant="ghost"
                size="sm"
                onClick={() => setInputMethod("url")}
              >
                ← Back to URL input
              </Button>
              <Button
                data-testid="button-manual-from-address"
                variant="outline"
                size="sm"
                onClick={() => setInputMethod("manual")}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Enter Manually
              </Button>
            </div>
          </div>
        )}

        {/* Extraction Progress */}
        {extractionProgress && inputMethod === "url" && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              {extractionProgress.confidence > 70 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              )}
              <span className="text-sm font-medium">{extractionProgress.step}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Data Confidence:</span>
              <Badge variant={extractionProgress.confidence > 70 ? "default" : "secondary"}>
                {extractionProgress.confidence}%
              </Badge>
            </div>
            {extractionProgress.confidence < 70 && extractionProgress.needsManualInput && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">
                  Some data couldn't be extracted reliably. Please review and correct the information below.
                </p>
                <Button
                  data-testid="button-review-corrections"
                  size="sm"
                  onClick={() => setShowManualCorrections(true)}
                >
                  Review & Correct Data
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Manual Entry Form */}
        {(inputMethod === "manual" || showManualCorrections) && (
          <div className="space-y-4">
            <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="manual-address">Address *</Label>
                  <Input
                    data-testid="input-manual-address"
                    id="manual-address"
                    placeholder="123 Main Street, New York, NY"
                    {...manualForm.register("address")}
                  />
                  {manualForm.formState.errors.address && (
                    <p className="text-sm text-red-500 mt-1">
                      {manualForm.formState.errors.address.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="unit">Unit/Apt #</Label>
                  <Input
                    data-testid="input-manual-unit"
                    id="unit"
                    placeholder="5B"
                    {...manualForm.register("unit")}
                  />
                </div>

                <div>
                  <Label htmlFor="manual-price">Asking Price *</Label>
                  <Input
                    data-testid="input-manual-price"
                    id="manual-price"
                    type="number"
                    placeholder="1250000"
                    {...manualForm.register("price", { valueAsNumber: true })}
                  />
                  {manualForm.formState.errors.price && (
                    <p className="text-sm text-red-500 mt-1">
                      {manualForm.formState.errors.price.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="manual-bedrooms">Bedrooms *</Label>
                  <Input
                    data-testid="input-manual-bedrooms"
                    id="manual-bedrooms"
                    type="number"
                    min="0"
                    max="10"
                    {...manualForm.register("bedrooms", { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="manual-bathrooms">Bathrooms *</Label>
                  <Input
                    data-testid="input-manual-bathrooms"
                    id="manual-bathrooms"
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    {...manualForm.register("bathrooms", { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="manual-squareFeet">Square Feet</Label>
                  <Input
                    data-testid="input-manual-square-feet"
                    id="manual-squareFeet"
                    type="number"
                    placeholder="1200"
                    {...manualForm.register("squareFeet", { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="manual-propertyType">Property Type *</Label>
                  <Select
                    onValueChange={(value: "condo" | "coop" | "townhouse") => 
                      manualForm.setValue("propertyType", value)
                    }
                    defaultValue="condo"
                  >
                    <SelectTrigger data-testid="select-manual-property-type">
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
                  <Label htmlFor="manual-maintenance">Monthly Maintenance</Label>
                  <Input
                    data-testid="input-manual-maintenance"
                    id="manual-maintenance"
                    type="number"
                    placeholder="1200"
                    {...manualForm.register("maintenance", { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="manual-taxes">Monthly Taxes</Label>
                  <Input
                    data-testid="input-manual-taxes"
                    id="manual-taxes"
                    type="number"
                    placeholder="950"
                    {...manualForm.register("taxes", { valueAsNumber: true })}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="manual-description">Additional Notes</Label>
                  <Textarea
                    data-testid="textarea-manual-description"
                    id="manual-description"
                    placeholder="Any additional details about the property..."
                    {...manualForm.register("description")}
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  data-testid="button-generate-score"
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? "Analyzing Property..." : "Generate Streetwise Score"}
                </Button>
                
                {!showManualCorrections && (
                  <Button
                    data-testid="button-back-from-manual"
                    type="button"
                    variant="outline"
                    onClick={() => setInputMethod("url")}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}