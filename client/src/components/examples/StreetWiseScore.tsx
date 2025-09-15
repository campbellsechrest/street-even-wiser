import StreetWiseScore from "../StreetWiseScore";

export default function StreetWiseScoreExample() {
  // Todo: remove mock functionality
  const mockData = {
    score: 78,
    confidence: 85,
    interpretation: "Good Value",
    priceAnalysis: {
      askingPrice: 1250000,
      expectedPrice: 1180000,
      priceGap: -5.6,
    },
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <StreetWiseScore {...mockData} />
    </div>
  );
}