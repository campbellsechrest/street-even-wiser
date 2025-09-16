# Streetwise 🏠

**AI-powered real estate valuation platform for smarter home buying decisions in NYC**

## Overview

Streetwise democratizes access to professional-grade property analysis for NYC home buyers. By combining machine learning, econometric modeling, and comprehensive public data sources, we generate a standardized **Streetwise Score (0-100)** that reveals whether a listing offers good value relative to its asking price.

### 🎯 Core Value Proposition

- **For Buyers**: Close the information gap between buyers and sellers with data-driven insights
- **Transparency**: Every score is explainable with clear attribution to specific factors
- **Beyond Comparables**: Quantify nuanced factors like renovation quality, layout efficiency, and hyper-local conditions

## ✨ Key Features

### Comprehensive Scoring System
- **Overall Streetwise Score (0-100)**: Instant assessment of property value
  - 85-100: Exceptional Value
  - 70-84: Good Value  
  - 50-69: Average Value
  - 30-49: Poor Value
  - 0-29: Significantly Overpriced

### Five Category Analysis
1. **Fair Value & Market Context** (40% weight)
   - Comp-adjusted pricing analysis
   - Days on market insights
   - Price history tracking

2. **Location & Neighborhood** (20% weight)
   - Subway proximity scoring
   - School zone quality (NYC DOE data)
   - Noise level analysis
   - Neighborhood prestige ranking

3. **Building & Amenities** (15% weight)
   - Doorman/elevator availability
   - Building amenities scoring
   - Maintenance charge analysis

4. **Unit & Layout** (20% weight)
   - Renovation level classification
   - Layout efficiency analysis
   - In-unit amenities tracking

5. **Bonuses & Penalties** (±5-15% adjustment)
   - Special conditions and deal-breakers
   - Tax abatements, assessments, restrictions

### Model Highlights Features
- **Renovation Level Classifier**: 96% accuracy in detecting renovation quality from listing text
- **Hedonic Pricing Model**: Market-aware price predictions using Ridge/ElasticNet regression
- **Smart Data Extraction**: LLM-powered parsing of unstructured listing data
- **Confidence Scoring**: Every analysis includes data quality and confidence metrics

## 🛠 Tech Stack

### Frontend
- **React** + **TypeScript** - Modern, type-safe UI
- **Tailwind CSS** - Utility-first styling
- **Vite** - Lightning-fast build tooling
- **Mapbox/Leaflet** - Interactive property visualizations

### Backend
- **Node.js** - Edge functions for orchestration
- **Python/FastAPI** - ML microservices and pricing models
- **PostgreSQL** + **PostGIS** - Spatial data queries
- **Redis** - High-performance caching

### Data Pipeline
- **Firecrawl/Playwright** - Intelligent web scraping
- **Apache Airflow** - ETL orchestration
- **dbt** - Data transformation layer

### ML Infrastructure
- **scikit-learn** - Baseline models
- **XGBoost** - Advanced hedonic pricing
- **GPT-4** - Unstructured data extraction
- **Weights & Biases** - Experiment tracking

## 📊 Data Sources

### Primary Sources
- **StreetEasy** - Listing details, photos, floorplans
- **NYC Public Datasets**:
  - DOF/ACRIS - Closed sales transactions
  - PLUTO - Building metadata
  - DOE School Data - School zones and quality metrics
  - MTA GTFS - Transit accessibility
  - 311 Data - Noise complaints
  - OpenStreetMap - POIs and amenities

## 🚀 Getting Started

### Prerequisites
```bash
# Node.js 18+
node --version

# Python 3.11+
python --version

# PostgreSQL with PostGIS
psql --version
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/streetwise.git
cd streetwise
```

2. **Install frontend dependencies**
```bash
cd frontend
npm install
```

3. **Install backend dependencies**
```bash
cd ../backend
pip install -r requirements.txt
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your API keys and database credentials
```

5. **Initialize the database**
```bash
python scripts/init_db.py
python scripts/load_reference_data.py
```

6. **Start development servers**
```bash
# Terminal 1 - Frontend
cd frontend
npm run dev

# Terminal 2 - Backend
cd backend
uvicorn main:app --reload

# Terminal 3 - Data pipeline (optional)
airflow webserver
```

## 📝 API Documentation

### Score a Property
```http
POST /api/v1/score
Content-Type: application/json

{
  "url": "https://streeteasy.com/building/...",
  "manual_overrides": {
    "square_feet": 850
  }
}
```

### Get Comparables
```http
GET /api/v1/comparables?address=163+E+81st+St&radius=0.5&limit=10
```

### Market Analysis
```http
GET /api/v1/market?neighborhood=Upper+East+Side&timeframe=12_months
```

## 🗺 Roadmap

### Phase 1 - MVP ✅
- [x] Core scoring algorithm
- [x] StreetEasy scraping
- [x] Basic comparables
- [x] Renovation classifier
- [x] Web interface

### Phase 2 - Q2 2025
- [ ] Chrome extension
- [ ] User accounts & saved searches
- [ ] Personalized Fit Scores
- [ ] Enhanced comparables with photos
- [ ] What-if analysis tools

### Phase 3 - Q3 2025
- [ ] Light quality classifier
- [ ] Layout efficiency analyzer
- [ ] Empirically-derived weights
- [ ] Advanced market predictions
- [ ] Partner API

### Phase 4 - Q4 2025
- [ ] Geographic expansion (SF, Boston, DC)
- [ ] Zillow/Redfin support
- [ ] Mobile applications
- [ ] Investment analysis tools

## 📊 Model Performance

| Model | Accuracy | Notes |
|-------|----------|-------|
| Renovation Classifier | 96% | TF-IDF + Logistic Regression |
| School Zone Matching | 99.2% | SODA spatial queries |
| Confidence Scoring | 84% avg | Ensemble approach |

## 📄 License

This project is licensed under the MIT License.

## ⚖️ Legal & Compliance

- Respects robots.txt and terms of service
- Implements rate limiting and backoff strategies
- Not intended as professional appraisal advice

---

**Built with ❤️ and a very helpful Replit agent **
