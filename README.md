# Streetwise Real Estate Platform

AI-powered real estate valuation platform for NYC Metro Area properties that generates comprehensive 0-100 Streetwise Scores.

## Features

- **Multiple Input Methods**: StreetEasy URL extraction, address search, and manual property entry
- **Proprietary Streetwise Score**: 0-100 scoring system for property valuation
- **Comprehensive Analysis**: Market context, location scoring, building quality, and unit features
- **Real-time Data**: Integration with public APIs for schools, transit, and market data
- **Comparable Properties**: Find and analyze similar properties in the area

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **APIs**: OpenAI, NYC Open Data, GreatSchools, Firecrawl

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see .env.example)
4. Run the development server: `npm run dev`

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for AI analysis
- `FIRECRAWL_API_KEY`: Firecrawl API key for web scraping
- `SESSION_SECRET`: Secret for session management
