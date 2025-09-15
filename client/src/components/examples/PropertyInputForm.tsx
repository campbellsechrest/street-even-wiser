import { useState } from "react";
import PropertyInputForm from "../PropertyInputForm";

export default function PropertyInputFormExample() {
  const [isLoading, setIsLoading] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<{
    step: string;
    confidence: number;
  } | undefined>();

  const handleSubmit = (data: any) => {
    console.log("Property data submitted:", data);
    setIsLoading(true);
    
    // Todo: remove mock functionality
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const handleExtractFromUrl = (url: string) => {
    console.log("Extracting from URL:", url);
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
        confidence: 92,
      });
      setIsLoading(false);
    }, 3000);
  };

  return (
    <div className="p-6">
      <PropertyInputForm
        onSubmit={handleSubmit}
        onExtractFromUrl={handleExtractFromUrl}
        isLoading={isLoading}
        extractionProgress={extractionProgress}
      />
    </div>
  );
}