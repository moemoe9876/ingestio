# Active Context: IngestIO

## Current Application State
IngestIO is a functional Next.js application that enables users to extract structured data from documents using Google's Gemini 2.0 AI model. The application features user authentication, document management, AI-powered extraction, and subscription-based access tiers.

## Architecture Overview
The application is built on Next.js 14 using the App Router pattern with a multi-route-group structure:
- **(marketing)**: Public-facing marketing pages
- **(dashboard)**: Protected application features
- **(auth)**: Authentication flows

Server actions handle backend operations, connecting to a PostgreSQL database through Drizzle ORM and integrating with Google Vertex AI for AI capabilities.

## Core Workflows

### Document Upload and Management
- Users can upload PDFs and images
- Documents are stored in Supabase storage
- Metadata is tracked in the database
- Documents can be organized and filtered

### Schema Generation
- Users describe desired data in natural language
- AI generates structured schemas (Zod/TypeScript/JSON Schema)
- Schemas define the structure of extracted data
- Schemas can be saved as templates for reuse

### Data Extraction
- The system processes documents according to schemas
- Google Gemini 2.0 extracts structured data
- Results are validated against the schema
- Users can review and edit extracted data
- Data can be exported in various formats

### Subscription Management
- Multiple subscription tiers with different capabilities
- Usage tracking and quota enforcement
- Payment processing through Stripe
- Account management and billing history

## Key Components

### Frontend Components
- Dashboard interface with sidebar navigation
- Document preview and management
- Extraction configuration forms
- Results visualization and export
- Account and subscription management

### Backend Services
- Document processing pipeline
- AI service integration
- Database operations
- Authentication and authorization
- Rate limiting and quota management

### Integration Points
- Google Vertex AI (Gemini 2.0)
- Supabase (Database and Storage)
- Clerk (Authentication)
- Stripe (Payments)
- PostHog (Analytics)
- Upstash Redis (Rate Limiting)

## Current Development Status
The application has a functional core with all primary features implemented:
- User authentication and role management
- Document upload and management
- Schema generation from natural language
- Data extraction using AI
- Results visualization and export
- Subscription and payment handling

## Outstanding Items and Opportunities
- Enhanced batch processing capabilities
- Additional document type support
- More export format options
- Performance optimizations for large documents
- Enhanced analytics dashboard
- Integration with external systems
- Mobile app version 