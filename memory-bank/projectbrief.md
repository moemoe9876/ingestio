# Project Brief: IngestIO - Data Extraction NextJS App

## Project Overview
IngestIO is a web application built with Next.js that leverages Google's Gemini 2.0 AI model to extract structured data from PDFs and other document types. The application allows users to upload documents, define extraction schemas through natural language prompts, and extract structured information that can be used for further processing or analysis.

## Core Functionality
- Document upload and management (PDFs, images)
- Schema generation through natural language prompts
- Structured data extraction using Google Gemini 2.0 AI
- Data visualization and export options
- User authentication and subscription tiers
- Usage tracking and rate limiting

## Tech Stack
- **Frontend**: Next.js 14, React 18, Tailwind CSS, shadcn/ui components
- **Backend**: Next.js server actions, Supabase
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: Google Vertex AI (Gemini 2.0)
- **Authentication**: Clerk
- **Payments**: Stripe
- **Analytics**: PostHog
- **Rate Limiting**: Upstash Redis

## Data Model
The application uses a relational database with the following key entities:
- **Users/Profiles**: User accounts and profile information
- **Documents**: Uploaded files with metadata
- **Extraction Jobs**: Processing jobs for data extraction
- **Extraction Batches**: Groups of related extraction jobs
- **Extracted Data**: Results of extraction operations
- **Exports**: Data export history

## Application Flow
1. User uploads a document (PDF/image)
2. User provides a natural language prompt describing desired data extraction
3. System generates a schema based on the prompt
4. AI model extracts structured data according to the schema
5. User reviews and can export the extracted data

## Key Components
- Document upload and file management system
- AI integration layer with Google Vertex AI
- Schema generation and validation
- Data extraction processing pipeline
- User dashboard for managing documents and extractions

## Development Considerations
- Handling large PDF files efficiently
- Managing API rate limits and quotas
- Ensuring data privacy and security
- Optimizing AI performance and accuracy
- Supporting multiple document formats
- Implementing subscription tiers and usage limits 