# Streetwise Real Estate Platform

## Overview

Streetwise is a NYC real estate intelligence platform that provides comprehensive property analysis through a proprietary scoring system. The platform allows users to input property details via multiple methods (StreetEasy URLs, addresses, or manual input) and generates detailed analysis including fair value assessment, neighborhood insights, building quality metrics, and comparable property data. The system is designed to help users make informed real estate decisions by providing transparent, data-driven insights similar to established platforms like Zillow and Redfin.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library following a "new-york" style
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Design System**: Custom design based on Zillow/Redfin patterns with professional color palette and Inter font family

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL store (connect-pg-simple)
- **Storage Pattern**: Repository pattern with in-memory fallback for development

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon (serverless)
- **ORM**: Drizzle ORM with code-first schema definition
- **Migrations**: Drizzle Kit for database migrations and schema management
- **Connection**: Serverless connection pooling via @neondatabase/serverless

### Component Architecture
- **UI Components**: Modular shadcn/ui components with Radix UI primitives
- **Property Analysis Components**: 
  - PropertyInputForm for multi-method data entry
  - StreetWiseScore for primary scoring display
  - CategoryBreakdown for detailed analysis
  - ComparableProperties for market comparison
  - PropertySummary for property overview
- **Layout Components**: Header with search and theme toggle functionality

### Development Environment
- **Build System**: Vite with React plugin and runtime error overlay
- **Development Tools**: Replit integration with cartographer for enhanced development experience
- **Type Safety**: Strict TypeScript configuration with path mapping
- **Code Quality**: ESLint and Prettier integration through shadcn/ui setup

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with WebSocket support for real-time connections
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect

### UI Libraries
- **Radix UI**: Comprehensive set of low-level UI primitives for accessibility and customization
- **Tailwind CSS**: Utility-first CSS framework with custom color scheme
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library based on Radix UI and Tailwind CSS

### Development Tools
- **Vite**: Fast build tool with hot module replacement
- **React Query**: Server state management and caching
- **React Hook Form**: Form handling with performance optimization
- **Zod**: Schema validation for type safety
- **Wouter**: Lightweight routing solution

### External APIs (Planned)
- Real estate data providers for property information
- Mapping services for location analysis
- Public records APIs for property history and tax information
- Transit and amenity data sources for neighborhood scoring

### Fonts and Assets
- **Google Fonts**: Inter font family for professional typography
- **Image Assets**: Property photos and UI graphics stored in attached_assets directory