# Technical Context: IngestIO

## Application Architecture
The application follows a modern Next.js architecture with the following structure:
- **app/**: Next.js app router with route groups for marketing, dashboard, and auth
- **components/**: UI components organized by functionality
- **actions/**: Server actions for data operations and AI tasks
- **lib/**: Core utility functions and service integrations
- **db/**: Database schema definitions and migrations
- **types/**: TypeScript type definitions
- **prompts/**: AI prompt templates and helpers

## Key Technologies and Libraries

### Next.js and React
- Next.js 14 with App Router
- React Server Components for improved performance
- Server Actions for backend functionality

### Database
- PostgreSQL via Supabase
- Drizzle ORM for type-safe database access
- Migration management with drizzle-kit

### AI Integration
- Google Vertex AI for accessing Gemini 2.0 models
- Vercel AI SDK for streamlined AI interactions
- Structured schema generation and validation with Zod

### Authentication & Authorization
- Clerk for authentication
- Role-based access control
- Middleware for protected routes

### UI Framework
- Tailwind CSS for styling
- shadcn/ui component library (based on Radix UI)
- Responsive and accessible design

### Third-party Services
- Supabase for database and storage
- Stripe for payment processing
- PostHog for analytics
- Upstash Redis for rate limiting

## API Integrations
- Google Vertex AI (Gemini 2.0) for AI capabilities
- Stripe API for subscription management
- Supabase API for database operations

## Data Processing Pipeline
1. **Document Upload**: Files uploaded to Supabase storage
2. **Document Processing**: Metadata extraction and preparation
3. **Schema Generation**: Dynamic schema creation based on user prompts
4. **Data Extraction**: AI-powered extraction using generated schemas
5. **Data Transformation**: Post-processing and validation
6. **Data Presentation**: Rendering extracted data for user review

## Performance Considerations
- Rate limiting based on subscription tiers
- Caching strategies for improved performance
- Optimized file handling for large documents
- Batch processing for multiple documents

## Security Implementation
- Authentication with Clerk
- Data encryption for sensitive information
- Access control based on user roles
- Secure environment variable management

## Testing Strategy
- Unit tests with Vitest
- Database testing
- Role-based security testing
- AI integration testing 