# Streetwise Real Estate Platform - Design Guidelines

## Design Approach
**Selected Approach**: Reference-Based Design inspired by **Zillow** and **Redfin**
- **Justification**: Real estate platforms require trust, data clarity, and professional credibility. Users expect familiar patterns from established real estate platforms.
- **Key Principles**: Data transparency, professional trust-building, intuitive property exploration

## Core Design Elements

### A. Color Palette
**Primary Colors**:
- Brand Blue: `220 85% 35%` (deep, trustworthy blue)
- Success Green: `140 70% 45%` (for positive scores)
- Warning Orange: `25 90% 55%` (for moderate scores)
- Alert Red: `0 75% 50%` (for low scores)

**Neutral Colors**:
- Text Primary: `220 15% 15%` (dark gray)
- Text Secondary: `220 10% 45%` (medium gray)
- Background: `220 20% 98%` (off-white)
- Border: `220 15% 85%` (light gray)

### B. Typography
- **Primary Font**: Inter (Google Fonts) - clean, modern, data-friendly
- **Headings**: Inter Medium/Semibold (24px, 20px, 18px)
- **Body Text**: Inter Regular (16px, 14px)
- **Data/Numbers**: Inter Medium for emphasis on scores and prices

### C. Layout System
**Spacing Units**: Tailwind spacing of 2, 4, 6, 8, 12, 16
- Container max-width: 7xl (1280px)
- Grid gaps: 6-8 units
- Card padding: 6 units
- Section spacing: 12-16 units

### D. Component Library

**Navigation**:
- Clean header with logo, search bar, and minimal navigation
- Sticky positioning with subtle shadow on scroll

**Property Cards**:
- Clean white cards with subtle shadows
- Property image, key metrics, Streetwise score prominently displayed
- Hover states with gentle elevation increase

**Score Visualization**:
- Circular progress indicators for main Streetwise score (0-100)
- Horizontal bar charts for category breakdowns
- Color-coded scoring: Green (70+), Orange (40-69), Red (below 40)

**Data Displays**:
- Clean tables with alternating row colors
- Charts using Chart.js with consistent color scheme
- Interactive map integration (Mapbox/Google Maps)

**Forms**:
- Single-column layout for property input
- Clear field labels and helpful placeholder text
- Validation states with appropriate colors

**Overlays**:
- Modal dialogs for detailed score explanations
- Slide-out panels for property comparisons

### E. Animations
**Minimal and Purposeful**:
- Gentle fade-ins for score reveals
- Smooth transitions for tab switching
- Subtle hover effects on interactive elements
- No distracting or excessive animations

## Key Interface Sections

**Dashboard Layout**:
1. **Header**: Search functionality and branding
2. **Property Summary**: Hero-style display of analyzed property
3. **Streetwise Score**: Large, prominent score with confidence indicator
4. **Category Breakdown**: Five scoring categories with detailed metrics
5. **Comparables**: Grid of similar properties with mini-scores
6. **Map View**: Interactive neighborhood context

**Professional Trust Elements**:
- Clear methodology explanations
- Data source transparency
- Confidence indicators throughout
- Professional color scheme avoiding playful elements

This design approach prioritizes data clarity, user trust, and familiar real estate platform patterns while maintaining a modern, professional aesthetic suitable for NYC Metro Area property analysis.