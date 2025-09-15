import { useState } from "react";
import PropertyInputForm from "../PropertyInputForm";

export default function PropertyInputFormExample() {
  const [isLoading, setIsLoading] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<{
    step: string;
    confidence: number;
    extractedData?: any;
    needsManualInput?: boolean;
  } | undefined>();

  const handleUrlSubmit = (data: { url: string }) => {
    console.log("URL submitted:", data);
    setIsLoading(true);
    
    // Todo: remove mock functionality - simulate extraction process
    setTimeout(() => {
      setExtractionProgress({
        step: "Parsing listing data...",
        confidence: 85,
      });
    }, 1000);

    setTimeout(() => {
      setExtractionProgress({
        step: "Extraction complete",
        confidence: 65, // Low confidence to trigger manual input
        extractedData: {
          address: "123 West 4th Street",
          price: 1250000,
          bedrooms: 2,
          bathrooms: 2,
        },
        needsManualInput: true,
      });
      setIsLoading(false);
    }, 3000);
  };

  const handleAddressSubmit = (data: { address: string }) => {
    console.log("Address submitted:", data);
    setIsLoading(true);
    
    // Todo: remove mock functionality
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const handleManualSubmit = (data: any) => {
    console.log("Manual data submitted:", data);
    setIsLoading(true);
    
    // Todo: remove mock functionality
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="p-6">
      <PropertyInputForm
        onSubmitUrl={handleUrlSubmit}
        onSubmitAddress={handleAddressSubmit}
        onSubmitManual={handleManualSubmit}
        isLoading={isLoading}
        extractionProgress={extractionProgress}
      />
    </div>
  );
}