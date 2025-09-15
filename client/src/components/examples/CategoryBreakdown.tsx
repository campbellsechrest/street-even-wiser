import CategoryBreakdown from "../CategoryBreakdown";

export default function CategoryBreakdownExample() {
  // Todo: remove mock functionality
  const mockCategories = [
    {
      name: "Fair Value & Market Context",
      score: 82,
      weight: 40,
      description: "Asking price vs. comp-adjusted expected price",
      topFactors: {
        positive: ["Below market pricing", "Strong comparable sales"],
        negative: ["High days on market"],
      },
    },
    {
      name: "Location & Neighborhood",
      score: 75,
      weight: 20,
      description: "Transit access, schools, noise, amenities",
      topFactors: {
        positive: ["Close to subway", "Top-rated schools"],
        negative: ["Street noise", "Limited parking"],
      },
    },
    {
      name: "Building & Amenities",
      score: 68,
      weight: 15,
      description: "Building quality, amenities, services",
      topFactors: {
        positive: ["Doorman", "Gym facility"],
        negative: ["High maintenance fees", "Older building"],
      },
    },
    {
      name: "Unit & Layout",
      score: 85,
      weight: 20,
      description: "Renovation, features, layout efficiency",
      topFactors: {
        positive: ["Recent renovation", "Great natural light"],
        negative: ["Small bathroom"],
      },
    },
    {
      name: "Bonuses/Penalties",
      score: 72,
      weight: 5,
      description: "Special conditions and deal-breakers",
      topFactors: {
        positive: ["Tax abatement", "Pets allowed"],
        negative: ["Flip tax"],
      },
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <CategoryBreakdown
        categories={mockCategories}
        onViewDetails={(category) => console.log("View details for:", category)}
      />
    </div>
  );
}