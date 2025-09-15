import PropertySummary from "../PropertySummary";

export default function PropertySummaryExample() {
  // Todo: remove mock functionality
  const mockProperty = {
    address: "123 West 4th Street",
    unit: "5B",
    price: 1250000,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1200,
    daysOnMarket: 45,
    propertyType: "Condo",
    neighborhood: "Greenwich Village",
    yearBuilt: 1920,
    maintenance: 1200,
    taxes: 950,
    imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=400&fit=crop",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PropertySummary
        property={mockProperty}
        onViewPhotos={() => console.log("View photos")}
        onViewListing={() => console.log("View listing")}
        onViewFloorplan={() => console.log("View floorplan")}
      />
    </div>
  );
}