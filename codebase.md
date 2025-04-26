# DeepWiki moemoe9876/app Documentation

This document contains all the documentation for moemoe9876/app.

## Table of Contents

- [1-overview](#1-overview)
- [2-architecture](#2-architecture)
- [2.1-data-flow](#2.1-data-flow)
- [2.2-database-schema](#2.2-database-schema)
- [3-document-processing](#3-document-processing)
- [3.1-document-upload](#3.1-document-upload)
- [3.2-ai-extraction](#3.2-ai-extraction)
- [3.3-document-review](#3.3-document-review)
- [3.4-batch-processing](#3.4-batch-processing)
- [4-user-management](#4-user-management)
- [5-subscription-system](#5-subscription-system)
- [6-analytics](#6-analytics)
- [7-user-interface](#7-user-interface)
- [7.1-dashboard](#7.1-dashboard)
- [7.2-document-history](#7.2-document-history)
- [7.4-marketing-pages](#7.4-marketing-pages)
- [8-server-actions](#8-server-actions)
- [9-rate-limiting-and-quotas](#9-rate-limiting-and-quotas)
- [3-document-processing](#3-document-processing)
- [4-user-management](#4-user-management)
- [5-subscription-system](#5-subscription-system)
- [6-analytics](#6-analytics)


---

# Overview

URL: https://deepwiki.com/moemoe9876/my-app/1-overview


# Overview

Relevant source files

The following files were used as context for generating this wiki page:

  * [.cursor/rules/general.mdc](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursor/rules/general.mdc)
  * [components/utilities/posthog/posthog-provider.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/posthog/posthog-provider.tsx)
  * [components/utilities/posthog/posthog-user-identity.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/posthog/posthog-user-identity.tsx)
  * [implementation.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md)
  * [memory-bank/progress.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/progress.md)
  * [memory-bank/projectbrief.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/projectbrief.md)
  * [memory-bank/systemPatterns.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/systemPatterns.md)
  * [memory-bank/tasks.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/tasks.md)
  * [memory-bank/techContext.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/techContext.md)
  * [package.json](https://github.com/moemoe9876/my-app/blob/b1f77c9f/package.json)
  * [pnpm-lock.yaml](https://github.com/moemoe9876/my-app/blob/b1f77c9f/pnpm-lock.yaml)



IngestIO is an AI-powered document data extraction system that enables users to extract structured information from various document types using Google's Vertex AI (Gemini) models. The application allows users to upload documents, extract data using natural language prompts, review the extracted information, and export it in various formats.

For information on specific subsystems:

  * For document processing details, see [Document Processing](/moemoe9876/my-app/3-document-processing)
  * For authentication implementation, see [User Management](/moemoe9876/my-app/4-user-management)
  * For subscription details, see [Subscription System](/moemoe9876/my-app/5-subscription-system)
  * For analytics implementation, see [Analytics](/moemoe9876/my-app/6-analytics)



## System Architecture

IngestIO follows a modern Next.js architecture using the App Router, Server Components, and Server Actions. The application is organized into clearly defined layers that work together to provide its functionality.

### High-Level Architecture Diagram


Sources: [implementation.md18-35](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L18-L35) [memory-bank/projectbrief.md2-13](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/projectbrief.md#L2-L13) [memory-bank/techContext.md3-13](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/techContext.md#L3-L13)

### Tech Stack

IngestIO is built with the following technologies:

Layer| Technology  
---|---  
Frontend| Next.js 14, React 18, Tailwind CSS, shadcn/ui components, Framer Motion  
Backend| Next.js server actions, Supabase  
Database| PostgreSQL with Drizzle ORM  
AI Integration| Google Vertex AI (Gemini 2.0) via Vercel AI SDK  
Authentication| Clerk  
Payments| Stripe  
Analytics| PostHog  
Rate Limiting| Upstash Redis  
  
Sources: [package.json33-110](https://github.com/moemoe9876/my-app/blob/b1f77c9f/package.json#L33-L110) [memory-bank/projectbrief.md14-22](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/projectbrief.md#L14-L22)

## Document Processing Workflow

The core functionality of IngestIO revolves around the document processing workflow:


Sources: [implementation.md396-446](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L396-L446) [implementation.md454-506](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L454-L506) [memory-bank/projectbrief.md34-39](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/projectbrief.md#L34-L39)

## Data Model

IngestIO uses a relational database with the following key entities:


Sources: [implementation.md154-262](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L154-L262) [memory-bank/projectbrief.md25-32](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/projectbrief.md#L25-L32)

## Application Structure

IngestIO follows a modular Next.js App Router structure:


Sources: [.cursor/rules/general.mdc32-52](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursor/rules/general.mdc#L32-L52) [memory-bank/techContext.md3-13](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/techContext.md#L3-L13)

## Server Actions Pattern

IngestIO uses Next.js server actions for all backend operations, providing a clean separation of concerns:

Category| Purpose| Key Files  
---|---|---  
Database Operations| CRUD operations for all entities| `actions/db/*.ts`  
AI Operations| AI model interactions| `actions/ai/extraction-actions.ts`, `actions/ai/schema.ts`  
Batch Operations| Processing multiple items| `actions/batch/batch-extraction-actions.ts`  
Payment Operations| Stripe integration| `actions/stripe/*.ts`  
  
Sources: [implementation.md326-540](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L326-L540) [memory-bank/systemPatterns.md6-11](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/systemPatterns.md#L6-L11)

## Authentication and User Management

IngestIO leverages Clerk for authentication, which integrates with Supabase through JWT tokens:


Sources: [implementation.md121-145](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L121-L145) [memory-bank/systemPatterns.md82-87](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/systemPatterns.md#L82-L87)

## Subscription and Rate Limiting

The application implements a tiered subscription model with different rate limits and quotas:

Tier| Features| Rate Limits| Page Quota  
---|---|---|---  
Starter| Basic extraction| Lower API rate limits| Limited pages/month  
Plus| Advanced extraction| Medium API rate limits| More pages/month  
Growth| Batch processing, priority| High API rate limits| Highest pages/month  
  
Rate limiting is implemented using Upstash Redis to track and enforce limits across requests.

Sources: [implementation.md328-336](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L328-L336) [memory-bank/systemPatterns.md13-33](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/systemPatterns.md#L13-L33)

## Analytics Implementation

The application uses PostHog for comprehensive analytics:


Sources: [components/utilities/posthog/posthog-provider.tsx1-61](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/posthog/posthog-provider.tsx#L1-L61) [components/utilities/posthog/posthog-user-identity.tsx1-32](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/posthog/posthog-user-identity.tsx#L1-L32)

## Summary

IngestIO is a sophisticated AI-powered document processing application built on modern web technologies. It provides users with powerful tools to extract, review, and utilize structured data from their documents. The application's modular architecture ensures scalability and maintainability, while its integration with external services provides robust functionality across authentication, storage, AI processing, payments, and analytics.

The system follows a clear separation of concerns, with well-defined layers for the user interface, server-side logic, and external integrations. This architectural approach, combined with Next.js App Router and Server Actions, creates a solid foundation for building and extending the application's capabilities.

Sources: [memory-bank/projectbrief.md2-13](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/projectbrief.md#L2-L13) [memory-bank/techContext.md51-70](https://github.com/moemoe9876/my-app/blob/b1f77c9f/memory-bank/techContext.md#L51-L70) [implementation.md16-35](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L16-L35)

### On this page

  * Overview
  * System Architecture
  * High-Level Architecture Diagram
  * Tech Stack
  * Document Processing Workflow
  * Data Model
  * Application Structure
  * Server Actions Pattern
  * Authentication and User Management
  * Subscription and Rate Limiting
  * Analytics Implementation
  * Summary




---

# Architecture

URL: https://deepwiki.com/moemoe9876/my-app/2-architecture


# Architecture

Relevant source files

The following files were used as context for generating this wiki page:

  * [.cursor/rules/backend.mdc](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursor/rules/backend.mdc)
  * [.cursor/rules/frontend.mdc](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursor/rules/frontend.mdc)
  * [.cursor/rules/storage.mdc](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursor/rules/storage.mdc)
  * [app/layout.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/layout.tsx)
  * [implementation.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md)
  * [package.json](https://github.com/moemoe9876/my-app/blob/b1f77c9f/package.json)
  * [pnpm-lock.yaml](https://github.com/moemoe9876/my-app/blob/b1f77c9f/pnpm-lock.yaml)



This document provides a comprehensive overview of the Ingestio.io system architecture, covering the major components, their interactions, and the codebase organization. It focuses on the technical architecture patterns, core service layers, and data flows that enable AI-powered document processing functionality.

For details on the document processing pipeline specifically, see [Document Processing](/moemoe9876/my-app/3-document-processing). For information about user management and authentication, see [User Management](/moemoe9876/my-app/4-user-management).

## High-Level Architecture

The Ingestio.io platform is built as a modern Next.js application with a layered architecture that integrates several external services.

### System Architecture Diagram


Sources: [implementation.md13-37](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L13-L37) [app/layout.tsx1-62](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/layout.tsx#L1-L62)

## Technology Stack

Ingestio.io is built with the following key technologies:

Layer| Technologies  
---|---  
Frontend| Next.js (App Router), Tailwind CSS, Shadcn UI, Framer Motion, React  
Backend| Next.js Server Actions, TypeScript  
Database| Supabase (PostgreSQL), Drizzle ORM  
Storage| Supabase Storage  
Authentication| Clerk  
AI| Google Vertex AI (via Vercel AI SDK)  
Payments| Stripe  
Analytics| PostHog  
Rate Limiting| Upstash Redis  
  
Sources: [package.json1-144](https://github.com/moemoe9876/my-app/blob/b1f77c9f/package.json#L1-L144) [implementation.md15-22](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L15-L22)

## Application Structure

The codebase follows a modern Next.js architecture with the App Router pattern, organized into several key directories:


Sources: [implementation.md41-53](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L41-L53) [.cursor/rules/frontend.mdc22-28](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursor/rules/frontend.mdc#L22-L28)

## Core Service Layers

### User Interface Layer

The UI layer is built with Next.js, following the Server/Client Component pattern:

  * **Server Components** : Handle data fetching and render initial HTML
  * **Client Components** : Manage interactive elements and user events
  * **Shared UI** : Common components from Shadcn UI and custom utilities



Key UI components include:

  * Dashboard interface - Shows document history and metrics
  * Upload interface - Handles document upload and validation
  * Review interface - Displays extracted data for verification
  * Settings interface - Manages user profile and subscription



Sources: [implementation.md383-407](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L383-L407) [.cursor/rules/frontend.mdc32-40](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursor/rules/frontend.mdc#L32-L40)

### Server Actions Layer

Server Actions are the core backend implementation pattern, following a strict organizational structure:

  * **Database Actions** (`actions/db/`): CRUD operations for database entities
  * **AI Actions** (`actions/ai/`): Document extraction and schema generation
  * **Storage Actions** : File upload, download, and management
  * **Batch Processing** : Handling multiple documents in sequence



Actions return standardized response objects with success status, messages, and data.

Sources: [implementation.md325-390](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L325-L390) [.cursor/rules/backend.mdc147-163](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursor/rules/backend.mdc#L147-L163)

### External Integration Layer

The application connects to several external services through specialized client libraries:


Sources: [package.json33-111](https://github.com/moemoe9876/my-app/blob/b1f77c9f/package.json#L33-L111) [implementation.md57-70](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L57-L70)

## Document Processing Flow

The primary functionality of Ingestio.io is document processing and data extraction. Below is the flow of a document through the system:


Sources: [implementation.md327-359](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L327-L359) [implementation.md391-505](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L391-L505)

## Authentication and User Management

Authentication is handled through Clerk, with custom integration to Supabase:


Sources: [implementation.md120-151](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L120-L151) [app/layout.tsx8-62](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/layout.tsx#L8-L62)

## Subscription and Rate Limiting System

The application implements a tiered subscription model using Stripe and rate limiting with Upstash Redis:


Sources: [implementation.md327-336](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L327-L336) [implementation.md107-113](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L107-L113)

## Database Schema

The database schema is defined using Drizzle ORM and includes the following main tables:

Table| Purpose| Primary Relationships  
---|---|---  
`users`| Core user information from Clerk| Referenced by all user-specific tables  
`profiles`| User profile with subscription tier| Foreign key to `users` table  
`user_usage`| Tracks document processing usage/limits| Foreign key to `profiles` table  
`documents`| Stores metadata about uploaded documents| Belongs to a user  
`extraction_jobs`| Tracks AI extraction process| Related to documents and batches  
`extraction_batches`| Groups of documents for batch processing| Contains multiple extraction jobs  
`extracted_data`| Structured data extracted from documents| Related to extraction jobs  
`exports`| Export records for document data| Contains arrays of document IDs  
  
The database implements Row Level Security (RLS) to ensure users can only access their own data.

Sources: [implementation.md152-273](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L152-L273)

## AI Extraction System

The AI extraction system uses Google Vertex AI (Gemini models) to extract structured data from documents:


Sources: [implementation.md447-506](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L447-L506)

## Key Architectural Patterns

### Server Components and Actions

The application leverages Next.js Server Components and Server Actions for a hybrid rendering approach:

  * **Server Components** : Data fetching and initial rendering
  * **Server Actions** : Secure, server-side data mutations
  * **Client Components** : Interactive UI elements with client-side state



This pattern separates data fetching from UI interactivity, improving performance and security.

Sources: [.cursor/rules/frontend.mdc33-140](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursor/rules/frontend.mdc#L33-L140)

### Database Access Pattern

The application uses Drizzle ORM for type-safe database access:

  * **Schema Definitions** : Type-safe schema in `db/schema/` directory
  * **Actions** : Server actions that encapsulate database operations
  * **Row Level Security** : Enforced at the database level through Supabase policies



All database operations follow a standard CRUD pattern with consistent error handling.

Sources: [.cursor/rules/backend.mdc18-146](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursor/rules/backend.mdc#L18-L146)

### File Storage Pattern

Document storage follows a consistent pattern:

  * **Bucket Organization** : Separate buckets for documents and exports
  * **Path Structure** : `{userId}/{purpose}/{filename}`
  * **Access Control** : Row Level Security policies ensure users can only access their own files
  * **Validation** : File size and type validation occur before upload



Sources: [.cursor/rules/storage.mdc12-127](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursor/rules/storage.mdc#L12-L127)

## Deployment Architecture

Ingestio.io is deployed on Vercel, with database and storage on Supabase, and additional services distributed across specialized providers:

Component| Hosting Provider  
---|---  
Next.js Application| Vercel  
Database & Storage| Supabase  
Authentication| Clerk  
AI Processing| Google Cloud (Vertex AI)  
Payments| Stripe  
Analytics| PostHog  
Rate Limiting| Upstash Redis  
  
Sources: [implementation.md22-24](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L22-L24)

### On this page

  * Architecture
  * High-Level Architecture
  * System Architecture Diagram
  * Technology Stack
  * Application Structure
  * Core Service Layers
  * User Interface Layer
  * Server Actions Layer
  * External Integration Layer
  * Document Processing Flow
  * Authentication and User Management
  * Subscription and Rate Limiting System
  * Database Schema
  * AI Extraction System
  * Key Architectural Patterns
  * Server Components and Actions
  * Database Access Pattern
  * File Storage Pattern
  * Deployment Architecture




---

# Data Flow

URL: https://deepwiki.com/moemoe9876/my-app/2.1-data-flow


# Data Flow

Relevant source files

The following files were used as context for generating this wiki page:

  * [.cursorignore](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursorignore)
  * [MANUAL-INSTRUCTIONS-FOR-E2E-TESTING.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/MANUAL-INSTRUCTIONS-FOR-E2E-TESTING.md)
  * [__tests__/document-actions.test.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/document-actions.test.ts)
  * [actions/ai/extraction-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts)
  * [actions/batch/batch-extraction-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/batch/batch-extraction-actions.ts)
  * [actions/db/documents.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts)
  * [actions/db/user-usage-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts)
  * [actions/stripe/sync-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/sync-actions.ts)
  * [lib/ai/vertex-client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts)
  * [vitest.config.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/vitest.config.ts)



This document outlines how data flows through the IngestIO application, from initial document upload to extraction and review. It details the primary data paths, processing stages, and interactions between system components that enable the application's core document processing functionality.

For information about the overall system architecture, see [Architecture](/moemoe9876/my-app/2-architecture), and for database schema details, see [Database Schema](/moemoe9876/my-app/2.2-database-schema).

## Overall Data Flow

The IngestIO application follows a multi-stage pipeline for document processing:


Sources:

  * [actions/db/documents.ts20-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L20-L143)
  * [actions/ai/extraction-actions.ts208-586](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L586)
  * [actions/db/user-usage-actions.ts237-271](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L237-L271)



## Document Upload Flow

The document upload process begins when a user uploads a file through the user interface and ends with the file being stored and ready for AI extraction.


The document upload action has several critical checks and stages:

  1. **Authentication** : Verifies the user is logged in
  2. **Rate Limiting** : Prevents abuse by limiting request frequency based on subscription tier
  3. **Quota Check** : Ensures user has not exceeded their page processing limit
  4. **Storage** : Uploads file to Supabase storage with a user-specific path
  5. **Database Insertion** : Creates a record of the document with metadata
  6. **Usage Tracking** : Updates the user's processed page count
  7. **Analytics** : Records the upload event for monitoring



Sources:

  * [actions/db/documents.ts20-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L20-L143)
  * [actions/db/user-usage-actions.ts276-342](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L276-L342)



## AI Extraction Flow

After a document is uploaded, the AI extraction process extracts structured data from the document.


Key aspects of the extraction process:

  1. **Job Creation** : An extraction job is created and tracked in the database
  2. **Document Retrieval** : The document is fetched from storage
  3. **AI Processing** : Google Vertex AI processes the document with Gemini models
  4. **Fallback Mechanisms** : If structured extraction fails, text extraction is attempted
  5. **Result Storage** : Extracted data is saved to the database
  6. **Telemetry** : PostHog tracks the AI model's performance and outcomes
  7. **State Updates** : Document status is updated to reflect the extraction outcome



Sources:

  * [actions/ai/extraction-actions.ts208-586](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L586)
  * [lib/ai/vertex-client.ts102-161](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts#L102-L161)



## Document Review and Update Flow

After extraction, users can review and modify the extracted data through the application interface.


The review flow enables:

  1. **Document Verification** : Users can verify the extracted data against the original
  2. **Data Correction** : Any AI extraction errors can be manually corrected
  3. **Data Confirmation** : Users confirm the final data is accurate
  4. **Secure Access** : Signed URLs provide temporary access to stored documents
  5. **Ownership Verification** : All operations verify the user owns the document



Sources:

  * [actions/db/documents.ts239-344](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L239-L344)
  * [actions/db/documents.ts350-427](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L350-L427)



## User Usage and Quota Management

A key aspect of data flow is tracking and enforcing user quotas based on subscription tier.


The quota management system:

  1. **Tracks Usage** : Records pages processed per billing period
  2. **Enforces Limits** : Prevents exceeding subscription-tier quotas
  3. **Resets Usage** : Creates new usage records for new billing periods
  4. **Tier-Based Limits** : Adjusts quotas based on user's subscription tier
  5. **Precondition Check** : Validates quota before resource-intensive operations



Sources:

  * [actions/db/user-usage-actions.ts276-342](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L276-L342)
  * [actions/db/user-usage-actions.ts237-271](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L237-L271)
  * [actions/ai/extraction-actions.ts130-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L130-L201)



## Batch Processing Flow

For higher-tier subscriptions, IngestIO supports batch document processing:


Batch processing introduces additional constraints:

  1. **Batch Size Limits** : Maximum documents per batch varies by subscription tier
  2. **Total Quota Check** : Ensures user has enough quota for the entire batch
  3. **Parallelism Control** : Manages concurrent processing based on tier
  4. **Progress Tracking** : Allows monitoring of batch job progress



Sources:

  * [actions/batch/batch-extraction-actions.ts19-112](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/batch/batch-extraction-actions.ts#L19-L112)
  * [actions/ai/extraction-actions.ts130-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L130-L201)



## Database Update Flow

This diagram shows how data flows through the database tables during the document processing lifecycle:


Data flow between database entities:

  1. **User → Documents** : Users upload documents, creating document records
  2. **Documents → Extraction Jobs** : Documents trigger extraction jobs
  3. **Extraction Jobs → Extracted Data** : Successful jobs produce extracted data
  4. **User → User Usage** : User activities consume quota tracked in user_usage



Each entity contains status fields that track progress through the pipeline, enabling robust state management and recovery from failures.

Sources:

  * [actions/db/documents.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts)
  * [actions/ai/extraction-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts)
  * [actions/db/user-usage-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts)



## Error Handling and Retry Mechanisms

The IngestIO system implements comprehensive error handling at key points in the data flow:

Stage| Error Type| Handling Mechanism  
---|---|---  
Document Upload| Storage Error| Error response with specific message, analytics tracking  
Document Upload| Rate Limit| Error response with specific message, retry-after header  
Document Upload| Quota Exceeded| Error response with remaining quota information  
AI Extraction| API Error| Error response, job status update, fallback to text extraction  
AI Extraction| Permission Error| Detailed error with service account guidance  
AI Extraction| Structured Output Error| Fallback to text extraction and JSON parsing  
Document Review| Access Denied| Ownership verification before all operations  
Batch Processing| Size Limit| Validation before processing with tier-specific limits  
  
The system prioritizes data integrity by:

  1. **Transaction Boundaries** : Critical operations use database transactions
  2. **Idempotent Operations** : Actions can be safely retried
  3. **State Tracking** : Document status field tracks processing state
  4. **Graceful Degradation** : Structured extraction falls back to text extraction
  5. **Clear Error Messages** : User-friendly messages for common errors



Sources:

  * [actions/db/documents.ts134-142](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L134-L142)
  * [actions/ai/extraction-actions.ts414-470](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L414-L470)
  * [actions/ai/extraction-actions.ts538-567](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L538-L567)



## Subscription Data Flow

Subscription data influences the document processing pipeline through rate limits and quotas:


Subscription data flows:

  1. **Source of Truth** : Redis KV store is the primary source for subscription data
  2. **Fallback Chain** : System checks Redis first, then falls back to database
  3. **Sync Mechanisms** : Data is synced after checkout and via webhooks
  4. **Consumption Path** : All document processing checks subscription tier first
  5. **Tier Validation** : Invalid tiers default to "starter" for safety



Sources:

  * [actions/stripe/sync-actions.ts46-146](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/sync-actions.ts#L46-L146)
  * [actions/ai/extraction-actions.ts130-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L130-L201)



## Conclusion

The IngestIO application implements a robust data flow from document upload through AI processing to user review. Key aspects include:

  1. **Multi-stage Pipeline** : Clear separation between upload, processing, extraction, and review
  2. **Quota and Rate Management** : Sophisticated control based on subscription tiers
  3. **Error Handling** : Graceful degradation and fallback mechanisms at all stages
  4. **State Tracking** : Document status tracking throughout the pipeline
  5. **Security** : User ownership verification for all operations



This architecture enables scalable document processing with appropriate controls while maintaining a responsive user experience.

### On this page

  * Data Flow
  * Overall Data Flow
  * Document Upload Flow
  * AI Extraction Flow
  * Document Review and Update Flow
  * User Usage and Quota Management
  * Batch Processing Flow
  * Database Update Flow
  * Error Handling and Retry Mechanisms
  * Subscription Data Flow
  * Conclusion




---

# Database Schema

URL: https://deepwiki.com/moemoe9876/my-app/2.2-database-schema


# Database Schema

Relevant source files

The following files were used as context for generating this wiki page:

  * [__tests__/profile-actions.test.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts)
  * [actions/db/profiles-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts)
  * [actions/db/users-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts)
  * [app/api/webhooks/clerk/clerk-client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/clerk-client.ts)
  * [db/migrations/0000_nostalgic_mauler.sql](https://github.com/moemoe9876/my-app/blob/b1f77c9f/db/migrations/0000_nostalgic_mauler.sql)
  * [implementation.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md)
  * [lib/supabase/middleware.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/supabase/middleware.ts)
  * [package.json](https://github.com/moemoe9876/my-app/blob/b1f77c9f/package.json)
  * [pnpm-lock.yaml](https://github.com/moemoe9876/my-app/blob/b1f77c9f/pnpm-lock.yaml)
  * [types/supabase-types.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts)



This document provides a comprehensive overview of the IngestIO database schema, including tables, relationships, and data structures. It details how user data, documents, extraction results, and subscription information are stored and related to each other within the application's Supabase PostgreSQL database.

For information about data flow through the system, see [Data Flow](/moemoe9876/my-app/2.1-data-flow).

## Overview

IngestIO uses a PostgreSQL database (hosted on Supabase) to store all persistent application data. The schema is organized around several core entities:

  1. **User data** \- Authentication profiles and subscription information
  2. **Documents** \- Uploaded document metadata and storage references
  3. **Extraction data** \- AI-extracted document information and processing jobs
  4. **Usage tracking** \- Consumption metrics against subscription quotas



### Entity Relationship Overview

The diagram below shows the main tables and their relationships:


Sources: [types/supabase-types.ts9-407](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L9-L407) [db/migrations/0000_nostalgic_mauler.sql7-14](https://github.com/moemoe9876/my-app/blob/b1f77c9f/db/migrations/0000_nostalgic_mauler.sql#L7-L14)

## User and Authentication Model

The application uses Clerk for authentication and user management. User identity data is synchronized to Supabase through webhooks, creating records in both the `users` and `profiles` tables.

### Users Table

The `users` table stores basic user information synchronized from Clerk:

Column| Type| Description  
---|---|---  
`user_id`| TEXT| Primary key, matches Clerk user ID  
`email`| TEXT| User's email address  
`full_name`| TEXT| User's full name  
`avatar_url`| TEXT| URL to user's profile image  
`metadata`| JSON| Additional user metadata  
`created_at`| TIMESTAMP| Record creation timestamp  
`updated_at`| TIMESTAMP| Record update timestamp  
  
Sources: [types/supabase-types.ts343-372](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L343-L372) [actions/db/users-actions.ts1-205](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L1-L205)

### Profiles Table

The `profiles` table extends user information with subscription-related data:

Column| Type| Description  
---|---|---  
`user_id`| TEXT| Primary key, references users.user_id  
`membership`| ENUM| Subscription tier (starter, plus, growth)  
`stripe_customer_id`| TEXT| Stripe customer identifier  
`stripe_subscription_id`| TEXT| Stripe subscription identifier  
`created_at`| TIMESTAMP| Record creation timestamp  
`updated_at`| TIMESTAMP| Record update timestamp  
  
Sources: [types/supabase-types.ts260-301](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L260-L301) [actions/db/profiles-actions.ts1-231](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L1-L231) [db/migrations/0000_nostalgic_mauler.sql7-14](https://github.com/moemoe9876/my-app/blob/b1f77c9f/db/migrations/0000_nostalgic_mauler.sql#L7-L14)

### Authentication Flow


Sources: [app/api/webhooks/clerk/clerk-client.ts1-37](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/clerk-client.ts#L1-L37) [lib/supabase/middleware.ts1-53](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/supabase/middleware.ts#L1-L53)

## Document and Storage Model

Documents in IngestIO are stored in Supabase Storage, with metadata tracked in the database.

### Documents Table

The `documents` table stores metadata about uploaded files:

Column| Type| Description  
---|---|---  
`id`| UUID| Primary key  
`user_id`| TEXT| References profiles.user_id  
`original_filename`| TEXT| Original uploaded filename  
`storage_path`| TEXT| Path in Supabase Storage  
`mime_type`| TEXT| File MIME type  
`file_size`| INTEGER| File size in bytes  
`page_count`| INTEGER| Number of pages in document  
`status`| ENUM| Document status (uploaded, processing, completed, failed)  
`created_at`| TIMESTAMP| Record creation timestamp  
`updated_at`| TIMESTAMP| Record update timestamp  
  
Sources: [types/supabase-types.ts12-58](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L12-L58)

### Document Status Workflow


Sources: [types/supabase-types.ts392-401](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L392-L401)

## Extraction and AI Processing Model

The extraction process involves multiple tables to track jobs, results, and batch operations.

### Extraction Jobs Table

The `extraction_jobs` table manages AI extraction tasks:

Column| Type| Description  
---|---|---  
`id`| UUID| Primary key  
`user_id`| TEXT| References profiles.user_id  
`document_id`| UUID| References documents.id  
`batch_id`| UUID| Optional reference to batch (if part of batch process)  
`status`| ENUM| Job status (queued, processing, completed, failed)  
`extraction_prompt`| TEXT| Custom extraction prompt (if provided)  
`extraction_options`| JSON| Options for the extraction (confidence settings, etc.)  
`error_message`| TEXT| Error message if job failed  
`created_at`| TIMESTAMP| Record creation timestamp  
`updated_at`| TIMESTAMP| Record update timestamp  
  
Sources: [types/supabase-types.ts199-258](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L199-L258)

### Extracted Data Table

The `extracted_data` table stores results from successful extractions:

Column| Type| Description  
---|---|---  
`id`| UUID| Primary key  
`extraction_job_id`| UUID| References extraction_jobs.id  
`document_id`| UUID| References documents.id  
`user_id`| TEXT| References profiles.user_id  
`data`| JSON| The extracted structured data  
`document_type`| TEXT| Type of document detected/processed  
`created_at`| TIMESTAMP| Record creation timestamp  
`updated_at`| TIMESTAMP| Record update timestamp  
  
Sources: [types/supabase-types.ts100-153](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L100-L153)

### Extraction Batches Table

The `extraction_batches` table manages groups of extraction jobs:

Column| Type| Description  
---|---|---  
`id`| UUID| Primary key  
`user_id`| TEXT| References profiles.user_id  
`name`| TEXT| Optional batch name  
`status`| TEXT| Batch status (created, processing, completed, failed, partially_completed)  
`document_count`| INTEGER| Total documents in batch  
`completed_count`| INTEGER| Successfully completed extractions  
`failed_count`| INTEGER| Failed extractions  
`created_at`| TIMESTAMP| Record creation timestamp  
`updated_at`| TIMESTAMP| Record update timestamp  
  
Sources: [types/supabase-types.ts155-198](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L155-L198)

### Extraction Workflow


Sources: [types/supabase-types.ts392-402](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L392-L402)

## Exports and Data Output

IngestIO allows users to export extracted data in various formats.

### Exports Table

The `exports` table tracks export operations:

Column| Type| Description  
---|---|---  
`id`| UUID| Primary key  
`user_id`| TEXT| References profiles.user_id  
`format`| ENUM| Export format (json, csv, excel)  
`status`| TEXT| Export status (processing, completed, failed)  
`file_path`| TEXT| Path to exported file in storage  
`document_ids`| UUID[]| Array of document IDs included in export  
`created_at`| TIMESTAMP| Record creation timestamp  
`updated_at`| TIMESTAMP| Record update timestamp  
  
Sources: [types/supabase-types.ts59-98](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L59-L98)

## Usage and Subscription Model

IngestIO tracks user consumption against subscription-based limits.

### User Usage Table

The `user_usage` table records page processing against billing periods:

Column| Type| Description  
---|---|---  
`id`| UUID| Primary key  
`user_id`| TEXT| References profiles.user_id  
`billing_period_start`| TIMESTAMP| Start of billing period  
`billing_period_end`| TIMESTAMP| End of billing period  
`pages_processed`| INTEGER| Count of pages processed  
`pages_limit`| INTEGER| Maximum pages allowed for tier  
`created_at`| TIMESTAMP| Record creation timestamp  
`updated_at`| TIMESTAMP| Record update timestamp  
  
Sources: [types/supabase-types.ts302-342](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L302-L342)

### Subscription Tier Model


Sources: [types/supabase-types.ts402](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L402-L402) [actions/db/profiles-actions.ts142-203](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L142-L203)

## Key Database Relationships

The database schema is designed to maintain data integrity through foreign key relationships and enable efficient queries for common application flows.

### Table References Flow


Sources: [types/supabase-types.ts49-57](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L49-L57) [types/supabase-types.ts90-97](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L90-L97) [types/supabase-types.ts131-152](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L131-L152) [types/supabase-types.ts189-197](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L189-L197) [types/supabase-types.ts236-257](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L236-L257) [types/supabase-types.ts285-300](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L285-L300) [types/supabase-types.ts333-341](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L333-L341)

## Row-Level Security Policies

Supabase uses Row-Level Security (RLS) policies to restrict data access based on the authenticated user. Every table includes RLS policies that ensure users can only access their own data.

The system uses Clerk JWT tokens containing the user's ID to authenticate with Supabase. Server-side code can use admin credentials to bypass RLS when necessary (e.g., in webhooks).


Sources: [app/api/webhooks/clerk/clerk-client.ts26-37](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/clerk-client.ts#L26-L37) [lib/supabase/middleware.ts1-53](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/supabase/middleware.ts#L1-L53)

## Database Design Considerations

### One-to-One vs One-to-Many Relationships

  * **One-to-One** : Users to Profiles (1:1, enforced by primary key)
  * **One-to-Many** : Profiles to Documents, Profiles to Usage records, Batches to Jobs



### Enumerated Types

The database uses PostgreSQL enums for constrained values:

Enum| Values  
---|---  
`membership`| starter, plus, growth  
`document_status`| uploaded, processing, completed, failed  
`extraction_status`| queued, processing, completed, failed  
`export_format`| json, csv, excel  
  
Sources: [types/supabase-types.ts392-402](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L392-L402) [db/migrations/0000_nostalgic_mauler.sql2-5](https://github.com/moemoe9876/my-app/blob/b1f77c9f/db/migrations/0000_nostalgic_mauler.sql#L2-L5)

### JSON Storage

The schema uses PostgreSQL's JSONB type to store:

  * Extracted document data (`extracted_data.data`)
  * Extraction options (`extraction_jobs.extraction_options`)
  * User metadata (`users.metadata`)



This provides flexibility for storing complex, nested data while maintaining query capabilities.

Sources: [types/supabase-types.ts102-109](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L102-L109) [types/supabase-types.ts205-206](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L205-L206) [types/supabase-types.ts349-350](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L349-L350)

### Timestamps and Updates

All tables include `created_at` and `updated_at` timestamps. The database uses PostgreSQL triggers to automatically update the `updated_at` field when records are modified.

Sources: [types/supabase-types.ts14-15](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L14-L15) [types/supabase-types.ts22-23](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L22-L23) [types/supabase-types.ts61-62](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L61-L62)

### On this page

  * Database Schema
  * Overview
  * Entity Relationship Overview
  * User and Authentication Model
  * Users Table
  * Profiles Table
  * Authentication Flow
  * Document and Storage Model
  * Documents Table
  * Document Status Workflow
  * Extraction and AI Processing Model
  * Extraction Jobs Table
  * Extracted Data Table
  * Extraction Batches Table
  * Extraction Workflow
  * Exports and Data Output
  * Exports Table
  * Usage and Subscription Model
  * User Usage Table
  * Subscription Tier Model
  * Key Database Relationships
  * Table References Flow
  * Row-Level Security Policies
  * Database Design Considerations
  * One-to-One vs One-to-Many Relationships
  * Enumerated Types
  * JSON Storage
  * Timestamps and Updates




---

# Document Processing

URL: https://deepwiki.com/moemoe9876/my-app/3-document-processing


# Document Processing

Relevant source files

The following files were used as context for generating this wiki page:

  * [__tests__/document-actions.test.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/document-actions.test.ts)
  * [actions/ai/extraction-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts)
  * [actions/db/documents.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts)
  * [actions/db/user-usage-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts)
  * [app/(dashboard)/dashboard/review/[id]/page.tsx](app/\(dashboard\)/dashboard/review/%5Bid%5D/page.tsx)
  * [components/utilities/DataVisualizer.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/DataVisualizer.tsx)
  * [components/utilities/InteractiveDataField.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/InteractiveDataField.tsx)
  * [lib/ai/vertex-client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts)



This document provides a technical overview of the document processing pipeline in our application. It covers the entire workflow from document upload through AI extraction to user review. For information about how users interact with documents, see [User Interface](/moemoe9876/my-app/7-user-interface), and for details on AI extraction techniques, see [AI Extraction](/moemoe9876/my-app/3.2-ai-extraction).

## Overview of Document Processing

The document processing system enables users to upload files, extract structured data using AI, and review/edit the results. It forms the core functionality of the application and integrates with user management, subscription systems, and analytics tracking.


Sources: [actions/db/documents.ts1-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L1-L143) [actions/ai/extraction-actions.ts208-586](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L586) [app/(dashboard)/dashboard/review/[id]/page.tsx:97-227]()

## Document Upload Process

The upload process handles file validation, storage, and record creation. It includes several security checks and rate limiting based on user subscription tier.

Document upload workflow:


Key steps in the upload process:

  1. Authentication - Verify the user's identity
  2. Rate limiting - Check if user has hit rate limits for their subscription tier
  3. Quota verification - Ensure user has sufficient page quota remaining
  4. File storage - Upload file to Supabase storage with user-specific path
  5. Database record - Create document record with metadata
  6. Usage tracking - Update user's page consumption



### Upload Function Implementation

The main upload function signature shows required parameters and return type:


The function handles file upload, storage, and creates a document record in the database.

### Document Database Schema

Documents are stored in the `documentsTable` with the following key fields:

Field| Description  
---|---  
id| Unique document identifier  
userId| ID of document owner  
originalFilename| Original file name  
storagePath| Path in Supabase storage  
mimeType| File MIME type  
fileSize| Size in bytes  
pageCount| Number of pages in document  
status| Document status (uploaded, processing, completed, failed)  
createdAt| Upload timestamp  
updatedAt| Last update timestamp  
  
Sources: [actions/db/documents.ts16-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L16-L143) [actions/db/user-usage-actions.ts237-271](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L237-L271)

## AI Data Extraction

After document upload, the system extracts structured data using Google Vertex AI's Gemini models. The extraction process handles various document types and provides both generic and specialized extraction capabilities.


### Extraction Process Details

  1. **Authentication and Validation**

     * Verify user identity via `getCurrentUser()`
     * Validate input parameters
     * Check rate limits and quota
  2. **Document Retrieval**

     * Fetch document from database
     * Download file from storage
     * Create extraction job record
  3. **AI Processing**

     * Prepare enhanced prompt using `enhancePrompt()`
     * Get Vertex AI model client with `getVertexStructuredModel()`
     * Process document with AI model using `generateObject()`
     * Parse and validate results
  4. **Result Storage**

     * Save extracted data to database
     * Update extraction job status
     * Update document status
     * Track usage metrics



### Specialized Extraction Functions

The system provides specialized extraction functions for common document types:

Function| Document Type| Description  
---|---|---  
`extractInvoiceDataAction`| Invoices| Extracts invoice data with specialized schema  
`extractResumeDataAction`| Resumes| Extracts resume data and work experience  
`extractReceiptDataAction`| Receipts| Extracts receipt details and line items  
`extractFormDataAction`| Forms| Extracts form fields with position data  
`extractTextAction`| Any| Generic text extraction from document  
  
### Extraction Options

The extraction process supports various options to customize the output:

Option| Description| Default  
---|---|---  
`includeConfidence`| Include confidence scores with extracted fields| `true`  
`includePositions`| Include position/bounding box data| `true`  
`extractionPrompt`| Custom prompt to guide extraction| Document-type specific  
`batchSize`| Number of documents to process at once| `1`  
  
Sources: [actions/ai/extraction-actions.ts126-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L126-L201) [actions/ai/extraction-actions.ts208-586](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L586) [lib/ai/vertex-client.ts130-161](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts#L130-L161)

## Document Review Workflow

After extraction, users can review, edit, and confirm the extracted data through a dedicated review interface. This interface combines document viewing with data visualization and editing capabilities.


### Review Components

  1. **Data Visualizer**

     * Displays extracted data in tree or JSON format
     * Supports searching and filtering by confidence
     * Highlights fields on document hover
     * Enables field editing in edit mode
  2. **Document Viewer**

     * Displays the original document
     * Highlights selected fields with bounding boxes
     * Supports clicking on document to find corresponding field
     * Maintains synchronization with the data view
  3. **Interactive Field Editing**

     * Allows users to edit extracted values
     * Preserves confidence scores and positions
     * Provides visual feedback for edited fields



### Review Data Flow

  1. User accesses review page with document ID
  2. `fetchDocumentForReviewAction` retrieves document data, signed URL, and extracted data
  3. Review UI renders with split panel view
  4. User can view, search, filter, and edit data
  5. User confirms data via `updateExtractedDataAction`
  6. User can export data in JSON or CSV format



### Data Export Options

Format| Description  
---|---  
JSON| Complete structured data with metadata  
CSV| Tabular format suitable for spreadsheets  
  
Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:97-268](), [actions/db/documents.ts239-344](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L239-L344) [components/utilities/DataVisualizer.tsx169-762](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/DataVisualizer.tsx#L169-L762)

## Usage Tracking and Limits

The document processing system includes comprehensive usage tracking and enforcement of subscription-based limits.

### Page Quota Management


### Usage Tracking Components

  1. **User Usage Table**

     * Tracks pages processed per billing period
     * Stores page limits based on subscription tier
     * Provides remaining quota information
  2. **Usage Functions**

     * `checkUserQuotaAction` \- Verifies sufficient quota before processing
     * `incrementPagesProcessedAction` \- Updates usage after processing
     * `getCurrentUserUsageAction` \- Retrieves current usage statistics



### Subscription Tier Limits

Document processing limits vary by subscription tier:

Tier| Pages Per Month| Batch Size Limit| Rate Limit  
---|---|---|---  
starter| 25| 1| 10/minute  
pro| 100| 5| 30/minute  
business| 500| 20| 60/minute  
enterprise| Custom| Custom| Custom  
  
Sources: [actions/db/user-usage-actions.ts237-341](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L237-L341) [actions/ai/extraction-actions.ts130-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L130-L201)

## Testing and Error Handling

The document processing system includes comprehensive error handling and testing to ensure reliability.

### Error Handling Strategy

All document processing functions follow a consistent error handling approach:

  1. Use try/catch blocks around all critical operations
  2. Return standardized ActionState objects with error details
  3. Log errors to console for debugging
  4. Update document/job status on failure
  5. Track errors with analytics



### Test Coverage

Tests validate core document processing functionality:

Test Category| Description  
---|---  
Document Upload| Validates upload, rate limiting, and quota checks  
Document Deletion| Tests file and database record deletion  
Document Retrieval| Tests secure fetching with ownership verification  
Extraction Errors| Validates error handling for AI processing  
  
Sources: [__tests__/document-actions.test.ts71-207](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/document-actions.test.ts#L71-L207) [actions/db/documents.ts134-142](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L134-L142) [actions/ai/extraction-actions.ts568-585](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L568-L585)

## Integration Points

The document processing system integrates with several other components:

  1. **User Management** \- For authentication and ownership verification
  2. **Subscription System** \- For tier-based rate limiting and quotas
  3. **Storage** \- For document file storage and retrieval
  4. **AI Services** \- For document data extraction (Vertex AI)
  5. **Analytics** \- For tracking processing events and errors



Key integration functions:

Function| System| Purpose  
---|---|---  
`getCurrentUser`| User Management| Get authenticated user ID  
`checkRateLimit`| Subscription| Apply tier-based rate limits  
`trackServerEvent`| Analytics| Record processing events  
`uploadToStorage`| Storage| Save document files  
`getVertexStructuredModel`| AI Services| Get AI model client  
  
Sources: [actions/db/documents.ts8-10](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L8-L10) [actions/ai/extraction-actions.ts4-9](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L4-L9) [lib/ai/vertex-client.ts102-161](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts#L102-L161)

### On this page

  * Document Processing
  * Overview of Document Processing
  * Document Upload Process
  * Upload Function Implementation
  * Document Database Schema
  * AI Data Extraction
  * Extraction Process Details
  * Specialized Extraction Functions
  * Extraction Options
  * Document Review Workflow
  * Review Components
  * Review Data Flow
  * Data Export Options
  * Usage Tracking and Limits
  * Page Quota Management
  * Usage Tracking Components
  * Subscription Tier Limits
  * Testing and Error Handling
  * Error Handling Strategy
  * Test Coverage
  * Integration Points




---

# Document Upload

URL: https://deepwiki.com/moemoe9876/my-app/3.1-document-upload


# Document Upload

Relevant source files

The following files were used as context for generating this wiki page:

  * [__tests__/document-actions.test.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/document-actions.test.ts)
  * [actions/db/documents.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts)
  * [actions/db/user-usage-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts)
  * [app/(dashboard)/dashboard/upload/page.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/upload/page.tsx)/dashboard/upload/page.tsx)
  * [components/utilities/FileUpload.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/FileUpload.tsx)
  * [components/utilities/PdfViewer.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/PdfViewer.tsx)
  * [components/utilities/site-header.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/site-header.tsx)
  * [prompts/extraction.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/prompts/extraction.ts)



## Overview

The Document Upload system enables users to upload documents for automated data extraction. This page details the upload process, including file handling, validation, and storage. For information about AI extraction after upload, see [AI Extraction](/moemoe9876/my-app/3.2-ai-extraction). For details on reviewing extracted data, see [Document Review](/moemoe9876/my-app/3.3-document-review).

The Document Upload system is responsible for:

  * File selection and upload
  * Document validation and type detection
  * Rate limiting and quota enforcement
  * File storage in Supabase
  * Metadata creation in the database
  * Preparing documents for AI extraction




Sources:

  * [actions/db/documents.ts20-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L20-L143)
  * [app/(dashboard)/dashboard/upload/page.tsx34-172](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/upload/page.tsx#L34-L172)
  * [components/utilities/FileUpload.tsx28-212](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/FileUpload.tsx#L28-L212)



## Upload Process

The document upload process follows a structured workflow with multiple validation steps before storing a document.


Sources:

  * [actions/db/documents.ts20-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L20-L143)
  * [app/(dashboard)/dashboard/upload/page.tsx87-172](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/upload/page.tsx#L87-L172)
  * [actions/db/user-usage-actions.ts276-342](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L276-L342)



### Rate Limiting and Quota Management

The system enforces two types of usage constraints:

  1. **Rate limits** : Controls how frequently a user can upload documents
  2. **Quota limits** : Restricts the total number of pages a user can process per billing period



Rate limits and quotas vary by subscription tier as shown in the table below:

Tier| Upload Rate Limit| Pages Per Month  
---|---|---  
Starter| 15 per hour| 25  
Pro| 60 per hour| 200  
Business| 200 per hour| 1000  
Enterprise| 500 per hour| Unlimited  
  
Before processing an upload, the system:

  1. Authenticates the user
  2. Retrieves the user's subscription tier
  3. Checks if they're within rate limits
  4. Verifies they have remaining quota



If any check fails, the upload is rejected with an appropriate error message.

Sources:

  * [actions/db/documents.ts30-68](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L30-L68)
  * [actions/db/user-usage-actions.ts276-342](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L276-L342)



### File Storage

Uploaded documents are stored in Supabase storage using a structured naming convention:
    
    
    documents/{userId}/{timestamp}_{sanitizedFileName}
    

The file storage process:

  1. Sanitizes the filename to remove invalid characters
  2. Prepends a timestamp to ensure uniqueness
  3. Creates a user-specific folder structure
  4. Converts the base64-encoded file to a buffer
  5. Uploads to Supabase with appropriate content type



The storage path is then saved in the document record to maintain the link between the database entry and the stored file.

Sources:

  * [actions/db/documents.ts70-93](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L70-L93)



### Document Record Creation

After successful file upload, the system creates a document record in the database with the following information:

Field| Description  
---|---  
userId| Owner of the document  
originalFilename| Original name of the uploaded file  
storagePath| Path in Supabase storage  
mimeType| MIME type (e.g., application/pdf)  
fileSize| Size in bytes  
pageCount| Number of pages (estimated)  
status| Initial status ("uploaded")  
  
The document record serves as the central reference point for subsequent processing steps and document management.

Sources:

  * [actions/db/documents.ts96-109](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L96-L109)



## User Interface Components

The upload interface provides an intuitive workflow for document upload and extraction.


Sources:

  * [app/(dashboard)/dashboard/upload/page.tsx34-417](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/upload/page.tsx#L34-L417)
  * [components/utilities/FileUpload.tsx28-212](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/FileUpload.tsx#L28-L212)



### File Selection and Validation

The FileUpload component provides a drag-and-drop interface with the following features:

  1. **Supported file types** : PDF, PNG, JPEG
  2. **Maximum file size** : 100MB
  3. **File type detection** : Automatically identifies document types based on filename
  4. **Prompt suggestions** : Suggests extraction prompts based on detected document type



Once a file is selected, the component displays:

  * Filename and size
  * File type preview
  * For PDFs: embedded PDF viewer
  * For images: thumbnail preview



Sources:

  * [components/utilities/FileUpload.tsx92-101](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/FileUpload.tsx#L92-L101)
  * [components/utilities/FileUpload.tsx106-191](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/FileUpload.tsx#L106-L191)



### Extraction Instructions

Users can provide custom instructions to guide the AI extraction process. The interface:

  1. Provides a text area for entering extraction instructions
  2. Suggests default prompts based on detected document type
  3. Allows users to specify exactly what data they want extracted
  4. Passes these instructions to the AI extraction process



Sources:

  * [components/utilities/FileUpload.tsx59-82](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/FileUpload.tsx#L59-L82)
  * [components/utilities/FileUpload.tsx194-206](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/FileUpload.tsx#L194-L206)
  * [prompts/extraction.ts1-133](https://github.com/moemoe9876/my-app/blob/b1f77c9f/prompts/extraction.ts#L1-L133)



### Upload Progress and Feedback

The upload interface provides real-time feedback through multiple stages:

  1. **Upload Stage** : Initial file selection and instruction input
  2. **Processing Stage** : Visual progress indicators with step completion markers
  3. **Complete Stage** : Success confirmation with options to review or upload another document
  4. **Error Stage** : Detailed error information with retry option



Each stage includes appropriate visual cues and actionable buttons to guide the user through the process.

Sources:

  * [app/(dashboard)/dashboard/upload/page.tsx16-22](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/upload/page.tsx#L16-L22)
  * [app/(dashboard)/dashboard/upload/page.tsx188-406](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/upload/page.tsx#L188-L406)



## Server Implementation

### Upload Document Action

The core server functionality is implemented in the `uploadDocumentAction` function, which handles the complete upload workflow:


Sources:

  * [actions/db/documents.ts20-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L20-L143)



### Error Handling

The upload action implements comprehensive error handling:

Error Type| HTTP Status| Description  
---|---|---  
Authentication Failure| 401| User not authenticated  
Subscription Data Error| 404| Failed to retrieve subscription data  
Rate Limit Exceeded| 429| Too many upload requests  
Quota Exceeded| 403| Monthly page quota exceeded  
Upload Failure| Varies| Storage upload error  
Database Error| 500| Error creating document record  
  
All errors are propagated to the client with appropriate status codes and descriptive messages.

Sources:

  * [actions/db/documents.ts52-57](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L52-L57)
  * [actions/db/documents.ts63-68](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L63-L68)
  * [actions/db/documents.ts86-93](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L86-L93)
  * [actions/db/documents.ts135-142](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L135-L142)



### Integration with AI Extraction

After successful upload, the client initiates the AI extraction process by calling the `extractDocumentDataAction` function with:

  1. The document ID returned from the upload
  2. User-provided extraction instructions
  3. Configuration options for confidence scores and position data



This action is implemented on the client side in the upload page component, creating a seamless transition from upload to extraction.

Sources:

  * [app/(dashboard)/dashboard/upload/page.tsx129-136](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/upload/page.tsx#L129-L136)



## Security Considerations

The document upload system implements several security measures:

  1. **Authentication** : All upload actions require an authenticated user
  2. **User-specific storage paths** : Files are stored in user-specific folders
  3. **Path validation** : Document deletion verifies storage paths belong to the requesting user
  4. **File sanitization** : Filenames are sanitized to prevent path traversal attacks
  5. **Quota enforcement** : Prevents resource abuse through strict quota enforcement



Additional measures include:

  * Rate limiting to prevent denial of service attacks
  * Service role access for storage operations to bypass row-level security
  * Base64 validation to ensure proper file content



Sources:

  * [actions/db/documents.ts30-31](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L30-L31)
  * [actions/db/documents.ts72-73](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L72-L73)
  * [actions/db/documents.ts174-180](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L174-L180)



## Testing

The document upload functionality includes comprehensive unit tests to verify:

  1. Successful document upload and storage
  2. Rate limit enforcement
  3. Quota verification
  4. Error conditions and handling
  5. Security validation



These tests ensure the reliability and security of the document upload process.

Sources:

  * [__tests__/document-actions.test.ts1-207](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/document-actions.test.ts#L1-L207)



### On this page

  * Document Upload
  * Overview
  * Upload Process
  * Rate Limiting and Quota Management
  * File Storage
  * Document Record Creation
  * User Interface Components
  * File Selection and Validation
  * Extraction Instructions
  * Upload Progress and Feedback
  * Server Implementation
  * Upload Document Action
  * Error Handling
  * Integration with AI Extraction
  * Security Considerations
  * Testing




---

# AI Extraction

URL: https://deepwiki.com/moemoe9876/my-app/3.2-ai-extraction


# AI Extraction

Relevant source files

The following files were used as context for generating this wiki page:

  * [__tests__/ai/schema.test.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/ai/schema.test.ts)
  * [actions/ai/extraction-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts)
  * [actions/ai/schema.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/schema.ts)
  * [implementation.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md)
  * [lib/ai/vertex-client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts)
  * [package.json](https://github.com/moemoe9876/my-app/blob/b1f77c9f/package.json)
  * [pnpm-lock.yaml](https://github.com/moemoe9876/my-app/blob/b1f77c9f/pnpm-lock.yaml)
  * [prompts/schemaGen.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/prompts/schemaGen.ts)



## Purpose and Scope

The AI Extraction system is the core intelligent component of IngestIO that processes uploaded documents to extract structured data using Google's Vertex AI (specifically Gemini models). It transforms unstructured documents like invoices, resumes, and contracts into structured, machine-readable data. This page documents the technical implementation of the AI extraction process.

For information about the document upload process that precedes extraction, see [Document Upload](/moemoe9876/my-app/3.1-document-upload). For details on reviewing extracted data, see [Document Review](/moemoe9876/my-app/3.3-document-review).

Sources:

  * [actions/ai/extraction-actions.ts1-15](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L1-L15)
  * [lib/ai/vertex-client.ts1-12](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts#L1-L12)



## System Architecture

The AI Extraction system sits between document upload and document review, transforming raw document content into structured data that can be viewed, validated, and exported.

### AI Extraction in System Context


Sources:

  * [actions/ai/extraction-actions.ts208-292](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L292)
  * [implementation.md38-45](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L38-L45)



### Key Components and Data Flow


Sources:

  * [actions/ai/extraction-actions.ts208-215](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L215)
  * [lib/ai/vertex-client.ts95-124](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts#L95-L124)



## Vertex AI Integration

The system integrates with Google Vertex AI for document analysis and data extraction, using the Gemini models for their multimodal capabilities.

### Authentication and Configuration

The system implements a priority-based authentication strategy for Vertex AI:


Sources:

  * [lib/ai/vertex-client.ts13-75](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts#L13-L75)
  * [lib/ai/vertex-client.ts102-110](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts#L102-L110)



### Model Selection

The system primarily uses `gemini-2.0-flash-001` for document extraction:

Model ID| Variable| Purpose  
---|---|---  
gemini-2.0-flash-001| VERTEX_MODELS.GEMINI_2_0_FLASH| Document extraction with multimodal capabilities  
  
Sources:

  * [lib/ai/vertex-client.ts115-117](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts#L115-L117)
  * [actions/ai/extraction-actions.ts361](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L361-L361)



## Extraction Process

### Extraction Workflow


Sources:

  * [actions/ai/extraction-actions.ts208-536](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L536)



### Request and Response Processing

When a document extraction is requested, the process includes:

  1. **Authentication & Validation**: Verifies user identity and validates input parameters
  2. **Rate Limiting & Quota Check**: Ensures user hasn't exceeded usage limits
  3. **Document Retrieval** : Fetches document metadata and content from Supabase
  4. **Extraction Job Creation** : Creates an `extraction_jobs` record to track the process
  5. **Prompt Preparation** : Enhances extraction prompts based on user inputs and configuration
  6. **AI Processing** : Sends the document to Vertex AI for processing
  7. **Result Storage** : Saves the extracted data to the database
  8. **Usage Tracking** : Updates user quota usage and tracks analytics



Sources:

  * [actions/ai/extraction-actions.ts216-292](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L216-L292)
  * [actions/ai/extraction-actions.ts339-413](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L339-L413)



### Fallback Mechanism

The system implements a fallback strategy when structured extraction fails:


Sources:

  * [actions/ai/extraction-actions.ts388-470](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L388-L470)



## Schema Generation

The AI Extraction system includes functionality to generate schemas for document structures using AI.

### Schema Types

The system can generate three types of schemas:

Schema Type| Description| Use Case  
---|---|---  
Zod Schema| TypeScript validation schema| Runtime type checking, data validation  
TypeScript Interface| Static type definition| Development-time type checking  
JSON Schema| Standard JSON schema format| API documentation, client validation  
  
Sources:

  * [actions/ai/schema.ts23-37](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/schema.ts#L23-L37)
  * [prompts/schemaGen.ts27-108](https://github.com/moemoe9876/my-app/blob/b1f77c9f/prompts/schemaGen.ts#L27-L108)



### Schema Generation Flow


Sources:

  * [actions/ai/schema.ts49-181](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/schema.ts#L49-L181)
  * [actions/ai/schema.ts111-146](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/schema.ts#L111-L146)



## Rate Limiting and Quotas

The AI Extraction system implements a comprehensive rate limiting and quota management system based on user subscription tiers.

### Rate Limiting Implementation


The system enforces different limits based on the user's subscription tier, controlling:

  * API request rates
  * Monthly page processing quotas
  * Batch processing capabilities



Sources:

  * [actions/ai/extraction-actions.ts130-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L130-L201)
  * [actions/ai/extraction-actions.ts243-276](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L243-L276)



## Error Handling and Analytics

### Error Handling Strategy

The system implements multiple levels of error handling:

  1. Input validation via Zod schemas
  2. Try-catch blocks for all critical operations
  3. Fallback strategies when primary methods fail
  4. Detailed error reporting through `ActionState` responses



Sources:

  * [actions/ai/extraction-actions.ts217-222](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L217-L222)
  * [actions/ai/extraction-actions.ts538-586](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L538-L586)



### Analytics Integration


The system tracks key events with PostHog for monitoring and optimization:

Event Type| Description| Data Points Tracked  
---|---|---  
extraction_completed| Successful extraction| documentId, extractionJobId, tier, pageCount  
extraction_failed| Failed extraction| documentId, extractionJobId, error, tier  
extraction_rate_limited| Rate limit exceeded| documentId, tier, traceId  
extraction_quota_exceeded| Quota exceeded| documentId, tier, remaining pages  
schema_generated| Schema generation| documentType, tier, formats  
  
Sources:

  * [actions/ai/extraction-actions.ts364-384](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L364-L384)
  * [actions/ai/extraction-actions.ts517-525](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L517-L525)
  * [actions/ai/extraction-actions.ts554-561](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L554-L561)



## Pre-defined Schemas

The system includes predefined schemas for common document types to facilitate structured extraction:

### Invoice Schema
    
    
    invoiceSchema = z.object({
      invoiceNumber: z.string().optional(),
      date: z.string().optional(),
      dueDate: z.string().optional(),
      totalAmount: z.number().optional(),
      vendor: z.object({...}).optional(),
      customer: z.object({...}).optional(),
      lineItems: z.array(z.object({...})).optional(),
      confidence: z.number().optional(),
    });
    

### Resume Schema
    
    
    resumeSchema = z.object({
      personalInfo: z.object({...}).optional(),
      education: z.array(z.object({...})).optional(),
      workExperience: z.array(z.object({...})).optional(),
      skills: z.array(z.string()).optional(),
      certifications: z.array(z.object({...})).optional(),
      languages: z.array(z.object({...})).optional(),
      confidence: z.number().optional(),
    });
    

Sources:

  * [actions/ai/extraction-actions.ts38-64](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L38-L64)
  * [actions/ai/extraction-actions.ts69-113](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L69-L113)



## Integration with Document Processing Flow

The AI Extraction component is a crucial part of the document processing workflow in IngestIO:


Sources:

  * [implementation.md25-45](https://github.com/moemoe9876/my-app/blob/b1f77c9f/implementation.md#L25-L45)



### On this page

  * AI Extraction
  * Purpose and Scope
  * System Architecture
  * AI Extraction in System Context
  * Key Components and Data Flow
  * Vertex AI Integration
  * Authentication and Configuration
  * Model Selection
  * Extraction Process
  * Extraction Workflow
  * Request and Response Processing
  * Fallback Mechanism
  * Schema Generation
  * Schema Types
  * Schema Generation Flow
  * Rate Limiting and Quotas
  * Rate Limiting Implementation
  * Error Handling and Analytics
  * Error Handling Strategy
  * Analytics Integration
  * Pre-defined Schemas
  * Invoice Schema
  * Resume Schema
  * Integration with Document Processing Flow




---

# Document Review

URL: https://deepwiki.com/moemoe9876/my-app/3.3-document-review


# Document Review

Relevant source files

The following files were used as context for generating this wiki page:

  * [.npmrc](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.npmrc)
  * [app/(dashboard)/dashboard/review/[id]/page.tsx](app/\(dashboard\)/dashboard/review/%5Bid%5D/page.tsx)
  * [app/(dashboard)/dashboard/review/page.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/review/page.tsx)/dashboard/review/page.tsx)
  * [app/globals.css](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/globals.css)
  * [components/magicui/border-beam.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/magicui/border-beam.tsx)
  * [components/magicui/dot-pattern.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/magicui/dot-pattern.tsx)
  * [components/utilities/DataVisualizer.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/DataVisualizer.tsx)
  * [components/utilities/InteractiveDataField.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/InteractiveDataField.tsx)



This document describes the Document Review system within IngestIO, which allows users to review, verify, and edit data extracted from documents. After document upload and AI extraction (see [Document Upload](/moemoe9876/my-app/3.1-document-upload) and [AI Extraction](/moemoe9876/my-app/3.2-ai-extraction)), the review process is where users validate the accuracy of the extracted information before finalizing it.

## Overview

The Document Review system provides an interactive interface where users can:

  * View the original document alongside extracted data
  * Verify data accuracy with confidence scores
  * Edit incorrect or incomplete data
  * See position mapping between extracted data and source locations
  * Export extracted data in various formats
  * Confirm data after review



Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:97-98](), [app/(dashboard)/dashboard/review/[id]/page.tsx:547-551]()

## Component Architecture

The Document Review interface is built using a split-panel layout with extracted data visualization on one side and the original document on the other.


Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:592-684](), [components/utilities/DataVisualizer.tsx169-178](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/DataVisualizer.tsx#L169-L178)

## Data Flow

The Document Review process follows a specific data flow from fetching to confirming the extracted data.


Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:148-213](), [app/(dashboard)/dashboard/review/[id]/page.tsx:225-258](), [app/(dashboard)/dashboard/review/[id]/page.tsx:261-289]()

## User Interface Components

### Main Layout

The Document Review interface consists of two main panels with a resizable divider:

  1. **Left Panel** : Displays the extracted data in a structured format
  2. **Right Panel** : Shows the original document with highlighting capabilities



The interface also includes:

  * Action buttons for editing, resetting, exporting, and confirming data
  * Confidence threshold filter to highlight low-confidence extractions
  * Search functionality for finding specific data points



Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:547-684]()

### Data Visualizer

The DataVisualizer component is a key element that presents extracted data in different views:

  * **Tree View** : Hierarchical display of structured data
  * **JSON View** : Raw JSON representation of the data



Each data field is displayed with:

  * Field name (formatted for readability)
  * Extracted value
  * Confidence score with color-coding
  * Page location information (when available)
  * Edit functionality (when in edit mode)




Sources: [components/utilities/DataVisualizer.tsx44-56](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/DataVisualizer.tsx#L44-L56) [components/utilities/DataVisualizer.tsx169-178](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/DataVisualizer.tsx#L169-L178) [components/utilities/InteractiveDataField.tsx18-28](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/InteractiveDataField.tsx#L18-L28)

### Document Viewer

The DocumentViewer component displays the original PDF document and supports:

  * Field highlighting based on bounding box coordinates
  * Click-to-select functionality to identify fields in the document
  * Synchronization with the data view when fields are selected



When a user hovers over or selects a field in the data visualizer that has position information, the corresponding area in the document is highlighted.

Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:664-669]()

## Feature: Interactive Data Editing

The review system provides interactive editing capabilities that allow users to correct extraction errors:

  1. **Toggling Edit Mode** : Users can enter edit mode by clicking the "Edit Mode" button
  2. **Field Editing** : In edit mode, fields can be edited by clicking on them or the edit icon
  3. **Changes Tracking** : The system tracks unsaved changes
  4. **Reset Functionality** : Users can discard all changes and revert to the original data
  5. **Confirmation** : Changes are saved by clicking the "Confirm Data" button



Each editable field in edit mode displays:

  * Input field with the current value
  * Save button to confirm the change
  * Cancel button to discard the change



Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:416-483](), [components/utilities/InteractiveDataField.tsx142-168](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/InteractiveDataField.tsx#L142-L168)

### Editing Workflow


Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:572-587](), [app/(dashboard)/dashboard/review/[id]/page.tsx:416-483](), [app/(dashboard)/dashboard/review/[id]/page.tsx:484-500]()

## Feature: Confidence Visualization

Each extracted field includes a confidence score from the AI model. The system visualizes these scores to help users identify potentially incorrect extractions:

  1. **Color Coding** : Fields are color-coded based on confidence level

     * High confidence (≥90%): Green
     * Medium confidence (≥70%): Yellow
     * Low confidence (<70%): Red
  2. **Confidence Filtering** : Users can filter fields based on a confidence threshold

     * Slider control to set minimum confidence level
     * Only fields meeting or exceeding the threshold are displayed
  3. **Confidence Indicators** : Visual indicators on each field show the confidence level




Sources: [components/utilities/DataVisualizer.tsx59-63](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/DataVisualizer.tsx#L59-L63) [app/(dashboard)/dashboard/review/[id]/page.tsx:554-569]()

## Feature: Document-Data Position Mapping

A key feature of the review system is the ability to visualize where in the original document each data field was extracted from:

  1. **Hover Highlighting** : When hovering over a field with position data, the corresponding area in the document is highlighted
  2. **Click Selection** : Clicking on a highlighted area in the document selects the corresponding field in the data view
  3. **Persistent Highlighting** : Selected fields maintain their highlight in the document
  4. **Position Information** : Fields display their source page number when hovered



This bidirectional mapping helps users quickly verify the accuracy of extracted data against the source document.

Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:291-308](), [app/(dashboard)/dashboard/review/[id]/page.tsx:338-413]()

## Feature: Data Export

The Document Review system allows users to export extracted data in different formats:

  1. **Export Dialog** : Clicking the "Export Data" button opens a dialog with export options
  2. **Format Options** : 
     * JSON: Complete structured data
     * CSV: Tabular representation of data
     * XLSX: Excel format (implementation placeholder)
  3. **Metadata Options** : Users can choose to include or exclude extraction metadata
  4. **Direct Download** : Exported data is downloaded as a file

Format| File Extension| Implementation Status  
---|---|---  
JSON| .json| Fully implemented  
CSV| .csv| Implemented in DataVisualizer  
XLSX| .xlsx| UI option only (placeholder)  
  
Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:718-775](), [components/utilities/DataVisualizer.tsx294-335](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/DataVisualizer.tsx#L294-L335)

## Integration with Other Systems

The Document Review system integrates with several other components of the IngestIO application:


Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:3-3](), [app/(dashboard)/dashboard/review/[id]/page.tsx:44-46]()

## Technical Details

### Data Structures

The Document Review system works with several key data structures:

**1\. Extracted Data Structure**


**2\. Extraction Metadata**


**3\. Highlight Rectangle**


Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:65-95](), [components/utilities/DataVisualizer.tsx26-42](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/DataVisualizer.tsx#L26-L42)

### State Management

The Review page manages several pieces of state:

  * `extractedData`: The data extracted from the document
  * `originalData`: The initial extracted data (for reset functionality)
  * `editMode`: Whether the page is in edit mode
  * `confirmed`: Whether the data has been confirmed
  * `currentHighlight`: The current field highlight in the document
  * `selectedFieldPath`: The currently selected field
  * `confidenceThreshold`: The minimum confidence threshold for filtering fields
  * `isPending`: Whether a server action is in progress



Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:99-124]()

## Summary

The Document Review system is a crucial part of the IngestIO application, serving as the interface between AI extraction and human verification. It provides a comprehensive set of tools for reviewing, editing, and confirming extracted document data, ensuring accuracy before the data is used for further processing or analysis.

The system's bidirectional mapping between data fields and document positions, along with confidence visualization and interactive editing capabilities, creates an efficient workflow for validating extracted information.

### On this page

  * Document Review
  * Overview
  * Component Architecture
  * Data Flow
  * User Interface Components
  * Main Layout
  * Data Visualizer
  * Document Viewer
  * Feature: Interactive Data Editing
  * Editing Workflow
  * Feature: Confidence Visualization
  * Feature: Document-Data Position Mapping
  * Feature: Data Export
  * Integration with Other Systems
  * Technical Details
  * Data Structures
  * State Management
  * Summary




---

# Batch Processing

URL: https://deepwiki.com/moemoe9876/my-app/3.4-batch-processing


# Batch Processing

Relevant source files

The following files were used as context for generating this wiki page:

  * [.cursorignore](https://github.com/moemoe9876/my-app/blob/b1f77c9f/.cursorignore)
  * [MANUAL-INSTRUCTIONS-FOR-E2E-TESTING.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/MANUAL-INSTRUCTIONS-FOR-E2E-TESTING.md)
  * [actions/ai/extraction-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts)
  * [actions/batch/batch-extraction-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/batch/batch-extraction-actions.ts)
  * [actions/stripe/sync-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/sync-actions.ts)
  * [lib/ai/vertex-client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts)
  * [vitest.config.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/vitest.config.ts)



## Purpose and Scope

This document explains the batch document processing capabilities of the IngestIO system, which allows users to submit multiple documents for AI-based data extraction as a single operation. Batch processing enables efficient handling of large document sets while maintaining appropriate rate limits and quotas based on the user's subscription tier.

For information about the single document extraction process, see [AI Extraction](/moemoe9876/my-app/3.2-ai-extraction).

Sources: [actions/batch/batch-extraction-actions.ts1-154](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/batch/batch-extraction-actions.ts#L1-L154)

## Batch Processing Overview

Batch processing in IngestIO enables users to extract data from multiple documents in a single operation, improving efficiency and providing a consistent extraction experience across a set of similar documents. This feature is particularly valuable for processing collections of invoices, receipts, forms, or other standardized documents.

The batch processing system handles:

  * Validation of batch requests against subscription tier limits
  * Quota verification for multi-document processing
  * Rate limiting to prevent system overload
  * Queueing and status tracking of batch jobs



### Subscription Tier Limitations

Batch processing capabilities are tier-limited, with different subscription levels providing varying maximum batch sizes:

Subscription Tier| Maximum Batch Size| Rate Limiting  
---|---|---  
Starter| Limited (typically 1-3)| Strictest  
Plus| Medium (10-20)| Moderate  
Growth/Enterprise| Largest (50+)| Most lenient  
  
Sources: [actions/batch/batch-extraction-actions.ts10-67](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/batch/batch-extraction-actions.ts#L10-L67) [lib/rate-limiting/limiter.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/rate-limiting/limiter.ts) (referenced but not provided)

## Batch Processing Workflow

The batch processing system follows a structured workflow from submission to completion.

### Batch Processing System Architecture


### Implementation Details

The batch processing workflow consists of these main steps:

  1. **Batch Request Validation** : The system validates that the request contains valid document IDs and extraction prompts.

  2. **Subscription Tier Checking** : The system verifies that the requested batch size is within the limits of the user's subscription tier.

  3. **Quota Verification** : The system checks if the user has sufficient page quota remaining to process all documents in the batch.

  4. **Rate Limiting Application** : The system applies tier-specific rate limiting to prevent API abuse.

  5. **Batch Job Creation** : A batch job record is created to track the overall extraction process.

  6. **Individual Document Processing** : Each document in the batch is queued for processing through the AI extraction pipeline.

  7. **Status Tracking** : The system tracks the status of each document and the overall batch job.

  8. **Results Aggregation** : When all documents are processed, the system aggregates the results for presentation.




Sources: [actions/batch/batch-extraction-actions.ts19-112](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/batch/batch-extraction-actions.ts#L19-L112) [actions/ai/extraction-actions.ts26-35](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L26-L35)

## Integration with Extraction System

Batch processing leverages the core extraction capabilities but adds orchestration layer for handling multiple documents.


### Rate Limiting and Quota Management

The batch processing system carefully manages rate limits and quotas:

  1. **Tier-specific Rate Limiting** : Each subscription tier has different rate limit configurations for batch operations, affecting how many requests can be made in a time period.

  2. **Batch Size Validation** : The system validates that the requested batch size is allowed for the user's subscription tier.

  3. **Quota Checking** : Before processing a batch, the system verifies that the user has sufficient quota remaining for all documents in the batch.

  4. **Retry Mechanism** : If rate limits are exceeded, the system returns information about when the request can be retried.




Sources: [actions/batch/batch-extraction-actions.ts42-85](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/batch/batch-extraction-actions.ts#L42-L85) [actions/ai/extraction-actions.ts130-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L130-L201)

## Batch Status Tracking

The batch processing system provides status tracking for batch jobs, allowing users to monitor progress.

### Batch Job Status States


### Status Query Implementation

The system provides an action for checking the status of a batch job:

  * The `checkBatchStatusAction` function allows querying the current status of a batch job
  * Status information includes: 
    * Number of completed documents
    * Total number of documents in the batch
    * Overall batch job status



Sources: [actions/batch/batch-extraction-actions.ts117-154](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/batch/batch-extraction-actions.ts#L117-L154)

## Implementation Details

### Key Server Actions

The batch processing functionality is implemented through two main server actions:

  1. **`queueBatchExtractionAction`** : Validates and queues a batch extraction job

     * Validates input schema with document IDs and extraction prompt
     * Checks subscription tier and ensures batch size is within limits
     * Verifies user has sufficient quota
     * Applies rate limiting
     * Creates and queues the batch job
  2. **`checkBatchStatusAction`** : Retrieves the status of a batch job

     * Authenticates the requesting user
     * Retrieves the batch job status
     * Returns completion statistics and overall status



Sources: [actions/batch/batch-extraction-actions.ts19-154](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/batch/batch-extraction-actions.ts#L19-L154)

### Integration with AI Extraction

Batch processing leverages the same AI extraction capabilities used for single documents:

  * Uses Google Vertex AI for document understanding and data extraction
  * Applies the same extraction prompt to all documents in the batch
  * Documents are processed using the Gemini 2.0 Flash model for optimal speed and efficiency



Sources: [actions/ai/extraction-actions.ts590-809](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L590-L809) [lib/ai/vertex-client.ts115-118](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts#L115-L118)

### Error Handling

The batch processing system implements comprehensive error handling:

  * Input validation errors return detailed error messages
  * Subscription tier limit errors specify the limit and requested batch size
  * Quota errors indicate remaining quota and requested amount
  * Rate limiting errors include retry-after information
  * Processing errors are tracked per document and aggregated at the batch level



Sources: [actions/batch/batch-extraction-actions.ts30-111](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/batch/batch-extraction-actions.ts#L30-L111)

## Security Considerations

The batch processing system incorporates several security measures:

  1. **Authentication** : All batch actions require user authentication
  2. **Authorization** : Document ownership is verified for each document in the batch
  3. **Input Validation** : All input is validated using Zod schema validation
  4. **Rate Limiting** : Prevents abuse through tier-specific rate limits



Sources: [actions/batch/batch-extraction-actions.ts23-29](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/batch/batch-extraction-actions.ts#L23-L29) [actions/ai/extraction-actions.ts8-36](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L8-L36)

## Conclusion

The batch processing capability in IngestIO provides an efficient way to extract data from multiple documents in a single operation while maintaining appropriate controls for system resources. By implementing tier-based limits, quota management, and comprehensive status tracking, the system balances performance, reliability, and security.

### On this page

  * Batch Processing
  * Purpose and Scope
  * Batch Processing Overview
  * Subscription Tier Limitations
  * Batch Processing Workflow
  * Batch Processing System Architecture
  * Implementation Details
  * Integration with Extraction System
  * Rate Limiting and Quota Management
  * Batch Status Tracking
  * Batch Job Status States
  * Status Query Implementation
  * Implementation Details
  * Key Server Actions
  * Integration with AI Extraction
  * Error Handling
  * Security Considerations
  * Conclusion




---

# User Management

URL: https://deepwiki.com/moemoe9876/my-app/4-user-management


# User Management

Relevant source files

The following files were used as context for generating this wiki page:

  * [__tests__/profile-actions.test.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts)
  * [actions/db/profiles-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts)
  * [actions/db/users-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts)
  * [app/api/webhooks/clerk/clerk-client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/clerk-client.ts)
  * [app/api/webhooks/clerk/route.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts)
  * [db/migrations/0000_nostalgic_mauler.sql](https://github.com/moemoe9876/my-app/blob/b1f77c9f/db/migrations/0000_nostalgic_mauler.sql)
  * [lib/supabase/middleware.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/supabase/middleware.ts)
  * [types/supabase-types.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts)



This document describes the user management system in IngestIO, covering authentication flow, user data structure, and the mechanisms for synchronizing user information across the application. For information on subscription-specific functionality, see [Subscription System](/moemoe9876/my-app/5-subscription-system).

## 1\. Overview

The user management system handles user identity, authentication, and profile data throughout the application. It uses Clerk for authentication, stores user data in Supabase, and leverages webhooks to synchronize information between these services.


Sources:

  * [actions/db/profiles-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts)
  * [actions/db/users-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts)
  * [app/api/webhooks/clerk/route.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts)



## 2\. Authentication Architecture

The application implements a multi-layered authentication system that integrates Clerk for identity management with Supabase for data storage and access control.


Sources:

  * [app/api/webhooks/clerk/route.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts)
  * [lib/supabase/middleware.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/supabase/middleware.ts)
  * [app/api/webhooks/clerk/clerk-client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/clerk-client.ts)



## 3\. User Data Model

The system maintains user data across two primary tables: `users` for identity information and `profiles` for subscription and membership data.


### 3.1 Table Structure Details

#### Users Table

Stores core identity information synchronized from Clerk:

Column| Type| Description  
---|---|---  
user_id| string| Primary key, identical to Clerk user ID  
email| string| User's primary email address  
full_name| string| User's full name  
avatar_url| string| URL to user's profile picture  
metadata| JSON| Additional user metadata  
created_at| timestamp| Record creation timestamp  
updated_at| timestamp| Record update timestamp  
  
#### Profiles Table

Stores subscription and membership information:

Column| Type| Description  
---|---|---  
user_id| string| Primary key and foreign key to users table  
membership| enum| User's membership tier: starter, plus, or growth  
stripe_customer_id| string| User's Stripe customer ID for billing  
stripe_subscription_id| string| User's Stripe subscription ID  
created_at| timestamp| Record creation timestamp  
updated_at| timestamp| Record update timestamp  
  
Sources:

  * [types/supabase-types.ts343-372](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L343-L372)
  * [types/supabase-types.ts260-301](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L260-L301)
  * [db/migrations/0000_nostalgic_mauler.sql7-14](https://github.com/moemoe9876/my-app/blob/b1f77c9f/db/migrations/0000_nostalgic_mauler.sql#L7-L14)



## 4\. Clerk Webhook Integration

The system uses Clerk webhooks to synchronize user data with the Supabase database. This ensures that any changes made to user data in Clerk (creation, updates, deletion) are reflected in the application's database.


### 4.1 Webhook Event Handling

The webhook handler processes three primary events:

  1. **User Creation** (`user.created`):

     * Creates a new record in the `users` table with identity information
     * Creates a corresponding record in the `profiles` table with default membership tier
  2. **User Update** (`user.updated`):

     * Updates the user's information in the `users` table
     * Ensures both user and profile records exist
  3. **User Deletion** (`user.deleted`):

     * Removes records from both `profiles` and `users` tables



Sources:

  * [app/api/webhooks/clerk/route.ts45-102](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts#L45-L102) (User Creation)
  * [app/api/webhooks/clerk/route.ts104-217](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts#L104-L217) (User Update)
  * [app/api/webhooks/clerk/route.ts219-259](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts#L219-L259) (User Deletion)
  * [app/api/webhooks/clerk/clerk-client.ts26-37](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/clerk-client.ts#L26-L37) (Admin Client)



## 5\. Server Action Functions

The application implements server actions to manage user data throughout the application. These functions handle CRUD operations on the `users` and `profiles` tables.

### 5.1 User Management Actions


Key user actions include:

Function| Purpose| Access Level  
---|---|---  
`getCurrentUserDataAction`| Retrieve current authenticated user data| Public  
`updateUserIdentityAction`| Update user identity information| Public, self only  
`getUserByIdAction`| Get user by ID| Internal  
`getUserByEmailAction`| Get user by email| Internal  
`createUserAction`| Create a new user| Admin only  
`updateUserAction`| Update user information| Admin only  
`deleteUserAction`| Delete a user| Admin only  
  
Sources:

  * [actions/db/users-actions.ts56-83](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L56-L83) (getCurrentUserDataAction)
  * [actions/db/users-actions.ts146-205](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L146-L205) (updateUserIdentityAction)
  * [actions/db/users-actions.ts16-29](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L16-L29) (getUserByIdAction)
  * [actions/db/users-actions.ts37-50](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L37-L50) (getUserByEmailAction)
  * [actions/db/users-actions.ts91-104](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L91-L104) (updateUserAction)
  * [actions/db/users-actions.ts112-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L112-L121) (createUserAction)
  * [actions/db/users-actions.ts129-138](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L129-L138) (deleteUserAction)



### 5.2 Profile Management Actions


Key profile actions include:

Function| Purpose| Access Level  
---|---|---  
`getProfileAction`| Create a profile| Internal  
`getProfileByUserIdAction`| Get profile by user ID| Internal  
`updateProfileAction`| Update profile information| Internal  
`updateSubscriptionProfileAction`| Update subscription-related fields| Public, self only  
`deleteProfileAction`| Delete a profile| Internal  
`updateProfileByStripeCustomerIdAction`| Update profile by Stripe customer ID| Internal  
  
Sources:

  * [actions/db/profiles-actions.ts26-40](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L26-L40) (getProfileAction)
  * [actions/db/profiles-actions.ts42-62](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L42-L62) (getProfileByUserIdAction)
  * [actions/db/profiles-actions.ts64-88](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L64-L88) (updateProfileAction)
  * [actions/db/profiles-actions.ts142-203](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L142-L203) (updateSubscriptionProfileAction)
  * [actions/db/profiles-actions.ts122-136](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L122-L136) (deleteProfileAction)
  * [actions/db/profiles-actions.ts90-120](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L90-L120) (updateProfileByStripeCustomerIdAction)



## 6\. Security and Data Protection

The user management system implements several security measures to protect user data:

  1. **Authentication-Based Access Control** : Server actions verify the current user's identity before permitting operations.

  2. **Self-Only Data Modification** : Users can only modify their own data through public server actions:

  3. **Field Restriction** : Only specific fields can be modified through public actions:

  4. **Admin-Only Functions** : Sensitive operations like user deletion are restricted to admin contexts.

  5. **Webhook Signature Verification** : Clerk webhooks are verified using SVIX signatures:




Sources:

  * [actions/db/profiles-actions.ts152-160](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L152-L160) (Authentication check)
  * [actions/db/profiles-actions.ts163-167](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L163-L167) (Field restriction)
  * [actions/db/users-actions.ts159-164](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L159-L164) (Self-only data modification)
  * [app/api/webhooks/clerk/route.ts29-33](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts#L29-L33) (Webhook verification)



## 7\. Analytics Integration

User management events are tracked for analytics purposes using the `trackServerEvent` function:

  1. **Subscription Changes** : When a user's subscription status changes:

  2. **Profile Updates** : When a user updates their profile information:




These events help track user behavior and system performance, which is part of the larger analytics system documented in [Analytics](/moemoe9876/my-app/6-analytics).

Sources:

  * [actions/db/profiles-actions.ts181-189](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L181-L189) (Subscription tracking)
  * [actions/db/users-actions.ts185-191](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L185-L191) (Profile update tracking)
  * [__tests__/profile-actions.test.ts116-123](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts#L116-L123) (Test verification of analytics)



## 8\. Testing

The user management system includes comprehensive tests to ensure its reliability:

  1. **Profile Action Tests** : Verify profile update functions, especially subscription updates.
  2. **User Action Tests** : Test user data retrieval and identity updates.
  3. **Authentication Tests** : Verify that users can only modify their own data.
  4. **Error Handling Tests** : Ensure proper error responses when operations fail.



This test suite helps maintain system integrity when code changes are made.

Sources:

  * [__tests__/profile-actions.test.ts107-147](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts#L107-L147) (Subscription profile tests)
  * [__tests__/profile-actions.test.ts149-190](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts#L149-L190) (User identity tests)
  * [__tests__/profile-actions.test.ts78-105](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts#L78-L105) (Current user data tests)



### On this page

  * User Management
  * 1\. Overview
  * 2\. Authentication Architecture
  * 3\. User Data Model
  * 3.1 Table Structure Details
  * Users Table
  * Profiles Table
  * 4\. Clerk Webhook Integration
  * 4.1 Webhook Event Handling
  * 5\. Server Action Functions
  * 5.1 User Management Actions
  * 5.2 Profile Management Actions
  * 6\. Security and Data Protection
  * 7\. Analytics Integration
  * 8\. Testing




---

# Subscription System

URL: https://deepwiki.com/moemoe9876/my-app/5-subscription-system


# Subscription System

Relevant source files

The following files were used as context for generating this wiki page:

  * [actions/stripe/checkout-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/checkout-actions.ts)
  * [actions/stripe/index.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/index.ts)
  * [actions/stripe/webhook-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts)
  * [app/api/stripe/webhooks/route.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/stripe/webhooks/route.ts)
  * [components/utilities/user-nav.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/user-nav.tsx)
  * [lib/config/subscription-plans.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts)
  * [lib/stripe/client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/stripe/client.ts)
  * [lib/stripe/webhooks.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/stripe/webhooks.ts)
  * [middleware.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/middleware.ts)



## Overview

The Subscription System manages user subscription plans, processes payments via Stripe, and enforces usage quotas in the IngestIO application. It implements a "Sane Stripe" approach with Redis KV store as the source of truth and database denormalization for quick access. This document covers subscription plan definitions, Stripe integration, webhook processing, and quota management.

Sources: [lib/config/subscription-plans.ts1-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L1-L121) [actions/stripe/webhook-actions.ts26-28](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L26-L28)

## Subscription Plans

The application implements a tiered subscription model with three plans:

Plan ID| Name| Price (Monthly)| Document Quota| Batch Processing| Retention Days  
---|---|---|---|---|---  
starter| Starter| Free| 25| No| 30  
plus| Plus| $9.99| 250| Yes (25 max)| 90  
growth| Growth| $19.99| 500| Yes (100 max)| 365  
  
Each plan defines document quotas, batch processing capabilities, data retention periods, and support levels. Plans are configured in the subscription-plans.ts file with corresponding Stripe price IDs.

### Plan Structure Diagram


Sources: [lib/config/subscription-plans.ts15-32](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L15-L32) [lib/config/subscription-plans.ts35-76](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L35-L76)

## Stripe Integration

### Checkout Process

The subscription system interfaces with Stripe for payment processing through server actions. When a user selects a plan, the system creates a Stripe checkout session and redirects the user to Stripe's checkout page.


Sources: [actions/stripe/checkout-actions.ts1-138](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/checkout-actions.ts#L1-L138)

### Billing Portal

For subscription management, the system provides a Stripe customer portal that allows users to:

  * Update payment methods
  * View invoices and payment history
  * Change subscription plans
  * Cancel subscriptions



The portal is accessed via the `createBillingPortalSessionAction` which generates a session URL for the current user.

Sources: [actions/stripe/checkout-actions.ts140-199](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/checkout-actions.ts#L140-L199)

## Webhook Processing

Stripe webhooks are used to keep subscription data synchronized between Stripe and the application. The webhook system follows these steps:

  1. Stripe sends event notifications to the webhook endpoint
  2. The webhook handler validates the signature and processes the event
  3. The event processor extracts relevant data and updates the Redis KV store
  4. Data is denormalized to the database for quick access



### Webhook Flow Diagram


Sources: [app/api/stripe/webhooks/route.ts1-49](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/stripe/webhooks/route.ts#L1-L49) [actions/stripe/webhook-actions.ts28-221](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L28-L221) [lib/stripe/webhooks.ts98-158](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/stripe/webhooks.ts#L98-L158)

### Key Webhook Events

The system processes the following important Stripe event types:

Event Type| Purpose  
---|---  
checkout.session.completed| Initial subscription created  
customer.subscription.created| New subscription activation  
customer.subscription.updated| Plan changes or renewals  
customer.subscription.deleted| Subscription cancellation  
invoice.paid| Successful renewal payment  
invoice.payment_failed| Failed payment handling  
  
When an invoice payment succeeds for a subscription renewal, the system automatically resets the user's usage quota for the new billing period.

Sources: [lib/stripe/webhooks.ts13-34](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/stripe/webhooks.ts#L13-L34) [actions/stripe/webhook-actions.ts140-190](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L140-L190)

## Subscription Data Management

### Data Storage Strategy

The subscription system follows a dual-storage approach:

  1. **Primary Source of Truth** : Redis KV store

     * Stores customer subscription data in a fast, reliable cache
     * Accessed using customer ID and user ID mapping keys
  2. **Secondary/Denormalized** : Database

     * User profiles are updated with membership status and subscription ID
     * Provides quick access for permission checks without Redis lookups




Sources: [actions/stripe/webhook-actions.ts75-105](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L75-L105) [actions/stripe/checkout-actions.ts68-106](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/checkout-actions.ts#L68-L106)

## Usage Quotas and Enforcement

The subscription system enforces usage limits based on a user's subscription plan:

  1. **Document Quotas** : Each plan has a maximum number of documents that can be processed per billing period
  2. **Batch Processing** : Plus and Growth plans enable batch processing with different size limits
  3. **Data Retention** : Different retention periods for processed documents based on plan tier



### Quota Reset Process

When a subscription renews (detected via the `invoice.payment_succeeded` webhook event):

  1. The system extracts the billing period dates from Stripe
  2. A new usage record is created with these precise start and end dates
  3. The document quota limit is set based on the plan
  4. The usage counter is reset to 0




Sources: [actions/stripe/webhook-actions.ts140-190](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L140-L190) [lib/config/subscription-plans.ts103-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L103-L121)

## Client Integration

The frontend interacts with the subscription system through:

  1. Server actions for creating checkout and billing portal sessions
  2. UI components that display subscription status and options
  3. Route protection middleware for subscription-level feature access



### Subscription-Based Access Control

The application checks subscription status before allowing access to premium features:


Sources: [middleware.ts7-61](https://github.com/moemoe9876/my-app/blob/b1f77c9f/middleware.ts#L7-L61) [lib/config/subscription-plans.ts105-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L105-L121)

## Subscription System Integration

The subscription system integrates with other systems in the application:

  1. **User Management** : Links user profiles to Stripe customer IDs
  2. **Document Processing** : Enforces quotas on document uploads and processing
  3. **Analytics** : Tracks subscription events and usage patterns
  4. **Settings UI** : Provides interfaces for subscription management



Sources: [actions/stripe/webhook-actions.ts7-8](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L7-L8) [lib/config/subscription-plans.ts105-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L105-L121)

### On this page

  * Subscription System
  * Overview
  * Subscription Plans
  * Plan Structure Diagram
  * Stripe Integration
  * Checkout Process
  * Billing Portal
  * Webhook Processing
  * Webhook Flow Diagram
  * Key Webhook Events
  * Subscription Data Management
  * Data Storage Strategy
  * Usage Quotas and Enforcement
  * Quota Reset Process
  * Client Integration
  * Subscription-Based Access Control
  * Subscription System Integration




---

# Analytics

URL: https://deepwiki.com/moemoe9876/my-app/6-analytics


# Analytics

Relevant source files

The following files were used as context for generating this wiki page:

  * [app/(dashboard)/dashboard/metrics/page.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx)/dashboard/metrics/page.tsx)
  * [lib/analytics/server.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/analytics/server.ts)
  * [todo/dashboard-ui.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/todo/dashboard-ui.md)
  * [todo/extractions-plan.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/todo/extractions-plan.md)
  * [todo/metrics-ui.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/todo/metrics-ui.md)



This document describes the analytics implementation in the IngestIO application, covering both the client and server-side tracking architecture and the metrics visualization system. The analytics system provides insights into document processing performance, user behavior, and system utilization.

For information about specific user actions and detailed logging, see [Server Actions](/moemoe9876/my-app/8-server-actions).

## 1\. Analytics Architecture Overview

The IngestIO analytics system consists of two main components:

  1. **Event Tracking** : Implemented using PostHog to capture user actions and system events.
  2. **Metrics Visualization** : A dedicated dashboard that displays processing statistics and usage data.




Sources: [lib/analytics/server.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/analytics/server.ts) [app/(dashboard)/dashboard/metrics/page.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx)

## 2\. Server-Side Analytics Implementation

The server-side analytics implementation uses the PostHog Node.js client to track events that occur on the server, such as document processing events, AI extraction operations, and user subscription changes.

### 2.1 PostHog Client Setup

A singleton pattern is used to initialize and manage the PostHog client instance:


The client is initialized with configuration from environment variables:

  * `NEXT_PUBLIC_POSTHOG_KEY`: API key for PostHog
  * `NEXT_PUBLIC_POSTHOG_HOST`: PostHog host URL



Sources: [lib/analytics/server.ts5-29](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/analytics/server.ts#L5-L29)

### 2.2 Event Tracking Functions

The server-side analytics implementation provides two main functions:

  1. **`trackServerEvent`** : Records events with optional properties
  2. **`identifyServerUser`** : Identifies users and sets their properties




Sources: [lib/analytics/server.ts49-82](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/analytics/server.ts#L49-L82)

## 3\. Metrics Collection and Visualization

The metrics system provides detailed insights into document processing performance, usage patterns, and system health. These metrics are displayed in a dedicated dashboard.

### 3.1 Metrics Data Flow


Sources: [app/(dashboard)/dashboard/metrics/page.tsx137-147](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L137-L147)

### 3.2 Key Metrics Tracked

The system tracks several key metrics:

Metric Category| Metrics| Description  
---|---|---  
Document Metrics| Total Documents| Number of documents processed  
| Success Rate| Percentage of successful document processing  
| Average Processing Time| Average time to process a document  
Usage Metrics| Pages Processed| Number of pages processed in current billing cycle  
| Pages Limit| Maximum pages allowed by subscription  
| Usage Percentage| Percentage of quota used  
Distribution Metrics| Status Distribution| Breakdown of document processing statuses  
| Document Type Distribution| Breakdown of processed document types  
Error Metrics| Top Errors| Most common processing errors  
  
Sources: [app/(dashboard)/dashboard/metrics/page.tsx245-290](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L245-L290)

## 4\. Metrics Dashboard Implementation

The metrics dashboard (`/dashboard/metrics`) provides a visual representation of the collected metrics.

### 4.1 Dashboard Components


Sources: [app/(dashboard)/dashboard/metrics/page.tsx118-304](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L118-L304)

### 4.2 Data Fetching and Refresh

The dashboard uses SWR (Stale-While-Revalidate) for data fetching with the following properties:

  * Auto-refreshes every 5 seconds
  * Revalidates on focus
  * Provides loading states
  * Handles errors gracefully




Sources: [app/(dashboard)/dashboard/metrics/page.tsx132-162](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L132-L162)

### 4.3 Charts and Visualizations

The dashboard uses Recharts for data visualization with the following chart types:

  1. **Area Chart** : For processing volume over time
  2. **Pie/Bar Chart** : For document type distribution
  3. **Radial Bar Chart** : For status distribution
  4. **Scrollable List** : For error reporting



Sources: [app/(dashboard)/dashboard/metrics/page.tsx504-545](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L504-L545) [app/(dashboard)/dashboard/metrics/page.tsx564-666](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L564-L666) [app/(dashboard)/dashboard/metrics/page.tsx691-748](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L691-L748) [app/(dashboard)/dashboard/metrics/page.tsx767-820](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L767-L820)

## 5\. Analytics Events

The system tracks various events related to document processing and user interactions.

### 5.1 Document Processing Events

Event Name| Triggered When| Properties  
---|---|---  
`document_uploaded`| User uploads a document| `documentId`, `fileSize`, `mimeType`  
`extraction_started`| AI extraction begins| `documentId`, `extractorType`  
`extraction_completed`| AI extraction completes| `documentId`, `processingTime`, `success`  
`extraction_failed`| AI extraction fails| `documentId`, `errorMessage`  
`document_reviewed`| User reviews extracted data| `documentId`, `timeToReview`  
  
### 5.2 User Account Events

Event Name| Triggered When| Properties  
---|---|---  
`user_registered`| New user registration| `userId`, `plan`  
`subscription_changed`| User changes subscription| `userId`, `oldPlan`, `newPlan`  
`quota_exceeded`| User exceeds usage quota| `userId`, `attemptedAction`  
  
Sources: [lib/analytics/server.ts49-64](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/analytics/server.ts#L49-L64)

## 6\. Data Export

The metrics dashboard allows exporting metrics data in CSV format, containing:

  * Key performance indicators
  * Document type distribution
  * Status distribution
  * Processing volume over time
  * Top errors



The export function formats the data and creates a downloadable CSV file.


Sources: [app/(dashboard)/dashboard/metrics/page.tsx242-300](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L242-L300)

## 7\. Implementation Considerations

### 7.1 Privacy and Data Protection

The analytics system is designed with privacy in mind:

  * No personally identifiable information is tracked by default
  * User IDs are used as distinct IDs rather than personal information
  * Event properties are carefully selected to avoid capturing sensitive data



### 7.2 Performance Impact

The analytics implementation minimizes performance impact by:

  * Using a server-side singleton pattern for the PostHog client
  * Implementing error handling to prevent analytics failures from affecting core functionality
  * Setting reasonable flush intervals to balance timely data with performance



Sources: [lib/analytics/server.ts18-26](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/analytics/server.ts#L18-L26)

### On this page

  * Analytics
  * 1\. Analytics Architecture Overview
  * 2\. Server-Side Analytics Implementation
  * 2.1 PostHog Client Setup
  * 2.2 Event Tracking Functions
  * 3\. Metrics Collection and Visualization
  * 3.1 Metrics Data Flow
  * 3.2 Key Metrics Tracked
  * 4\. Metrics Dashboard Implementation
  * 4.1 Dashboard Components
  * 4.2 Data Fetching and Refresh
  * 4.3 Charts and Visualizations
  * 5\. Analytics Events
  * 5.1 Document Processing Events
  * 5.2 User Account Events
  * 6\. Data Export
  * 7\. Implementation Considerations
  * 7.1 Privacy and Data Protection
  * 7.2 Performance Impact




---

# User Interface

URL: https://deepwiki.com/moemoe9876/my-app/7-user-interface


# User Interface

Relevant source files

The following files were used as context for generating this wiki page:

  * [app/(auth)/layout.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(auth\)/layout.tsx)/layout.tsx)
  * [app/(marketing)/layout.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/layout.tsx)/layout.tsx)
  * [components/layout/header.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx)
  * [components/ui/alert-dialog.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/alert-dialog.tsx)
  * [components/ui/calendar.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/calendar.tsx)
  * [components/ui/command.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/command.tsx)
  * [components/ui/form.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/form.tsx)
  * [components/ui/pagination.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/pagination.tsx)
  * [components/ui/toggle.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/toggle.tsx)
  * [components/utilities/tailwind-indicator.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/tailwind-indicator.tsx)
  * [next.config.mjs](https://github.com/moemoe9876/my-app/blob/b1f77c9f/next.config.mjs)



This document provides an overview of the IngestIO application's user interface architecture, components, and design patterns. It covers the organization of UI components, layouts, and user flows across the application. For information about specific functional areas, see the related pages on [Dashboard](/moemoe9876/my-app/7.1-dashboard), [Document History](/moemoe9876/my-app/7.2-document-history), Settings Page, and [Marketing Pages](/moemoe9876/my-app/7.4-marketing-pages).

## UI Architecture Overview

The IngestIO application follows a modern component-based UI architecture built on Next.js using the App Router pattern. The interface is organized into distinct layout areas with specialized components for different functional contexts.


Sources:

  * [app/(marketing)/layout.tsx5-22](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/layout.tsx#L5-L22)
  * [app/(auth)/layout.tsx15-32](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(auth\)/layout.tsx#L15-L32)
  * [components/layout/header.tsx26-244](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx#L26-L244)



## Layout Structure

The application uses three primary layout contexts to organize the user experience:

  1. **Marketing Layout** \- Used for public-facing pages with a focused, conversion-oriented design
  2. **Auth Layout** \- Provides a centered, minimal design for authentication flows
  3. **Dashboard Layout** \- The primary interface for authenticated users with full application functionality



Each layout provides a consistent structure and navigation appropriate to its context while using shared UI components.


Sources:

  * [app/(marketing)/layout.tsx5-22](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/layout.tsx#L5-L22)
  * [app/(auth)/layout.tsx15-32](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(auth\)/layout.tsx#L15-L32)



## UI Component System

IngestIO uses a comprehensive UI component system for consistent design and behavior across the application. These components are built using a combination of Radix UI primitives and custom styling with Tailwind CSS.

### Core UI Components

Component Type| Description| Key Files  
---|---|---  
Dialogs| Modal interfaces for focused tasks| [components/ui/alert-dialog.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/alert-dialog.tsx)  
Forms| Input components with validation| [components/ui/form.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/form.tsx)  
Navigation| Menus, pagination, etc.| [components/ui/pagination.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/pagination.tsx)  
Data Visualization| Charts, tables, and data displays| [components/ui/calendar.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/calendar.tsx)  
Command Palette| Keyboard-driven interface for quick actions| [components/ui/command.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/command.tsx)  
Toggle Controls| Switches, buttons, and interactive elements| [components/ui/toggle.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/toggle.tsx)  
  
Sources:

  * [components/ui/alert-dialog.tsx9-157](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/alert-dialog.tsx#L9-L157)
  * [components/ui/form.tsx19-167](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/form.tsx#L19-L167)
  * [components/ui/pagination.tsx11-122](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/pagination.tsx#L11-L122)
  * [components/ui/calendar.tsx10-75](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/calendar.tsx#L10-L75)
  * [components/ui/command.tsx16-177](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/command.tsx#L16-L177)
  * [components/ui/toggle.tsx31-45](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/toggle.tsx#L31-L45)



## UI Flow and User Navigation

The application's interface is designed around a logical flow through different functional areas, with clear navigation paths between related sections.


Sources:

  * [components/layout/header.tsx19-24](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx#L19-L24)
  * [components/layout/header.tsx146-148](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx#L146-L148)



## Header Component

The application includes a responsive header component that adapts to both marketing and authenticated contexts. The header provides navigation, theme switching, authentication controls, and responsive mobile menu functionality.

Key features:

  * Responsive design with mobile-friendly menu
  * Theme switching between light and dark modes
  * Context-aware navigation options
  * User profile menu when authenticated
  * Scroll-aware styling and active section highlighting



Sources:

  * [components/layout/header.tsx26-244](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx#L26-L244)



## UI Component Patterns

IngestIO implements several consistent UI patterns throughout the application:

### Form Handling

The form system provides a structured approach to user input with:

  * Consistent validation
  * Error messaging
  * Accessible form controls
  * Integrated with React Hook Form




Sources:

  * [components/ui/form.tsx19-167](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/form.tsx#L19-L167)



### Dialog System

The application uses a consistent dialog system for focused interactions:

  * Modal dialogs for important actions
  * Alert dialogs for confirmations
  * Command palette for quick access to functionality



Sources:

  * [components/ui/alert-dialog.tsx9-157](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/alert-dialog.tsx#L9-L157)
  * [components/ui/command.tsx16-177](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/command.tsx#L16-L177)



### Pagination Pattern

For data-heavy interfaces, the application implements a pagination component that provides:

  * Navigation between pages of content
  * Indicators for current position
  * Responsive design for different screen sizes



Sources:

  * [components/ui/pagination.tsx11-122](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/pagination.tsx#L11-L122)



## Theming and Styling

The application supports both light and dark themes using the `next-themes` package. UI components use a consistent design language with:

  * Tailwind CSS for styling
  * CSS variables for theming
  * Consistent spacing and typography
  * Responsive design principles



The application uses the `cn` utility function to conditionally merge class names for dynamic styling.

Sources:

  * [components/layout/header.tsx30](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx#L30-L30)
  * [components/layout/header.tsx130-134](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx#L130-L134)



## Responsive Design

All UI components are built with responsive design in mind:

  * Mobile-first approach
  * Responsive layouts using Flexbox and Grid
  * Conditional rendering for different screen sizes
  * Touch-friendly interactions for mobile devices



The header component demonstrates this pattern with a completely different navigation experience on mobile vs. desktop screens.

Sources:

  * [components/layout/header.tsx87-108](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx#L87-L108) (Desktop navigation)
  * [components/layout/header.tsx172-241](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx#L172-L241) (Mobile menu)



## Accessibility Considerations

The UI components are built with accessibility in mind:

  * ARIA attributes for screen readers
  * Keyboard navigation support
  * Focus management
  * Sufficient color contrast
  * Proper HTML semantics



Sources:

  * [components/ui/form.tsx107-123](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/form.tsx#L107-L123)
  * [components/ui/pagination.tsx73-82](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/pagination.tsx#L73-L82)



## External Integrations

The UI is configured to work with several external services:

  * Clerk for authentication UI components
  * PostHog for analytics tracking
  * Image optimization for profile pictures and assets from remote sources



Sources:

  * [next.config.mjs8-15](https://github.com/moemoe9876/my-app/blob/b1f77c9f/next.config.mjs#L8-L15)
  * [next.config.mjs20-34](https://github.com/moemoe9876/my-app/blob/b1f77c9f/next.config.mjs#L20-L34)



### On this page

  * User Interface
  * UI Architecture Overview
  * Layout Structure
  * UI Component System
  * Core UI Components
  * UI Flow and User Navigation
  * Header Component
  * UI Component Patterns
  * Form Handling
  * Dialog System
  * Pagination Pattern
  * Theming and Styling
  * Responsive Design
  * Accessibility Considerations
  * External Integrations




---

# Dashboard

URL: https://deepwiki.com/moemoe9876/my-app/7.1-dashboard


# Dashboard

Relevant source files

The following files were used as context for generating this wiki page:

  * [app/(dashboard)/dashboard/metrics/page.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx)/dashboard/metrics/page.tsx)



The Dashboard is the central command center of IngestIO, providing users access to document processing features, analytics, and account management functions. This page describes the dashboard's structure, components, and how they integrate with the underlying systems.

For information about specific dashboard sections like the Metrics page, see [Metrics](/moemoe9876/my-app/6-analytics) or [Document History](/moemoe9876/my-app/7.2-document-history).

## Overview

The Dashboard serves as the primary interface for authenticated users after login. It provides a unified access point to all core application features including document upload, review, processing history, settings management, and performance metrics.


Sources: Application Architecture diagram, Core Systems Diagram

## Dashboard Architecture

The Dashboard uses Next.js App Router architecture and Server Components. It serves as an integration point between the user interface and various backend services.


Sources: Application Architecture diagram

## Dashboard Layout and Components

The Dashboard interface is composed of multiple components organized in a user-friendly layout:

  1. **Main Dashboard View** \- Provides a summary of key information and quick access to all features
  2. **Document Management Components** : 
     * Upload: Interface for submitting new documents for processing
     * Review: Interface for examining and editing extracted data
     * History: Log of all processed documents
  3. **Account Components** : 
     * Settings: User profile and subscription management
     * Metrics: Analytics dashboard for usage and performance tracking



Each component is designed as a separate page within the dashboard route group, following Next.js App Router conventions.

Sources: Core Systems Diagram, Application Architecture diagram

## Dashboard Data Flow

The Dashboard relies on various server actions to fetch and display data:


Sources: Document Processing Workflow, [app/(dashboard)/dashboard/metrics/page.tsx137-147](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L137-L147)

## Metrics Integration

The Dashboard includes a comprehensive metrics section that provides analytics on document processing:

  1. **KPI Cards** \- Display summary statistics like total documents processed, average processing time, and success rate
  2. **Usage Tracking** \- Monitors current billing cycle consumption against the user's quota
  3. **Data Visualizations** \- Charts showing processing volume, document types, and status distribution



The metrics component fetches data using the `fetchUserMetricsAction` server action and utilizes Recharts for visualization.

Sources: [app/(dashboard)/dashboard/metrics/page.tsx1-829](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L1-L829)

## Navigation and User Flow

The Dashboard implements an intuitive navigation structure that guides users through the document processing workflow:


Sources: Core Systems Diagram, Application Architecture diagram

## Usage Quota Management

The Dashboard shows users their current subscription status and usage metrics:

Component| Description| Implementation  
---|---|---  
Usage Bar| Visual representation of pages used vs. pages limit| Progress component  
Percentage| Percentage of quota used| Text display  
Remaining Pages| Number of pages left in current billing cycle| Calculated value  
Days Left| Days remaining in billing period| Calculated from billing end date  
  
The usage data is fetched as part of the metrics data and displayed prominently to help users monitor their consumption.

Sources: [app/(dashboard)/dashboard/metrics/page.tsx422-478](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L422-L478)

## Dashboard Integration with Backend Services

The Dashboard integrates with multiple backend services to provide its functionality:

  1. **User Management** \- Authenticates users via Clerk and fetches profile data from Supabase
  2. **Document Processing** \- Connects to the AI Extraction Service and Document Processing systems
  3. **Subscription Management** \- Interfaces with Stripe for billing information
  4. **Analytics** \- Retrieves and displays metrics data from the Analytics Service



This integration is primarily achieved through server actions that encapsulate the business logic for interacting with these services.

Sources: Core Systems Diagram, User and Subscription Management diagram

## Error Handling and State Management

The Dashboard implements robust error handling for various operations:

  1. **Loading States** \- Uses skeleton loaders to indicate when data is being fetched
  2. **Error Alerts** \- Displays error messages when operations fail
  3. **Empty States** \- Shows appropriate messages when no data is available



The metrics component, for example, uses the `isLoading` state to display skeletons while fetching data and handles error cases by showing alert components.

Sources: [app/(dashboard)/dashboard/metrics/page.tsx129-171](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L129-L171) [app/(dashboard)/dashboard/metrics/page.tsx349-355](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L349-L355)

### On this page

  * Dashboard
  * Overview
  * Dashboard Architecture
  * Dashboard Layout and Components
  * Dashboard Data Flow
  * Metrics Integration
  * Navigation and User Flow
  * Usage Quota Management
  * Dashboard Integration with Backend Services
  * Error Handling and State Management




---

# Document History

URL: https://deepwiki.com/moemoe9876/my-app/7.2-document-history


# Document History

Relevant source files

The following files were used as context for generating this wiki page:

  * [actions/db/metrics-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/metrics-actions.ts)
  * [app/(dashboard)/dashboard/history/page.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx)/dashboard/history/page.tsx)
  * [components/ui/charts.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/ui/charts.tsx)



## Overview and Purpose

The Document History system provides users with a comprehensive view of all documents they have uploaded and processed through the IngestIO application. Its primary purpose is to enable users to track, manage, and access their document processing history in a user-friendly interface. Users can view document statuses, filter by various criteria, search for specific files, and perform actions like viewing details or deleting documents.

For information about the document processing pipeline, see [Document Processing](/moemoe9876/my-app/3-document-processing).

Sources: [app/(dashboard)/dashboard/history/page.tsx115-557](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L115-L557)

## Feature Summary

The Document History page offers the following key features:

  * **Document Timeline View** : Chronologically organized documents grouped by time periods (Today, Yesterday, This Week, etc.)
  * **Recent Documents** : Quick access to recently processed documents
  * **Filtering Capabilities** : Filter documents by status, type, and other criteria
  * **Search Functionality** : Search for documents by filename
  * **Document Details** : View document previews and extracted data
  * **Document Actions** : Options to view details, download, or delete documents
  * **Status Tracking** : Visual indicators of document processing status



Sources: [app/(dashboard)/dashboard/history/page.tsx115-178](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L115-L178) [app/(dashboard)/dashboard/history/page.tsx298-514](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L298-L514)

## System Architecture

The Document History system follows a client-side rendering approach with server actions for data fetching. Below is an architectural diagram showing the main components and their interactions:


Sources: [app/(dashboard)/dashboard/history/page.tsx5-8](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L5-L8) [app/(dashboard)/dashboard/history/page.tsx115-178](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L115-L178)

## Data Flow

The following diagram illustrates how data flows through the Document History system:


Sources: [app/(dashboard)/dashboard/history/page.tsx145-196](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L145-L196) [app/(dashboard)/dashboard/history/page.tsx275-287](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L275-L287) [app/(dashboard)/dashboard/history/page.tsx264-273](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L264-L273)

## User Interface Components

The Document History UI consists of several key components organized in a hierarchical structure:


Sources: [app/(dashboard)/dashboard/history/page.tsx298-556](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L298-L556) [app/(dashboard)/dashboard/history/page.tsx560-775](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L560-L775)

### User Interface Layout

The Document History page layout follows a logical structure:

  1. **Header Section** :

     * Title ("Document History")
     * Search bar for finding documents
     * Filter button with dropdown options
     * Refresh button
     * Upload button linking to the document upload page
  2. **Recent Documents Grid** (conditionally displayed):

     * Shows up to 4 recently processed documents
     * Displays document name, status, and date
     * Allows quick access to document details
  3. **Document Status Tabs** :

     * Tabs for filtering by document status (All, Completed, Processing, Failed, Uploaded)
     * Changes the list below to show only documents with the selected status
  4. **Document List** :

     * Documents grouped by time periods
     * Each document shows filename, status, file size, and upload date
     * Action buttons for viewing details and other operations
  5. **Document Detail Sheet** (slide-in panel):

     * Document preview
     * JSON view of extracted data
     * Document metadata



Sources: [app/(dashboard)/dashboard/history/page.tsx298-556](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L298-L556)

## Key Components Implementation

### HistoryPage Component

The main component that manages the state and orchestrates the other components:

  * Handles fetching document data via server actions
  * Manages filtering, sorting, and searching
  * Implements UI state for dialogs, sheets, and loading states
  * Renders the Recent Documents grid, Tabs, and Document List



Sources: [app/(dashboard)/dashboard/history/page.tsx115-557](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L115-L557)

### DocumentList Component

A child component that renders the list of documents grouped by time periods:

  * Takes grouped documents as input from the parent
  * Renders time period headers with document counts
  * Displays individual document items with their metadata and action buttons
  * Implements empty state when no documents match the filters



Sources: [app/(dashboard)/dashboard/history/page.tsx560-775](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L560-L775)

## State Management

The Document History page manages several types of state:

### Data State
    
    
    - allDocuments: All documents fetched from the server
    - recentDocuments: Recently processed documents
    - filteredGroupedDocs: Documents filtered and grouped by time period
    - totalCount: Total number of documents
    - selectedDocumentDetail: Details of the currently selected document
    

### UI State
    
    
    - activeTab: Currently selected status tab
    - searchTerm: Current search query
    - statusFilter: Selected status filter
    - typeFilter: Selected document type filter
    - sortBy: Field to sort documents by
    - sortOrder: Sort direction (ascending/descending)
    - isLoading: Loading state for main document list
    - isDetailLoading: Loading state for document details
    - isDeleting: Loading state for document deletion
    - showFilterDialog: Whether the filter dialog is displayed
    - isSheetOpen: Whether the document detail sheet is open
    

Sources: [app/(dashboard)/dashboard/history/page.tsx117-142](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L117-L142)

## Document Filtering and Grouping

The system implements sophisticated filtering and grouping logic:

  1. **Server-Side Filtering** :

     * Search term filtering
     * Status filtering
     * Sorting (by date, name, or status)
  2. **Client-Side Filtering** :

     * Document type filtering
     * Tab-based status filtering
  3. **Time-Based Grouping** :

     * Documents are grouped into time periods: 
       * Today
       * Yesterday
       * This Week
       * This Month
       * Month-year groups for older documents



This approach optimizes the user experience by fetching all documents in a single request and then applying additional filtering client-side for responsive interactions.

Sources: [app/(dashboard)/dashboard/history/page.tsx145-196](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L145-L196) [app/(dashboard)/dashboard/history/page.tsx202-235](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L202-L235) [app/(dashboard)/dashboard/history/page.tsx53-59](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L53-L59)

## Document Status Management

The system tracks document status through visual indicators and filters:

Status| Visual Indicator| Description  
---|---|---  
Completed| Green checkmark| Document processing completed successfully  
Processing| Blue spinning loader| Document is currently being processed  
Failed| Red alert icon| Document processing failed  
Uploaded| Yellow clock icon| Document uploaded but processing not started  
  
Each status has appropriate styling and color coding to provide visual cues to users about document states.

Sources: [app/(dashboard)/dashboard/history/page.tsx92-101](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L92-L101) [app/(dashboard)/dashboard/history/page.tsx104-111](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L104-L111)

## Date Formatting and Presentation

The system implements smart date formatting for better readability:

  * **Smart Date Format** : Displays relative dates when recent ("Today at 2:30 PM", "Yesterday at 10:15 AM")
  * **Time Grouping** : Groups documents by time periods for organizational clarity
  * **Detailed Date Display** : Shows full date information on hover for precision



Implementation examples:


Sources: [app/(dashboard)/dashboard/history/page.tsx53-71](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L53-L71)

## Document Detail View

When a user selects a document, a detail sheet slides in from the side with:

  1. **Document Preview** : A rendered view of the document (PDF/image)
  2. **Extracted Data** : JSON representation of the AI-extracted data
  3. **Metadata** : Document information like ID, filename, etc.



This allows users to verify the extraction results against the original document.

Sources: [app/(dashboard)/dashboard/history/page.tsx517-552](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L517-L552)

## Performance Optimizations

The Document History page implements several optimizations for better performance:

  1. **Debounced Search** : Search is debounced to prevent excessive server requests while typing
  2. **Client-Side Filtering** : Some filtering happens client-side to avoid server roundtrips
  3. **Memoization** : The `useMemo` hook is used to optimize computationally expensive operations
  4. **Pagination Support** : The backend supports pagination, though the UI fetches all documents for client-side filtering
  5. **Parallel Data Fetching** : Main documents and recent documents are fetched in parallel



Sources: [app/(dashboard)/dashboard/history/page.tsx142](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L142-L142) [app/(dashboard)/dashboard/history/page.tsx167-170](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L167-L170) [app/(dashboard)/dashboard/history/page.tsx579-596](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L579-L596)

## Animation and User Experience

The Document History page uses Framer Motion for smooth animations:

  * Page fade-in animation when loaded
  * Item appearance animations when documents are filtered
  * Hover effects for interactive elements
  * Loading states with appropriate visual feedback



These animations provide visual feedback and improve the perceived performance of the application.

Sources: [app/(dashboard)/dashboard/history/page.tsx300-305](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L300-L305) [app/(dashboard)/dashboard/history/page.tsx649-666](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L649-L666)

## Integration with Other Systems

The Document History system integrates with several other components of the IngestIO application:


### Key Integration Points:

  1. **Document Upload System** : The Document History page links to the upload page
  2. **Document Processing** : Shows status and results from document processing
  3. **AI Extraction** : Displays the structured data extracted by the AI service
  4. **Document Storage** : Retrieves and displays stored documents



Sources: [app/(dashboard)/dashboard/history/page.tsx438-442](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L438-L442) [app/(dashboard)/dashboard/history/page.tsx517-552](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L517-L552)

## Error Handling

The Document History system implements robust error handling:

  1. **Fetch Errors** : Handles and displays errors when fetching documents fails
  2. **Empty States** : Shows appropriate UI when no documents match filters
  3. **Loading States** : Provides visual feedback during loading operations
  4. **Action Errors** : Displays toast notifications for failures in actions like deletion
  5. **Fallbacks** : Implements fallback UI for missing data or failed operations



Sources: [app/(dashboard)/dashboard/history/page.tsx187-194](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L187-L194) [app/(dashboard)/dashboard/history/page.tsx598-642](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L598-L642) [app/(dashboard)/dashboard/history/page.tsx524-549](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/history/page.tsx#L524-L549)

## Conclusion

The Document History system is a central component of the IngestIO application, providing users with a comprehensive view of their document processing activities. It combines sophisticated filtering and searching capabilities with a user-friendly interface to help users track, manage, and review their documents efficiently.

### On this page

  * Document History
  * Overview and Purpose
  * Feature Summary
  * System Architecture
  * Data Flow
  * User Interface Components
  * User Interface Layout
  * Key Components Implementation
  * HistoryPage Component
  * DocumentList Component
  * State Management
  * Data State
  * UI State
  * Document Filtering and Grouping
  * Document Status Management
  * Date Formatting and Presentation
  * Document Detail View
  * Performance Optimizations
  * Animation and User Experience
  * Integration with Other Systems
  * Key Integration Points:
  * Error Handling
  * Conclusion




---

# Marketing Pages

URL: https://deepwiki.com/moemoe9876/my-app/7.4-marketing-pages


# Marketing Pages

Relevant source files

The following files were used as context for generating this wiki page:

  * [app/(auth)/layout.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(auth\)/layout.tsx)/layout.tsx)
  * [app/(marketing)/layout.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/layout.tsx)/layout.tsx)
  * [app/(marketing)/page.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx)/page.tsx)
  * [app/api/stripe/webhooks/route-segment.config.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/stripe/webhooks/route-segment.config.ts)
  * [components/layout/header.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx)
  * [components/utilities/tailwind-indicator.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/tailwind-indicator.tsx)
  * [next.config.mjs](https://github.com/moemoe9876/my-app/blob/b1f77c9f/next.config.mjs)



The Marketing Pages subsystem comprises the public-facing components of the IngestIO application, designed to showcase the product's features, pricing, and value proposition to prospective users. This document explains the architecture, components, and implementation of these pages.

For information about the authenticated dashboard interface, see [Dashboard](/moemoe9876/my-app/7.1-dashboard).

## Overview

The marketing pages serve as the entry point for new users and include sections for product features, testimonials, pricing, and call-to-action elements. They are implemented using Next.js App Router and utilize a separate route group `(marketing)` to maintain clear separation from authenticated application routes.


Sources: [app/(marketing)/page.tsx1-142](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L1-L142) [app/(marketing)/layout.tsx1-22](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/layout.tsx#L1-L22)

## Architecture and Implementation

### Route Structure

The marketing pages are organized using Next.js route groups, with the main landing page implemented as a client component to enable rich interactivity.


Sources: [app/(marketing)/page.tsx1-40](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L1-L40) [app/(marketing)/layout.tsx1-22](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/layout.tsx#L1-L22)

### Marketing Layout

The marketing layout is a server component that provides a consistent structure for all marketing pages, including a footer with copyright information.


Sources: [app/(marketing)/layout.tsx5-22](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/layout.tsx#L5-L22)

### Components

#### Header Component

The header component (`Header`) is a client component used in the marketing pages that provides navigation links, authentication status, and theme switching functionality.


Sources: [components/layout/header.tsx26-244](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx#L26-L244)

## Landing Page Implementation

The landing page (`app/(marketing)/page.tsx`) is the main marketing page and is implemented as a client component to enable rich interactivity, animations, and responsive behavior.

### Page Structure

The landing page is divided into several sections:

  1. **Hero Section** : Introduces the product with a headline, subheadline, and call-to-action buttons
  2. **Features Section** : Showcases the product's features with tabs and detailed information
  3. **How It Works Section** : Explains the product's workflow in three steps
  4. **Testimonials Section** : Displays customer testimonials (implied by refs in the code)
  5. **Pricing Section** : Shows pricing plans and options (implied by refs in the code)




Sources: [app/(marketing)/page.tsx147-362](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L147-L362) [app/(marketing)/page.tsx365-749](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L365-L749) [app/(marketing)/page.tsx752-813](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L752-L813)

### Animation and Interactivity

The landing page uses Framer Motion for animations and several interactive elements:

  1. **Scroll-based effects** : The header changes appearance when scrolling
  2. **Parallax effects** : Elements move subtly based on mouse position
  3. **Animated section transitions** : Elements animate into view as they become visible
  4. **Interactive tabs** : Features section uses tabs for content organization
  5. **Hover cards** : Feature cards have enhanced hover interactions




Sources: [app/(marketing)/page.tsx57-84](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L57-L84) [app/(marketing)/page.tsx87-99](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L87-L99) [app/(marketing)/page.tsx169-278](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L169-L278)

### Key Functional Components

#### Authentication Integration

The landing page integrates with Clerk for authentication and displays different UI elements based on the user's authentication status.


Sources: [app/(marketing)/page.tsx51-54](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L51-L54) [app/(marketing)/page.tsx219-226](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L219-L226)

#### Plan Selection and Checkout

The landing page includes functionality for plan selection and checkout through Stripe integration:


Sources: [app/(marketing)/page.tsx102-140](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L102-L140)

## Responsive Design

The marketing pages implement responsive design to ensure optimal user experience across different device sizes:

  1. **Responsive layout** : Different grid layouts for various screen sizes
  2. **Mobile menu** : Collapsible menu for small screens
  3. **Responsive images** : Images that adapt to container sizes
  4. **Tailored component positioning** : Components reorder based on screen size



Sources: [app/(marketing)/page.tsx168-311](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L168-L311) [components/layout/header.tsx172-241](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx#L172-L241)

## Integration with Other Systems

The marketing pages integrate with several other systems in the application:

  1. **Authentication system** : Integration with Clerk for user authentication
  2. **Subscription system** : Integration with Stripe for subscription management
  3. **Dashboard** : Links to the dashboard for authenticated users
  4. **Theme system** : Integration with next-themes for theme switching




Sources: [app/(marketing)/page.tsx102-140](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L102-L140) [app/(marketing)/page.tsx45-54](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L45-L54) [components/layout/header.tsx30-33](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/layout/header.tsx#L30-L33)

## Technical Considerations

### Server Component vs. Client Component Usage

The marketing pages use a mix of server and client components:

  * **Server components** : Layout component for static elements that don't need interactivity
  * **Client components** : Landing page and header for interactive elements, animations, and state management



This pattern optimizes for both performance and interactivity, allowing static content to be server-rendered while dynamic content is handled client-side.

Sources: [app/(marketing)/page.tsx1](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/page.tsx#L1-L1) [app/(marketing)/layout.tsx1](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(marketing\)/layout.tsx#L1-L1)

### Route API Handling

The marketing pages interact with API routes for operations like Stripe checkout session creation. The API routes are implemented in the `/api` directory and are configured specifically for each purpose, such as disabling body parsing for Stripe webhook handling.

Sources: [app/api/stripe/webhooks/route-segment.config.ts1-6](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/stripe/webhooks/route-segment.config.ts#L1-L6)

### On this page

  * Marketing Pages
  * Overview
  * Architecture and Implementation
  * Route Structure
  * Marketing Layout
  * Components
  * Header Component
  * Landing Page Implementation
  * Page Structure
  * Animation and Interactivity
  * Key Functional Components
  * Authentication Integration
  * Plan Selection and Checkout
  * Responsive Design
  * Integration with Other Systems
  * Technical Considerations
  * Server Component vs. Client Component Usage
  * Route API Handling




---

# Server Actions

URL: https://deepwiki.com/moemoe9876/my-app/8-server-actions


# Server Actions

Relevant source files

The following files were used as context for generating this wiki page:

  * [__tests__/document-actions.test.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/document-actions.test.ts)
  * [__tests__/profile-actions.test.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts)
  * [actions/ai/extraction-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts)
  * [actions/db/documents.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts)
  * [actions/db/profiles-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts)
  * [actions/db/user-usage-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts)
  * [actions/db/users-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts)
  * [actions/stripe/checkout-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/checkout-actions.ts)
  * [actions/stripe/index.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/index.ts)
  * [actions/stripe/webhook-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts)
  * [lib/ai/vertex-client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts)
  * [lib/stripe/webhooks.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/stripe/webhooks.ts)



Server Actions are a foundational component of the IngestIO application architecture, providing a secure and efficient way to execute server-side logic directly from UI components. This page documents the implementation pattern, core functionalities, and best practices for Server Actions in our codebase.

For information about the Document Processing Workflow that uses these server actions, see [Document Processing](/moemoe9876/my-app/3-document-processing).

## Overview

IngestIO uses Next.js Server Actions for secure server-side data mutations. These actions provide a standardized way to handle CRUD operations, AI processing, and subscription management with proper authentication, rate limiting, and error handling.


Sources:

  * [actions/db/documents.ts1-20](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L1-L20)
  * [actions/ai/extraction-actions.ts1-19](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L1-L19)
  * [actions/stripe/webhook-actions.ts1-5](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L1-L5)



## Core Server Action Categories

IngestIO organizes server actions into logical categories based on functionality:


Sources:

  * [actions/db/documents.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts)
  * [actions/ai/extraction-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts)
  * [actions/stripe/webhook-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts)
  * [actions/db/profiles-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts)
  * [actions/db/users-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts)
  * [actions/stripe/index.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/index.ts)



## Action Implementation Pattern

All server actions in IngestIO follow a consistent implementation pattern to ensure security, error handling, and consistent client responses.

### Server Action Declaration

Every server action file starts with the `"use server"` directive at the top, indicating that all exported functions are server actions that run on the server, never on the client.


Sources:

  * [actions/db/documents.ts1-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L1-L143)
  * [actions/ai/extraction-actions.ts1-211](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L1-L211)



### Standard Response Format

All server actions return an `ActionState<T>` object, providing a consistent response pattern:


This pattern allows client components to handle both success and error states consistently:


Sources:

  * [actions/db/documents.ts20-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L20-L143)
  * [actions/ai/extraction-actions.ts208-586](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L586)
  * [__tests__/document-actions.test.ts99-106](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/document-actions.test.ts#L99-L106)



## Authentication in Server Actions

Most server actions require authenticated users. The pattern uses the `getCurrentUser()` function to get the current user ID:


Sources:

  * [actions/db/documents.ts30-31](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L30-L31)
  * [actions/ai/extraction-actions.ts212-213](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L212-L213)
  * [actions/db/users-actions.ts56-60](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L56-L60)



## Rate Limiting and Quotas

Many server actions implement rate limiting based on user subscription tiers:


Sources:

  * [actions/db/documents.ts30-68](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L30-L68)
  * [actions/ai/extraction-actions.ts130-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L130-L201)
  * [actions/db/user-usage-actions.ts276-342](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L276-L342)



## Core Server Actions

### Document Management Actions


Sources:

  * [actions/db/documents.ts20-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L20-L143)
  * [actions/db/documents.ts149-233](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L149-L233)
  * [actions/db/documents.ts239-344](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L239-L344)
  * [actions/db/documents.ts350-427](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L350-L427)
  * [actions/db/documents.ts432-529](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L432-L529)



### AI Extraction Actions


Sources:

  * [actions/ai/extraction-actions.ts208-586](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L586)
  * [actions/ai/extraction-actions.ts591-741](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L591-L741)
  * [actions/ai/extraction-actions.ts747-809](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L747-L809)
  * [lib/ai/vertex-client.ts102-161](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts#L102-L161)



### User Management Actions


Sources:

  * [actions/db/users-actions.ts16-49](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L16-L49)
  * [actions/db/users-actions.ts56-83](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L56-L83)
  * [actions/db/users-actions.ts91-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L91-L121)
  * [actions/db/users-actions.ts129-138](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L129-L138)
  * [actions/db/users-actions.ts146-205](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L146-L205)



### Subscription Actions


Sources:

  * [actions/stripe/checkout-actions.ts22-138](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/checkout-actions.ts#L22-L138)
  * [actions/stripe/checkout-actions.ts143-199](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/checkout-actions.ts#L143-L199)
  * [actions/stripe/webhook-actions.ts28-221](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L28-L221)
  * [lib/stripe/webhooks.ts98-157](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/stripe/webhooks.ts#L98-L157)



## Testing Server Actions

Server actions are tested using Vitest with mocks for external dependencies:


Sources:

  * [__tests__/document-actions.test.ts5-68](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/document-actions.test.ts#L5-L68)
  * [__tests__/document-actions.test.ts99-206](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/document-actions.test.ts#L99-L206)
  * [__tests__/profile-actions.test.ts11-40](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts#L11-L40)



## Best Practices

When working with server actions in the IngestIO codebase, follow these best practices:

  1. **Authentication** : Always call `getCurrentUser()` at the beginning of your action
  2. **Input Validation** : Validate all inputs before processing
  3. **Consistent Returns** : Use the `ActionState<T>` pattern for all responses
  4. **Error Handling** : Always use try/catch blocks and provide meaningful error messages
  5. **Revalidation** : Use `revalidatePath()` to update UI after mutations
  6. **Security Checks** : Verify data ownership (e.g., document belongs to requesting user)
  7. **Analytics** : Track important events using `trackServerEvent()`




Sources:

  * [actions/db/documents.ts20-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L20-L143)
  * [actions/ai/extraction-actions.ts208-586](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L586)
  * [actions/stripe/webhook-actions.ts28-221](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L28-L221)



## Conclusion

Server Actions provide a powerful pattern for handling server-side logic in the IngestIO application. By following a consistent implementation approach, they ensure secure, reliable, and maintainable code for database operations, AI processing, and integration with external services.

The standardized response format, proper authentication checks, and error handling patterns make it easier for client components to interact with server-side functionality while maintaining good separation of concerns.

### On this page

  * Server Actions
  * Overview
  * Core Server Action Categories
  * Action Implementation Pattern
  * Server Action Declaration
  * Standard Response Format
  * Authentication in Server Actions
  * Rate Limiting and Quotas
  * Core Server Actions
  * Document Management Actions
  * AI Extraction Actions
  * User Management Actions
  * Subscription Actions
  * Testing Server Actions
  * Best Practices
  * Conclusion




---

# Rate Limiting and Quotas

URL: https://deepwiki.com/moemoe9876/my-app/9-rate-limiting-and-quotas


# Rate Limiting and Quotas

Relevant source files

The following files were used as context for generating this wiki page:

  * [__tests__/document-actions.test.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/document-actions.test.ts)
  * [actions/ai/extraction-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts)
  * [actions/db/documents.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts)
  * [actions/db/user-usage-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts)
  * [components/utilities/user-nav.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/user-nav.tsx)
  * [lib/ai/vertex-client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts)
  * [lib/config/subscription-plans.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts)
  * [lib/stripe/client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/stripe/client.ts)
  * [middleware.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/middleware.ts)



## Purpose and Scope

This document details the rate limiting and quota management system implemented in IngestIO. It covers how the application enforces usage limits based on subscription tiers, tracks document processing quotas, and implements API rate limiting to ensure fair system usage and prevent abuse. For information about the subscription system itself, see [Subscription System](/moemoe9876/my-app/5-subscription-system).

## Overview

IngestIO implements a multi-layered approach to usage control through rate limiting and quotas. These mechanisms serve several critical purposes:

  1. Preventing system abuse and denial-of-service attacks
  2. Ensuring fair resource allocation across users
  3. Creating a tiered service model with appropriate limits for each subscription level
  4. Protecting AI service costs by limiting excessive processing




Sources:

  * [actions/db/documents.ts45-58](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L45-L58)
  * [actions/ai/extraction-actions.ts130-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L130-L201)



## Subscription Tiers and Limits

The system offers three tiers with progressively higher limits and capabilities:

Tier| Monthly Page Quota| API Rate Limits| Batch Processing| Retention Period  
---|---|---|---|---  
Starter (Free)| 25 pages| 10 requests/minute| No (1 document max)| 30 days  
Plus ($9.99)| 250 pages| 30 requests/minute| Yes (25 documents max)| 90 days  
Growth ($19.99)| 500 pages| 60 requests/minute| Yes (100 documents max)| 365 days  
  
The subscription tier determines several types of limits:

  1. **Monthly Document Processing Quota** : Maximum number of pages that can be processed per month
  2. **API Rate Limits** : Maximum number of requests per minute
  3. **Batch Processing Capabilities** : Ability to process multiple documents at once
  4. **Data Retention Period** : How long extracted data is stored



Sources:

  * [lib/config/subscription-plans.ts1-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L1-L121)
  * [actions/ai/extraction-actions.ts147-154](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L147-L154)



## Rate Limiting Implementation

Rate limiting restricts how frequently a user can make requests to prevent API abuse and ensure system stability.


The implementation uses a Redis-based rate limiter with different limits based on:

  1. **User ID** : Limits are applied per user
  2. **Subscription Tier** : Higher tiers get higher limits
  3. **Action Type** : Different actions can have different limits (e.g., document uploads vs. AI extraction)



Sources:

  * [actions/ai/extraction-actions.ts130-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L130-L201)
  * [actions/db/documents.ts45-58](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L45-L58)



## Quota Management

Quota management tracks and enforces monthly document processing limits for each user.


Key components of the quota system:

  1. **Tracking** : Each user has a usage record for the current billing period
  2. **Verification** : Before processing, the system checks if the user has sufficient quota
  3. **Updating** : After successful processing, the usage counter is incremented
  4. **Resetting** : At the start of each billing period, usage is reset to zero



Sources:

  * [actions/db/user-usage-actions.ts17-342](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L17-L342)
  * [actions/db/documents.ts59-68](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L59-L68)



## Database Schema for Usage Tracking

The system uses database tables to track usage with the following structure:


Sources:

  * [actions/db/user-usage-actions.ts17-342](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L17-L342)



## Rate Limiting in Document Processing

Document processing is a core functionality that implements both rate limiting and quota checks:


The document upload process incorporates multiple checks:

  1. **Authentication** : Verifies the user identity
  2. **Subscription Check** : Determines the user's tier and applicable limits
  3. **Rate Limit Check** : Prevents too many uploads in a short time
  4. **Quota Check** : Ensures the user hasn't exceeded their monthly page quota
  5. **Usage Update** : Increments the usage counter after successful processing



Sources:

  * [actions/db/documents.ts20-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L20-L143)



## Rate Limiting in AI Extraction

AI extraction is resource-intensive and strictly rate-limited:


The AI extraction process has additional safeguards:

  1. **Batch Size Limits** : Different tiers have different limits on batch processing
  2. **AI-Specific Rate Limits** : More restrictive than general API limits
  3. **Failure Handling** : Tracks rate limit and quota exceeded events
  4. **Resource Tracking** : Captures metrics about AI model usage



Sources:

  * [actions/ai/extraction-actions.ts208-586](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L586)
  * [actions/ai/extraction-actions.ts130-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L130-L201)



## Implementation Details

### Rate Limit Checking

Rate limit checks are performed using the `checkRateLimit` function which takes:

  1. User ID: Identifies the user
  2. Tier: Determines applicable limits
  3. Action Type: Identifies the type of request being made


    
    
    const rateLimitResult = await checkRateLimit(userId, tier as SubscriptionTier, "document_upload")
        
    if (!rateLimitResult.success) {
      return { 
        isSuccess: false, 
        message: "Rate limit exceeded", 
        error: "429" 
      }
    }
    

Sources:

  * [actions/db/documents.ts45-58](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L45-L58)
  * [actions/ai/extraction-actions.ts249-261](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L249-L261)



### Quota Checking

Quota checks use the `checkUserQuotaAction` function, which:

  1. Retrieves the user's current usage record
  2. Compares usage against limits
  3. Determines if the requested operation can proceed


    
    
    const quotaResult = await checkUserQuotaAction(userId, pageCount)
    if (!quotaResult.isSuccess || !quotaResult.data?.hasQuota) {
      return { 
        isSuccess: false, 
        message: "Page quota exceeded", 
        error: "403" 
      }
    }
    

Sources:

  * [actions/db/documents.ts59-68](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L59-L68)
  * [actions/db/user-usage-actions.ts276-342](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L276-L342)



### Quota Tracking

After successful processing, the system increments the user's usage:
    
    
    await incrementPagesProcessedAction(userId, pageCount)
    

This updates the database record and ensures accurate tracking of usage.

Sources:

  * [actions/db/documents.ts112](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L112-L112)
  * [actions/db/user-usage-actions.ts237-271](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L237-L271)



## Development Environment Considerations

In development environments, quota checks are bypassed to facilitate testing:
    
    
    // In development environment, bypass quota check
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode detected: Bypassing quota check');
      
      // Get current usage record for tracking purposes, but don't enforce limit
      const currentUsageResult = await getCurrentUserUsageAction(userId);
      
      // If no usage record is found, still proceed
      const usage = currentUsageResult.isSuccess ? currentUsageResult.data : {
        pagesProcessed: 0,
        pagesLimit: 999999,
      } as SelectUserUsage;
      
      // Always return true in development
      return {
        isSuccess: true,
        message: `Development mode: quota check bypassed`,
        data: {
          hasQuota: true,
          remaining: 999999, // Effectively unlimited
          usage
        }
      };
    }
    

Sources:

  * [actions/db/user-usage-actions.ts286-308](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L286-L308)



## Analytics and Monitoring

The system tracks various events related to rate limiting and quotas:

  1. **Successful Operations** : Documents processed, pages extracted
  2. **Rate Limit Events** : When users hit rate limits
  3. **Quota Exceeded Events** : When users exceed their quota



This data helps in:

  * Understanding user behavior
  * Planning capacity
  * Identifying potential abuse
  * Informing pricing decisions



Sources:

  * [actions/db/documents.ts115-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L115-L121)
  * [actions/ai/extraction-actions.ts251-256](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L251-L256)
  * [actions/ai/extraction-actions.ts265-271](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L265-L271)



## Conclusion

The rate limiting and quota system is a critical component of IngestIO that:

  1. Enforces fair usage across subscription tiers
  2. Protects the system from abuse and excessive load
  3. Creates a clear value proposition for subscription upgrades
  4. Maintains predictable costs for AI processing



This multi-layered approach ensures the application can provide reliable service while managing resources effectively across all users.

### On this page

  * Rate Limiting and Quotas
  * Purpose and Scope
  * Overview
  * Subscription Tiers and Limits
  * Rate Limiting Implementation
  * Quota Management
  * Database Schema for Usage Tracking
  * Rate Limiting in Document Processing
  * Rate Limiting in AI Extraction
  * Implementation Details
  * Rate Limit Checking
  * Quota Checking
  * Quota Tracking
  * Development Environment Considerations
  * Analytics and Monitoring
  * Conclusion




---

# Document Processing

URL: https://deepwiki.com/moemoe9876/my-app/3-document-processing


# Document Processing

Relevant source files

The following files were used as context for generating this wiki page:

  * [__tests__/document-actions.test.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/document-actions.test.ts)
  * [actions/ai/extraction-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts)
  * [actions/db/documents.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts)
  * [actions/db/user-usage-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts)
  * [app/(dashboard)/dashboard/review/[id]/page.tsx](app/\(dashboard\)/dashboard/review/%5Bid%5D/page.tsx)
  * [components/utilities/DataVisualizer.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/DataVisualizer.tsx)
  * [components/utilities/InteractiveDataField.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/InteractiveDataField.tsx)
  * [lib/ai/vertex-client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts)



This document provides a technical overview of the document processing pipeline in our application. It covers the entire workflow from document upload through AI extraction to user review. For information about how users interact with documents, see [User Interface](/moemoe9876/my-app/7-user-interface), and for details on AI extraction techniques, see [AI Extraction](/moemoe9876/my-app/3.2-ai-extraction).

## Overview of Document Processing

The document processing system enables users to upload files, extract structured data using AI, and review/edit the results. It forms the core functionality of the application and integrates with user management, subscription systems, and analytics tracking.


Sources: [actions/db/documents.ts1-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L1-L143) [actions/ai/extraction-actions.ts208-586](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L586) [app/(dashboard)/dashboard/review/[id]/page.tsx:97-227]()

## Document Upload Process

The upload process handles file validation, storage, and record creation. It includes several security checks and rate limiting based on user subscription tier.

Document upload workflow:


Key steps in the upload process:

  1. Authentication - Verify the user's identity
  2. Rate limiting - Check if user has hit rate limits for their subscription tier
  3. Quota verification - Ensure user has sufficient page quota remaining
  4. File storage - Upload file to Supabase storage with user-specific path
  5. Database record - Create document record with metadata
  6. Usage tracking - Update user's page consumption



### Upload Function Implementation

The main upload function signature shows required parameters and return type:


The function handles file upload, storage, and creates a document record in the database.

### Document Database Schema

Documents are stored in the `documentsTable` with the following key fields:

Field| Description  
---|---  
id| Unique document identifier  
userId| ID of document owner  
originalFilename| Original file name  
storagePath| Path in Supabase storage  
mimeType| File MIME type  
fileSize| Size in bytes  
pageCount| Number of pages in document  
status| Document status (uploaded, processing, completed, failed)  
createdAt| Upload timestamp  
updatedAt| Last update timestamp  
  
Sources: [actions/db/documents.ts16-143](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L16-L143) [actions/db/user-usage-actions.ts237-271](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L237-L271)

## AI Data Extraction

After document upload, the system extracts structured data using Google Vertex AI's Gemini models. The extraction process handles various document types and provides both generic and specialized extraction capabilities.


### Extraction Process Details

  1. **Authentication and Validation**

     * Verify user identity via `getCurrentUser()`
     * Validate input parameters
     * Check rate limits and quota
  2. **Document Retrieval**

     * Fetch document from database
     * Download file from storage
     * Create extraction job record
  3. **AI Processing**

     * Prepare enhanced prompt using `enhancePrompt()`
     * Get Vertex AI model client with `getVertexStructuredModel()`
     * Process document with AI model using `generateObject()`
     * Parse and validate results
  4. **Result Storage**

     * Save extracted data to database
     * Update extraction job status
     * Update document status
     * Track usage metrics



### Specialized Extraction Functions

The system provides specialized extraction functions for common document types:

Function| Document Type| Description  
---|---|---  
`extractInvoiceDataAction`| Invoices| Extracts invoice data with specialized schema  
`extractResumeDataAction`| Resumes| Extracts resume data and work experience  
`extractReceiptDataAction`| Receipts| Extracts receipt details and line items  
`extractFormDataAction`| Forms| Extracts form fields with position data  
`extractTextAction`| Any| Generic text extraction from document  
  
### Extraction Options

The extraction process supports various options to customize the output:

Option| Description| Default  
---|---|---  
`includeConfidence`| Include confidence scores with extracted fields| `true`  
`includePositions`| Include position/bounding box data| `true`  
`extractionPrompt`| Custom prompt to guide extraction| Document-type specific  
`batchSize`| Number of documents to process at once| `1`  
  
Sources: [actions/ai/extraction-actions.ts126-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L126-L201) [actions/ai/extraction-actions.ts208-586](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L208-L586) [lib/ai/vertex-client.ts130-161](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts#L130-L161)

## Document Review Workflow

After extraction, users can review, edit, and confirm the extracted data through a dedicated review interface. This interface combines document viewing with data visualization and editing capabilities.


### Review Components

  1. **Data Visualizer**

     * Displays extracted data in tree or JSON format
     * Supports searching and filtering by confidence
     * Highlights fields on document hover
     * Enables field editing in edit mode
  2. **Document Viewer**

     * Displays the original document
     * Highlights selected fields with bounding boxes
     * Supports clicking on document to find corresponding field
     * Maintains synchronization with the data view
  3. **Interactive Field Editing**

     * Allows users to edit extracted values
     * Preserves confidence scores and positions
     * Provides visual feedback for edited fields



### Review Data Flow

  1. User accesses review page with document ID
  2. `fetchDocumentForReviewAction` retrieves document data, signed URL, and extracted data
  3. Review UI renders with split panel view
  4. User can view, search, filter, and edit data
  5. User confirms data via `updateExtractedDataAction`
  6. User can export data in JSON or CSV format



### Data Export Options

Format| Description  
---|---  
JSON| Complete structured data with metadata  
CSV| Tabular format suitable for spreadsheets  
  
Sources: [app/(dashboard)/dashboard/review/[id]/page.tsx:97-268](), [actions/db/documents.ts239-344](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L239-L344) [components/utilities/DataVisualizer.tsx169-762](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/DataVisualizer.tsx#L169-L762)

## Usage Tracking and Limits

The document processing system includes comprehensive usage tracking and enforcement of subscription-based limits.

### Page Quota Management


### Usage Tracking Components

  1. **User Usage Table**

     * Tracks pages processed per billing period
     * Stores page limits based on subscription tier
     * Provides remaining quota information
  2. **Usage Functions**

     * `checkUserQuotaAction` \- Verifies sufficient quota before processing
     * `incrementPagesProcessedAction` \- Updates usage after processing
     * `getCurrentUserUsageAction` \- Retrieves current usage statistics



### Subscription Tier Limits

Document processing limits vary by subscription tier:

Tier| Pages Per Month| Batch Size Limit| Rate Limit  
---|---|---|---  
starter| 25| 1| 10/minute  
pro| 100| 5| 30/minute  
business| 500| 20| 60/minute  
enterprise| Custom| Custom| Custom  
  
Sources: [actions/db/user-usage-actions.ts237-341](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/user-usage-actions.ts#L237-L341) [actions/ai/extraction-actions.ts130-201](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L130-L201)

## Testing and Error Handling

The document processing system includes comprehensive error handling and testing to ensure reliability.

### Error Handling Strategy

All document processing functions follow a consistent error handling approach:

  1. Use try/catch blocks around all critical operations
  2. Return standardized ActionState objects with error details
  3. Log errors to console for debugging
  4. Update document/job status on failure
  5. Track errors with analytics



### Test Coverage

Tests validate core document processing functionality:

Test Category| Description  
---|---  
Document Upload| Validates upload, rate limiting, and quota checks  
Document Deletion| Tests file and database record deletion  
Document Retrieval| Tests secure fetching with ownership verification  
Extraction Errors| Validates error handling for AI processing  
  
Sources: [__tests__/document-actions.test.ts71-207](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/document-actions.test.ts#L71-L207) [actions/db/documents.ts134-142](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L134-L142) [actions/ai/extraction-actions.ts568-585](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L568-L585)

## Integration Points

The document processing system integrates with several other components:

  1. **User Management** \- For authentication and ownership verification
  2. **Subscription System** \- For tier-based rate limiting and quotas
  3. **Storage** \- For document file storage and retrieval
  4. **AI Services** \- For document data extraction (Vertex AI)
  5. **Analytics** \- For tracking processing events and errors



Key integration functions:

Function| System| Purpose  
---|---|---  
`getCurrentUser`| User Management| Get authenticated user ID  
`checkRateLimit`| Subscription| Apply tier-based rate limits  
`trackServerEvent`| Analytics| Record processing events  
`uploadToStorage`| Storage| Save document files  
`getVertexStructuredModel`| AI Services| Get AI model client  
  
Sources: [actions/db/documents.ts8-10](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/documents.ts#L8-L10) [actions/ai/extraction-actions.ts4-9](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/ai/extraction-actions.ts#L4-L9) [lib/ai/vertex-client.ts102-161](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/ai/vertex-client.ts#L102-L161)

### On this page

  * Document Processing
  * Overview of Document Processing
  * Document Upload Process
  * Upload Function Implementation
  * Document Database Schema
  * AI Data Extraction
  * Extraction Process Details
  * Specialized Extraction Functions
  * Extraction Options
  * Document Review Workflow
  * Review Components
  * Review Data Flow
  * Data Export Options
  * Usage Tracking and Limits
  * Page Quota Management
  * Usage Tracking Components
  * Subscription Tier Limits
  * Testing and Error Handling
  * Error Handling Strategy
  * Test Coverage
  * Integration Points




---

# User Management

URL: https://deepwiki.com/moemoe9876/my-app/4-user-management


# User Management

Relevant source files

The following files were used as context for generating this wiki page:

  * [__tests__/profile-actions.test.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts)
  * [actions/db/profiles-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts)
  * [actions/db/users-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts)
  * [app/api/webhooks/clerk/clerk-client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/clerk-client.ts)
  * [app/api/webhooks/clerk/route.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts)
  * [db/migrations/0000_nostalgic_mauler.sql](https://github.com/moemoe9876/my-app/blob/b1f77c9f/db/migrations/0000_nostalgic_mauler.sql)
  * [lib/supabase/middleware.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/supabase/middleware.ts)
  * [types/supabase-types.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts)



This document describes the user management system in IngestIO, covering authentication flow, user data structure, and the mechanisms for synchronizing user information across the application. For information on subscription-specific functionality, see [Subscription System](/moemoe9876/my-app/5-subscription-system).

## 1\. Overview

The user management system handles user identity, authentication, and profile data throughout the application. It uses Clerk for authentication, stores user data in Supabase, and leverages webhooks to synchronize information between these services.


Sources:

  * [actions/db/profiles-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts)
  * [actions/db/users-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts)
  * [app/api/webhooks/clerk/route.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts)



## 2\. Authentication Architecture

The application implements a multi-layered authentication system that integrates Clerk for identity management with Supabase for data storage and access control.


Sources:

  * [app/api/webhooks/clerk/route.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts)
  * [lib/supabase/middleware.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/supabase/middleware.ts)
  * [app/api/webhooks/clerk/clerk-client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/clerk-client.ts)



## 3\. User Data Model

The system maintains user data across two primary tables: `users` for identity information and `profiles` for subscription and membership data.


### 3.1 Table Structure Details

#### Users Table

Stores core identity information synchronized from Clerk:

Column| Type| Description  
---|---|---  
user_id| string| Primary key, identical to Clerk user ID  
email| string| User's primary email address  
full_name| string| User's full name  
avatar_url| string| URL to user's profile picture  
metadata| JSON| Additional user metadata  
created_at| timestamp| Record creation timestamp  
updated_at| timestamp| Record update timestamp  
  
#### Profiles Table

Stores subscription and membership information:

Column| Type| Description  
---|---|---  
user_id| string| Primary key and foreign key to users table  
membership| enum| User's membership tier: starter, plus, or growth  
stripe_customer_id| string| User's Stripe customer ID for billing  
stripe_subscription_id| string| User's Stripe subscription ID  
created_at| timestamp| Record creation timestamp  
updated_at| timestamp| Record update timestamp  
  
Sources:

  * [types/supabase-types.ts343-372](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L343-L372)
  * [types/supabase-types.ts260-301](https://github.com/moemoe9876/my-app/blob/b1f77c9f/types/supabase-types.ts#L260-L301)
  * [db/migrations/0000_nostalgic_mauler.sql7-14](https://github.com/moemoe9876/my-app/blob/b1f77c9f/db/migrations/0000_nostalgic_mauler.sql#L7-L14)



## 4\. Clerk Webhook Integration

The system uses Clerk webhooks to synchronize user data with the Supabase database. This ensures that any changes made to user data in Clerk (creation, updates, deletion) are reflected in the application's database.


### 4.1 Webhook Event Handling

The webhook handler processes three primary events:

  1. **User Creation** (`user.created`):

     * Creates a new record in the `users` table with identity information
     * Creates a corresponding record in the `profiles` table with default membership tier
  2. **User Update** (`user.updated`):

     * Updates the user's information in the `users` table
     * Ensures both user and profile records exist
  3. **User Deletion** (`user.deleted`):

     * Removes records from both `profiles` and `users` tables



Sources:

  * [app/api/webhooks/clerk/route.ts45-102](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts#L45-L102) (User Creation)
  * [app/api/webhooks/clerk/route.ts104-217](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts#L104-L217) (User Update)
  * [app/api/webhooks/clerk/route.ts219-259](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts#L219-L259) (User Deletion)
  * [app/api/webhooks/clerk/clerk-client.ts26-37](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/clerk-client.ts#L26-L37) (Admin Client)



## 5\. Server Action Functions

The application implements server actions to manage user data throughout the application. These functions handle CRUD operations on the `users` and `profiles` tables.

### 5.1 User Management Actions


Key user actions include:

Function| Purpose| Access Level  
---|---|---  
`getCurrentUserDataAction`| Retrieve current authenticated user data| Public  
`updateUserIdentityAction`| Update user identity information| Public, self only  
`getUserByIdAction`| Get user by ID| Internal  
`getUserByEmailAction`| Get user by email| Internal  
`createUserAction`| Create a new user| Admin only  
`updateUserAction`| Update user information| Admin only  
`deleteUserAction`| Delete a user| Admin only  
  
Sources:

  * [actions/db/users-actions.ts56-83](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L56-L83) (getCurrentUserDataAction)
  * [actions/db/users-actions.ts146-205](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L146-L205) (updateUserIdentityAction)
  * [actions/db/users-actions.ts16-29](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L16-L29) (getUserByIdAction)
  * [actions/db/users-actions.ts37-50](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L37-L50) (getUserByEmailAction)
  * [actions/db/users-actions.ts91-104](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L91-L104) (updateUserAction)
  * [actions/db/users-actions.ts112-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L112-L121) (createUserAction)
  * [actions/db/users-actions.ts129-138](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L129-L138) (deleteUserAction)



### 5.2 Profile Management Actions


Key profile actions include:

Function| Purpose| Access Level  
---|---|---  
`getProfileAction`| Create a profile| Internal  
`getProfileByUserIdAction`| Get profile by user ID| Internal  
`updateProfileAction`| Update profile information| Internal  
`updateSubscriptionProfileAction`| Update subscription-related fields| Public, self only  
`deleteProfileAction`| Delete a profile| Internal  
`updateProfileByStripeCustomerIdAction`| Update profile by Stripe customer ID| Internal  
  
Sources:

  * [actions/db/profiles-actions.ts26-40](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L26-L40) (getProfileAction)
  * [actions/db/profiles-actions.ts42-62](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L42-L62) (getProfileByUserIdAction)
  * [actions/db/profiles-actions.ts64-88](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L64-L88) (updateProfileAction)
  * [actions/db/profiles-actions.ts142-203](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L142-L203) (updateSubscriptionProfileAction)
  * [actions/db/profiles-actions.ts122-136](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L122-L136) (deleteProfileAction)
  * [actions/db/profiles-actions.ts90-120](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L90-L120) (updateProfileByStripeCustomerIdAction)



## 6\. Security and Data Protection

The user management system implements several security measures to protect user data:

  1. **Authentication-Based Access Control** : Server actions verify the current user's identity before permitting operations.

  2. **Self-Only Data Modification** : Users can only modify their own data through public server actions:

  3. **Field Restriction** : Only specific fields can be modified through public actions:

  4. **Admin-Only Functions** : Sensitive operations like user deletion are restricted to admin contexts.

  5. **Webhook Signature Verification** : Clerk webhooks are verified using SVIX signatures:




Sources:

  * [actions/db/profiles-actions.ts152-160](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L152-L160) (Authentication check)
  * [actions/db/profiles-actions.ts163-167](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L163-L167) (Field restriction)
  * [actions/db/users-actions.ts159-164](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L159-L164) (Self-only data modification)
  * [app/api/webhooks/clerk/route.ts29-33](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/webhooks/clerk/route.ts#L29-L33) (Webhook verification)



## 7\. Analytics Integration

User management events are tracked for analytics purposes using the `trackServerEvent` function:

  1. **Subscription Changes** : When a user's subscription status changes:

  2. **Profile Updates** : When a user updates their profile information:




These events help track user behavior and system performance, which is part of the larger analytics system documented in [Analytics](/moemoe9876/my-app/6-analytics).

Sources:

  * [actions/db/profiles-actions.ts181-189](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/profiles-actions.ts#L181-L189) (Subscription tracking)
  * [actions/db/users-actions.ts185-191](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/db/users-actions.ts#L185-L191) (Profile update tracking)
  * [__tests__/profile-actions.test.ts116-123](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts#L116-L123) (Test verification of analytics)



## 8\. Testing

The user management system includes comprehensive tests to ensure its reliability:

  1. **Profile Action Tests** : Verify profile update functions, especially subscription updates.
  2. **User Action Tests** : Test user data retrieval and identity updates.
  3. **Authentication Tests** : Verify that users can only modify their own data.
  4. **Error Handling Tests** : Ensure proper error responses when operations fail.



This test suite helps maintain system integrity when code changes are made.

Sources:

  * [__tests__/profile-actions.test.ts107-147](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts#L107-L147) (Subscription profile tests)
  * [__tests__/profile-actions.test.ts149-190](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts#L149-L190) (User identity tests)
  * [__tests__/profile-actions.test.ts78-105](https://github.com/moemoe9876/my-app/blob/b1f77c9f/__tests__/profile-actions.test.ts#L78-L105) (Current user data tests)



### On this page

  * User Management
  * 1\. Overview
  * 2\. Authentication Architecture
  * 3\. User Data Model
  * 3.1 Table Structure Details
  * Users Table
  * Profiles Table
  * 4\. Clerk Webhook Integration
  * 4.1 Webhook Event Handling
  * 5\. Server Action Functions
  * 5.1 User Management Actions
  * 5.2 Profile Management Actions
  * 6\. Security and Data Protection
  * 7\. Analytics Integration
  * 8\. Testing




---

# Subscription System

URL: https://deepwiki.com/moemoe9876/my-app/5-subscription-system


# Subscription System

Relevant source files

The following files were used as context for generating this wiki page:

  * [actions/stripe/checkout-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/checkout-actions.ts)
  * [actions/stripe/index.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/index.ts)
  * [actions/stripe/webhook-actions.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts)
  * [app/api/stripe/webhooks/route.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/stripe/webhooks/route.ts)
  * [components/utilities/user-nav.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/components/utilities/user-nav.tsx)
  * [lib/config/subscription-plans.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts)
  * [lib/stripe/client.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/stripe/client.ts)
  * [lib/stripe/webhooks.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/stripe/webhooks.ts)
  * [middleware.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/middleware.ts)



## Overview

The Subscription System manages user subscription plans, processes payments via Stripe, and enforces usage quotas in the IngestIO application. It implements a "Sane Stripe" approach with Redis KV store as the source of truth and database denormalization for quick access. This document covers subscription plan definitions, Stripe integration, webhook processing, and quota management.

Sources: [lib/config/subscription-plans.ts1-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L1-L121) [actions/stripe/webhook-actions.ts26-28](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L26-L28)

## Subscription Plans

The application implements a tiered subscription model with three plans:

Plan ID| Name| Price (Monthly)| Document Quota| Batch Processing| Retention Days  
---|---|---|---|---|---  
starter| Starter| Free| 25| No| 30  
plus| Plus| $9.99| 250| Yes (25 max)| 90  
growth| Growth| $19.99| 500| Yes (100 max)| 365  
  
Each plan defines document quotas, batch processing capabilities, data retention periods, and support levels. Plans are configured in the subscription-plans.ts file with corresponding Stripe price IDs.

### Plan Structure Diagram


Sources: [lib/config/subscription-plans.ts15-32](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L15-L32) [lib/config/subscription-plans.ts35-76](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L35-L76)

## Stripe Integration

### Checkout Process

The subscription system interfaces with Stripe for payment processing through server actions. When a user selects a plan, the system creates a Stripe checkout session and redirects the user to Stripe's checkout page.


Sources: [actions/stripe/checkout-actions.ts1-138](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/checkout-actions.ts#L1-L138)

### Billing Portal

For subscription management, the system provides a Stripe customer portal that allows users to:

  * Update payment methods
  * View invoices and payment history
  * Change subscription plans
  * Cancel subscriptions



The portal is accessed via the `createBillingPortalSessionAction` which generates a session URL for the current user.

Sources: [actions/stripe/checkout-actions.ts140-199](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/checkout-actions.ts#L140-L199)

## Webhook Processing

Stripe webhooks are used to keep subscription data synchronized between Stripe and the application. The webhook system follows these steps:

  1. Stripe sends event notifications to the webhook endpoint
  2. The webhook handler validates the signature and processes the event
  3. The event processor extracts relevant data and updates the Redis KV store
  4. Data is denormalized to the database for quick access



### Webhook Flow Diagram


Sources: [app/api/stripe/webhooks/route.ts1-49](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/api/stripe/webhooks/route.ts#L1-L49) [actions/stripe/webhook-actions.ts28-221](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L28-L221) [lib/stripe/webhooks.ts98-158](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/stripe/webhooks.ts#L98-L158)

### Key Webhook Events

The system processes the following important Stripe event types:

Event Type| Purpose  
---|---  
checkout.session.completed| Initial subscription created  
customer.subscription.created| New subscription activation  
customer.subscription.updated| Plan changes or renewals  
customer.subscription.deleted| Subscription cancellation  
invoice.paid| Successful renewal payment  
invoice.payment_failed| Failed payment handling  
  
When an invoice payment succeeds for a subscription renewal, the system automatically resets the user's usage quota for the new billing period.

Sources: [lib/stripe/webhooks.ts13-34](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/stripe/webhooks.ts#L13-L34) [actions/stripe/webhook-actions.ts140-190](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L140-L190)

## Subscription Data Management

### Data Storage Strategy

The subscription system follows a dual-storage approach:

  1. **Primary Source of Truth** : Redis KV store

     * Stores customer subscription data in a fast, reliable cache
     * Accessed using customer ID and user ID mapping keys
  2. **Secondary/Denormalized** : Database

     * User profiles are updated with membership status and subscription ID
     * Provides quick access for permission checks without Redis lookups




Sources: [actions/stripe/webhook-actions.ts75-105](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L75-L105) [actions/stripe/checkout-actions.ts68-106](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/checkout-actions.ts#L68-L106)

## Usage Quotas and Enforcement

The subscription system enforces usage limits based on a user's subscription plan:

  1. **Document Quotas** : Each plan has a maximum number of documents that can be processed per billing period
  2. **Batch Processing** : Plus and Growth plans enable batch processing with different size limits
  3. **Data Retention** : Different retention periods for processed documents based on plan tier



### Quota Reset Process

When a subscription renews (detected via the `invoice.payment_succeeded` webhook event):

  1. The system extracts the billing period dates from Stripe
  2. A new usage record is created with these precise start and end dates
  3. The document quota limit is set based on the plan
  4. The usage counter is reset to 0




Sources: [actions/stripe/webhook-actions.ts140-190](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L140-L190) [lib/config/subscription-plans.ts103-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L103-L121)

## Client Integration

The frontend interacts with the subscription system through:

  1. Server actions for creating checkout and billing portal sessions
  2. UI components that display subscription status and options
  3. Route protection middleware for subscription-level feature access



### Subscription-Based Access Control

The application checks subscription status before allowing access to premium features:


Sources: [middleware.ts7-61](https://github.com/moemoe9876/my-app/blob/b1f77c9f/middleware.ts#L7-L61) [lib/config/subscription-plans.ts105-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L105-L121)

## Subscription System Integration

The subscription system integrates with other systems in the application:

  1. **User Management** : Links user profiles to Stripe customer IDs
  2. **Document Processing** : Enforces quotas on document uploads and processing
  3. **Analytics** : Tracks subscription events and usage patterns
  4. **Settings UI** : Provides interfaces for subscription management



Sources: [actions/stripe/webhook-actions.ts7-8](https://github.com/moemoe9876/my-app/blob/b1f77c9f/actions/stripe/webhook-actions.ts#L7-L8) [lib/config/subscription-plans.ts105-121](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/config/subscription-plans.ts#L105-L121)

### On this page

  * Subscription System
  * Overview
  * Subscription Plans
  * Plan Structure Diagram
  * Stripe Integration
  * Checkout Process
  * Billing Portal
  * Webhook Processing
  * Webhook Flow Diagram
  * Key Webhook Events
  * Subscription Data Management
  * Data Storage Strategy
  * Usage Quotas and Enforcement
  * Quota Reset Process
  * Client Integration
  * Subscription-Based Access Control
  * Subscription System Integration




---

# Analytics

URL: https://deepwiki.com/moemoe9876/my-app/6-analytics


# Analytics

Relevant source files

The following files were used as context for generating this wiki page:

  * [app/(dashboard)/dashboard/metrics/page.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx)/dashboard/metrics/page.tsx)
  * [lib/analytics/server.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/analytics/server.ts)
  * [todo/dashboard-ui.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/todo/dashboard-ui.md)
  * [todo/extractions-plan.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/todo/extractions-plan.md)
  * [todo/metrics-ui.md](https://github.com/moemoe9876/my-app/blob/b1f77c9f/todo/metrics-ui.md)



This document describes the analytics implementation in the IngestIO application, covering both the client and server-side tracking architecture and the metrics visualization system. The analytics system provides insights into document processing performance, user behavior, and system utilization.

For information about specific user actions and detailed logging, see [Server Actions](/moemoe9876/my-app/8-server-actions).

## 1\. Analytics Architecture Overview

The IngestIO analytics system consists of two main components:

  1. **Event Tracking** : Implemented using PostHog to capture user actions and system events.
  2. **Metrics Visualization** : A dedicated dashboard that displays processing statistics and usage data.




Sources: [lib/analytics/server.ts](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/analytics/server.ts) [app/(dashboard)/dashboard/metrics/page.tsx](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx)

## 2\. Server-Side Analytics Implementation

The server-side analytics implementation uses the PostHog Node.js client to track events that occur on the server, such as document processing events, AI extraction operations, and user subscription changes.

### 2.1 PostHog Client Setup

A singleton pattern is used to initialize and manage the PostHog client instance:


The client is initialized with configuration from environment variables:

  * `NEXT_PUBLIC_POSTHOG_KEY`: API key for PostHog
  * `NEXT_PUBLIC_POSTHOG_HOST`: PostHog host URL



Sources: [lib/analytics/server.ts5-29](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/analytics/server.ts#L5-L29)

### 2.2 Event Tracking Functions

The server-side analytics implementation provides two main functions:

  1. **`trackServerEvent`** : Records events with optional properties
  2. **`identifyServerUser`** : Identifies users and sets their properties




Sources: [lib/analytics/server.ts49-82](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/analytics/server.ts#L49-L82)

## 3\. Metrics Collection and Visualization

The metrics system provides detailed insights into document processing performance, usage patterns, and system health. These metrics are displayed in a dedicated dashboard.

### 3.1 Metrics Data Flow


Sources: [app/(dashboard)/dashboard/metrics/page.tsx137-147](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L137-L147)

### 3.2 Key Metrics Tracked

The system tracks several key metrics:

Metric Category| Metrics| Description  
---|---|---  
Document Metrics| Total Documents| Number of documents processed  
| Success Rate| Percentage of successful document processing  
| Average Processing Time| Average time to process a document  
Usage Metrics| Pages Processed| Number of pages processed in current billing cycle  
| Pages Limit| Maximum pages allowed by subscription  
| Usage Percentage| Percentage of quota used  
Distribution Metrics| Status Distribution| Breakdown of document processing statuses  
| Document Type Distribution| Breakdown of processed document types  
Error Metrics| Top Errors| Most common processing errors  
  
Sources: [app/(dashboard)/dashboard/metrics/page.tsx245-290](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L245-L290)

## 4\. Metrics Dashboard Implementation

The metrics dashboard (`/dashboard/metrics`) provides a visual representation of the collected metrics.

### 4.1 Dashboard Components


Sources: [app/(dashboard)/dashboard/metrics/page.tsx118-304](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L118-L304)

### 4.2 Data Fetching and Refresh

The dashboard uses SWR (Stale-While-Revalidate) for data fetching with the following properties:

  * Auto-refreshes every 5 seconds
  * Revalidates on focus
  * Provides loading states
  * Handles errors gracefully




Sources: [app/(dashboard)/dashboard/metrics/page.tsx132-162](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L132-L162)

### 4.3 Charts and Visualizations

The dashboard uses Recharts for data visualization with the following chart types:

  1. **Area Chart** : For processing volume over time
  2. **Pie/Bar Chart** : For document type distribution
  3. **Radial Bar Chart** : For status distribution
  4. **Scrollable List** : For error reporting



Sources: [app/(dashboard)/dashboard/metrics/page.tsx504-545](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L504-L545) [app/(dashboard)/dashboard/metrics/page.tsx564-666](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L564-L666) [app/(dashboard)/dashboard/metrics/page.tsx691-748](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L691-L748) [app/(dashboard)/dashboard/metrics/page.tsx767-820](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L767-L820)

## 5\. Analytics Events

The system tracks various events related to document processing and user interactions.

### 5.1 Document Processing Events

Event Name| Triggered When| Properties  
---|---|---  
`document_uploaded`| User uploads a document| `documentId`, `fileSize`, `mimeType`  
`extraction_started`| AI extraction begins| `documentId`, `extractorType`  
`extraction_completed`| AI extraction completes| `documentId`, `processingTime`, `success`  
`extraction_failed`| AI extraction fails| `documentId`, `errorMessage`  
`document_reviewed`| User reviews extracted data| `documentId`, `timeToReview`  
  
### 5.2 User Account Events

Event Name| Triggered When| Properties  
---|---|---  
`user_registered`| New user registration| `userId`, `plan`  
`subscription_changed`| User changes subscription| `userId`, `oldPlan`, `newPlan`  
`quota_exceeded`| User exceeds usage quota| `userId`, `attemptedAction`  
  
Sources: [lib/analytics/server.ts49-64](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/analytics/server.ts#L49-L64)

## 6\. Data Export

The metrics dashboard allows exporting metrics data in CSV format, containing:

  * Key performance indicators
  * Document type distribution
  * Status distribution
  * Processing volume over time
  * Top errors



The export function formats the data and creates a downloadable CSV file.


Sources: [app/(dashboard)/dashboard/metrics/page.tsx242-300](https://github.com/moemoe9876/my-app/blob/b1f77c9f/app/\(dashboard\)/dashboard/metrics/page.tsx#L242-L300)

## 7\. Implementation Considerations

### 7.1 Privacy and Data Protection

The analytics system is designed with privacy in mind:

  * No personally identifiable information is tracked by default
  * User IDs are used as distinct IDs rather than personal information
  * Event properties are carefully selected to avoid capturing sensitive data



### 7.2 Performance Impact

The analytics implementation minimizes performance impact by:

  * Using a server-side singleton pattern for the PostHog client
  * Implementing error handling to prevent analytics failures from affecting core functionality
  * Setting reasonable flush intervals to balance timely data with performance



Sources: [lib/analytics/server.ts18-26](https://github.com/moemoe9876/my-app/blob/b1f77c9f/lib/analytics/server.ts#L18-L26)

### On this page

  * Analytics
  * 1\. Analytics Architecture Overview
  * 2\. Server-Side Analytics Implementation
  * 2.1 PostHog Client Setup
  * 2.2 Event Tracking Functions
  * 3\. Metrics Collection and Visualization
  * 3.1 Metrics Data Flow
  * 3.2 Key Metrics Tracked
  * 4\. Metrics Dashboard Implementation
  * 4.1 Dashboard Components
  * 4.2 Data Fetching and Refresh
  * 4.3 Charts and Visualizations
  * 5\. Analytics Events
  * 5.1 Document Processing Events
  * 5.2 User Account Events
  * 6\. Data Export
  * 7\. Implementation Considerations
  * 7.1 Privacy and Data Protection
  * 7.2 Performance Impact




---

