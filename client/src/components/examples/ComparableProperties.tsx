import ComparableProperties from "../ComparableProperties";

export default function ComparablePropertiesExample() {
  // Todo: remove mock functionality
  const mockComparables = [
    {
      id: "1",
      address: "125 West 4th Street",
      unit: "3A",
      price: 1180000,
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1150,
      soldDate: "Dec 2024",
      distance: 0.02,
      similarity: 92,
      priceAdjustment: -5.6,
      building: "Same building",
    },
    {
      id: "2", 
      address: "110 West 3rd Street",
      price: 1320000,
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1280,
      soldDate: "Nov 2024",
      distance: 0.1,
      similarity: 85,
      priceAdjustment: 5.6,
    },
    {
      id: "3",
      address: "89 MacDougal Street",
      unit: "2B",
      price: 1100000,
      bedrooms: 2,
      bathrooms: 1.5,
      squareFeet: 1100,
      soldDate: "Oct 2024",
      distance: 0.2,
      similarity: 78,
      priceAdjustment: -12.0,
    },
    {
      id: "4",
      address: "145 Sullivan Street",
      price: 1290000,
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1250,
      soldDate: "Sep 2024",
      distance: 0.3,
      similarity: 81,
      priceAdjustment: 3.2,
    }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ComparableProperties
        comparables={mockComparables}
        onViewOnMap={(id) => console.log("View on map:", id)}
        onViewDetails={(id) => console.log("View details:", id)}
      />
    </div>
  );
}