# System Patterns: IngestIO

## Application Patterns

### Server Actions Pattern
The application uses Next.js server actions for all backend operations, providing a clean separation of concerns:
- **Data Operations**: Database CRUD operations in `actions/db/`
- **AI Operations**: AI model interactions in `actions/ai/`
- **Batch Operations**: Processing multiple items in `actions/batch/`
- **Payment Operations**: Stripe integration in `actions/stripe/`

### Rate Limiting Pattern
A tiered rate limiting system based on subscription levels:
- Limits API calls per user/time period
- Enforces document and page quotas based on subscription
- Implements API concurrency limits
- Uses Upstash Redis for distributed rate limiting

### Document Processing Pipeline
Multi-stage processing pipeline for handling documents:
1. Upload and validation
2. Schema generation
3. Extraction processing
4. Post-processing and data validation
5. Result storage and presentation

### Subscription Tier Model
A multi-tier subscription model affecting:
- Feature availability
- Processing quotas
- Rate limits
- Batch processing capabilities

## Data Patterns

### Schema-Driven Extraction
The application uses a schema-driven approach to data extraction:
- Schema generation based on natural language prompts
- Schema validation before extraction
- Structured data output matching schema definitions
- Support for multiple schema formats (Zod, TypeScript, JSON Schema)

### Dynamic Schema Generation
AI-powered schema generation:
- Converting natural language to structured schemas
- Document-type-specific schema templates
- Field validation rules generation
- Schema version management

## UI Patterns

### Dashboard Layout Pattern
The dashboard UI follows a consistent layout pattern:
- Persistent sidebar navigation
- Context-specific content area
- Action panels for common operations
- Status indicators for background processes

### Form Handling Pattern
A consistent approach to form handling:
- `react-hook-form` for form state management
- `zod` for form validation
- Error handling and field validation
- Reactive form state updates

### Responsive Design Pattern
Mobile-first responsive design approach:
- Fluid layouts adapting to screen sizes
- Component-specific responsive behaviors
- Context-aware UI element sizing
- Consistent spacing and sizing scale

## Integration Patterns

### AI Service Integration
Pattern for integrating with Gemini AI:
- Client abstraction layer in `lib/ai/vertex-client.ts`
- Error handling and retries
- Authentication strategy with fallbacks
- Monitoring and analytics integration

### Authentication Flow
Authentication pattern using Clerk:
- Protected routes via middleware
- User session management
- Role-based access control
- Authentication state management

### Analytics Integration
A comprehensive analytics approach:
- User and session tracking
- Feature usage monitoring
- Error tracking
- Performance metrics
- A/B testing capabilities 