## Ingestio.io Document Extraction Improvement Plan

**Project:** Ingestio.io - AI Document Data Extraction

**Goal:** Enhance the existing document extraction capabilities to create a more robust, accurate, and scalable solution that handles various document types effectively.

## Current Architecture Overview

Ingestio currently has a solid foundation for document extraction:

- Uses Google Vertex AI with Gemini 2.0 Flash model
- Implements structured data extraction with schema validation
- Includes fallback mechanisms for handling extraction failures
- Provides document-specific extraction for invoices, resumes, receipts, and forms
- Incorporates rate limiting and quota management with Redis/Upstash
- Tracks analytics for monitoring performance

## Implementation Plan

### Section 1: Document Preprocessing Enhancements

- [ ] Step 1.1: Implement Document Segmentation
  - **Task**: Create a preprocessing utility that segments large documents into manageable chunks.
  - **Files**:
    - `lib/preprocessing/document-segmentation.ts`: Create this file.
    - `actions/ai/extraction-actions.ts`: Update this file.
  - **Implementation Details**:
    - Add logic to detect document size (page count)
    - For documents >25 pages, segment into logical chunks (max 20 pages per chunk)
    - Process each segment independently and merge results
    - Track each segment's pages against user quota
  - **User Instructions**: Add segmentation logic that respects document structure. Use page metadata to identify logical section breaks where possible.

- [ ] Step 1.2: Implement Image Preprocessing
  - **Task**: Add preprocessing for low-quality scans and image-based documents.
  - **Files**:
    - `lib/preprocessing/image-enhancement.ts`: Create this file.
    - `actions/ai/extraction-actions.ts`: Update this file.
  - **Implementation Details**:
    - Add contrast enhancement, deskewing, and noise reduction
    - Implement OCR preprocessing for image-based documents
    - Support image cleanup for handwritten documents
  - **User Instructions**: Integrate with existing image processing libraries or use a service API. Apply these enhancements only when needed based on document quality detection.

- [ ] Step 1.3: Add Language Detection
  - **Task**: Implement automatic language detection for multilingual documents.
  - **Files**:
    - `lib/preprocessing/language-detection.ts`: Create this file.
    - `prompts/extraction.ts`: Update this file.
    - `actions/ai/extraction-actions.ts`: Update this file.
  - **Implementation Details**:
    - Add language detection using the Vertex AI model or a specialized library
    - Enhance prompts with language-specific instruction
    - Add language metadata to extraction results
  - **User Instructions**: Detect language before main extraction pass and adapt prompts accordingly.

### Section 2: Advanced Prompt Engineering

- [ ] Step 2.1: Implement Two-Stage Extraction
  - **Task**: Create a two-pass extraction approach with document classification and targeted extraction.
  - **Files**:
    - `actions/ai/extraction-actions.ts`: Update this file.
    - `prompts/classification.ts`: Create this file.
    - `prompts/extraction.ts`: Update this file.
  - **Implementation Details**:
    - First pass: Document type classification and structure analysis
    - Second pass: Targeted extraction with document-specific prompts
    - Preserve context between passes
  - **User Instructions**: Create distinct prompt sets for classification and extraction stages. Use the detection results to inform the extraction strategy.

- [ ] Step 2.2: Implement Dynamic Prompt Generation
  - **Task**: Generate extraction prompts based on document characteristics.
  - **Files**:
    - `prompts/extraction.ts`: Update this file.
    - `actions/ai/extraction-actions.ts`: Update this file.
  - **Implementation Details**:
    - Enhance the existing enhancePrompt function
    - Include document layout information when available
    - Reference specific regions using bounding box coordinates
    - Dynamically adjust prompts based on detected document type
  - **User Instructions**: Create a sophisticated prompt generator that considers document type, layout, language, and extracted structure.

- [ ] Step 2.3: Implement Context Windows for Long Documents
  - **Task**: Use sliding context windows for long documents to maintain context across document parts.
  - **Files**:
    - `actions/ai/extraction-actions.ts`: Update this file.
    - `lib/preprocessing/context-windows.ts`: Create this file.
  - **Implementation Details**:
    - Implement windowing strategy with overlapping contexts
    - Maintain context across multiple extraction requests
    - Implement cross-reference resolution between document parts
  - **User Instructions**: Create a window manager that tracks extraction context across segments and resolves conflicting or duplicate extractions.

### Section 3: Schema and Model Improvements

- [ ] Step 3.1: Implement Adaptive Schemas
  - **Task**: Create dynamic schema generation based on document analysis.
  - **Files**:
    - `actions/ai/schema.ts`: Update this file.
    - `lib/schema/adaptive-schema.ts`: Create this file.
  - **Implementation Details**:
    - Implement schema evolution from initial extraction attempts
    - Add schema version tracking for backward compatibility
    - Create dynamic schema validation based on document type
  - **User Instructions**: Design a schema generation system that adapts to document content and evolves based on extraction quality.

- [ ] Step 3.2: Implement Multi-Model Approach
  - **Task**: Create a model selection strategy based on document type and complexity.
  - **Files**:
    - `lib/ai/vertex-client.ts`: Update this file.
    - `actions/ai/extraction-actions.ts`: Update this file.
  - **Implementation Details**:
    - Add model selection logic based on document characteristics
    - Implement fallback paths with different model configurations
    - Allow combining results from multiple models for improved accuracy
  - **User Instructions**: Create a model router that selects the optimal model based on document type, size, complexity, and language.

- [ ] Step 3.3: Enhance Confidence Scoring
  - **Task**: Improve confidence scoring with token-level probabilities and normalized scores.
  - **Files**:
    - `actions/ai/extraction-actions.ts`: Update this file.
    - `lib/ai/confidence-scoring.ts`: Create this file.
  - **Implementation Details**:
    - Enhance confidence scoring with token-level probabilities when available
    - Implement normalized confidence scores across different models
    - Add confidence thresholds for automatic vs. manual verification
  - **User Instructions**: Create a confidence scoring system that accounts for model uncertainty and provides consistent scoring across different extraction types.

### Section 4: Processing Pipeline Enhancements

- [ ] Step 4.1: Implement Parallel Processing
  - **Task**: Enhance batch processing with parallel extraction and worker pools.
  - **Files**:
    - `actions/batch/batch-extraction-actions.ts`: Update this file.
    - `lib/processing/worker-pool.ts`: Create this file.
  - **Implementation Details**:
    - Implement parallel processing for batch extraction
    - Use worker pools for distributing extraction tasks
    - Implement priority queues for urgent extractions
  - **User Instructions**: Create a worker pool system that efficiently distributes extraction work while respecting rate limits.

- [ ] Step 4.2: Implement Document Caching Strategy
  - **Task**: Create a caching system for similar documents to improve performance.
  - **Files**:
    - `lib/caching/document-cache.ts`: Create this file.
    - `actions/ai/extraction-actions.ts`: Update this file.
  - **Implementation Details**:
    - Implement document fingerprinting for cache matching
    - Cache extraction results for similar documents
    - Use progressive result caching during multi-stage processing
  - **User Instructions**: Create a caching system that identifies similar documents and reuses extraction results when appropriate.

- [ ] Step 4.3: Enhance Error Recovery
  - **Task**: Improve error handling with automatic retry and incremental extraction.
  - **Files**:
    - `actions/ai/extraction-actions.ts`: Update this file.
    - `lib/error-handling/extraction-recovery.ts`: Create this file.
  - **Implementation Details**:
    - Implement automatic retry with different models on failure
    - Add incremental extraction for partially successful results
    - Support manual correction workflows for failed extractions
  - **User Instructions**: Create a recovery system that gracefully handles extraction failures and preserves partial results.

### Section 5: Document-Type Specific Improvements

- [ ] Step 5.1: Enhance Invoice and Receipt Extraction
  - **Task**: Improve extraction for invoices and receipts with specialized handling.
  - **Files**:
    - `prompts/extraction.ts`: Update this file.
    - `actions/ai/extraction-actions.ts`: Update this file.
  - **Implementation Details**:
    - Implement line item table extraction with structure preservation
    - Add tax calculation validation
    - Support multiple currency handling
    - Recognize and extract payment terms and methods
  - **User Instructions**: Create specialized extractors for invoice line items, tables, and financial data.

- [ ] Step 5.2: Enhance Form and Application Extraction
  - **Task**: Improve extraction for forms with field detection and spatial relationships.
  - **Files**:
    - `prompts/extraction.ts`: Update this file.
    - `actions/ai/extraction-actions.ts`: Update this file.
  - **Implementation Details**:
    - Implement form field detection with spatial relationship mapping
    - Support checkbox and radio button recognition
    - Add signature detection and verification
    - Preserve form structure in extracted data
  - **User Instructions**: Create specialized extractors for form fields, checkboxes, and structured layouts.

- [ ] Step 5.3: Add Contract and Legal Document Extraction
  - **Task**: Implement specialized extraction for contracts and legal documents.
  - **Files**:
    - `prompts/extraction.ts`: Update this file.
    - `actions/ai/contract-extraction-actions.ts`: Create this file.
  - **Implementation Details**:
    - Add clause identification and classification
    - Implement party and entity extraction
    - Support term and condition extraction
    - Add date and deadline tracking
  - **User Instructions**: Create specialized extractors for legal clauses, entities, and contractual terms.

- [ ] Step 5.4: Enhance Resume and CV Extraction
  - **Task**: Improve extraction for resumes with enhanced skill and history extraction.
  - **Files**:
    - `prompts/extraction.ts`: Update this file.
    - `actions/ai/extraction-actions.ts`: Update this file.
  - **Implementation Details**:
    - Enhance skill extraction with taxonomy mapping
    - Implement employment history timeline construction
    - Add education credential verification
    - Support certification and license extraction
  - **User Instructions**: Create specialized extractors for skills, work history, and credentials from CVs and resumes.

### Section 6: Result Validation and Enhancement

- [ ] Step 6.1: Implement Business Rule Validation
  - **Task**: Add domain-specific validation rules for extracted data.
  - **Files**:
    - `lib/validation/business-rules.ts`: Create this file.
    - `actions/ai/extraction-actions.ts`: Update this file.
  - **Implementation Details**:
    - Implement business rule validation for domain-specific extractions
    - Add cross-field validation for logical consistency
    - Support format standardization for dates, numbers, and addresses
  - **User Instructions**: Create a validation framework that applies business rules to extracted data before returning results.

- [ ] Step 6.2: Implement Data Postprocessing
  - **Task**: Add postprocessing steps for data normalization and enrichment.
  - **Files**:
    - `lib/postprocessing/data-normalization.ts`: Create this file.
    - `actions/ai/extraction-actions.ts`: Update this file.
  - **Implementation Details**:
    - Add entity resolution and deduplication
    - Implement structured data normalization
    - Support data enrichment with external sources when appropriate
  - **User Instructions**: Create postprocessing pipelines that clean, normalize, and enrich extracted data.

- [ ] Step 6.3: Improve Human-in-the-Loop Workflow
  - **Task**: Enhance UI for manual review and correction of extraction results.
  - **Files**:
    - `app/(dashboard)/dashboard/review/[id]/page.tsx`: Update this file.
    - `components/utilities/DataVisualizer.tsx`: Update this file.
  - **Implementation Details**:
    - Add UI for manually editing extraction results
    - Implement confidence threshold-based routing to human review
    - Support feedback loops for model improvement
  - **User Instructions**: Create an intuitive interface for reviewing and correcting extraction results with clear confidence indicators.

### Section 7: Multi-Page PDF and Usage Improvements

- [ ] Step 7.1: Fix Multi-Page PDF Viewer
  - **Task**: Update PDF viewer to correctly handle multi-page documents.
  - **Files**:
    - `components/utilities/PdfViewer.tsx`: Update this file.
    - `components/utilities/PdfViewerUrl.tsx`: Update this file.
  - **Implementation Details**:
    - Fix PDF rendering issues with multi-page documents
    - Add page navigation controls
    - Ensure proper loading and error states
  - **User Instructions**: Update the PDF viewer to properly handle multi-page documents with navigation controls.

- [ ] Step 7.2: Update Page Usage Logic
  - **Task**: Improve page counting logic for multi-page documents and usage tracking.
  - **Files**:
    - `actions/db/user-usage-actions.ts`: Update this file.
    - `actions/ai/extraction-actions.ts`: Update this file.
  - **Implementation Details**:
    - Update usage tracking to count actual pages processed
    - Modify tier limits to reflect multi-page document handling
    - Add clear page usage visualization in UI
  - **User Instructions**: Create a fair and transparent page counting system that accurately reflects resource usage.

- [ ] Step 7.3: Add Option to Export Without Bounding Boxes
  - **Task**: Provide option to exclude bounding box data from JSON exports.
  - **Files**:
    - `actions/db/documents.ts`: Update this file for export functionality.
    - `app/(dashboard)/dashboard/review/[id]/page.tsx`: Update this file.
  - **Implementation Details**:
    - Add export options UI with checkbox for bounding box inclusion
    - Implement filtered export option in server action
    - Ensure clean JSON output
  - **User Instructions**: Add an export configuration option to include or exclude position data.

- [ ] Step 7.4: Fix Data Highlighting on Hover
  - **Task**: Improve the hover animation for extracted data to correctly highlight source location.
  - **Files**:
    - `components/utilities/DataVisualizer.tsx`: Update this file.
    - `components/utilities/PdfHighlightLayer.tsx`: Update this file.
    - `app/(dashboard)/dashboard/review/[id]/page.tsx`: Update this file.
  - **Implementation Details**:
    - Fix coordination between data panel and document viewer
    - Implement smooth navigation to highlight location
    - Add visual cues to connect data with source location
  - **User Instructions**: Ensure smooth highlighting and navigation when hovering over extracted data fields.

### Section 8: UI and Experience Improvements

- [ ] Step 8.1: Fix History Page Cache Issue
  - **Task**: Resolve issue with recently processed documents not appearing in history.
  - **Files**:
    - `actions/db/documents.ts`: Update this file (fetchUserDocumentsAction).
    - `app/(dashboard)/dashboard/history/page.tsx`: Update this file.
  - **Implementation Details**:
    - Investigate and fix caching or revalidation issues
    - Ensure proper sorting by timestamp
    - Add refresh mechanism for immediate updates
  - **User Instructions**: Ensure real-time updates of document history without requiring manual refresh.

- [ ] Step 8.2: Improve History Page UI
  - **Task**: Enhance history page visual design and functionality.
  - **Files**:
    - `app/(dashboard)/dashboard/history/page.tsx`: Update this file.
  - **Implementation Details**:
    - Add filtering and sorting options
    - Improve document card design
    - Add batch operations for multiple documents
  - **User Instructions**: Create a clean, intuitive history page with clear visual hierarchy and useful filtering options.

- [ ] Step 8.3: Improve Metrics Page
  - **Task**: Enhance metrics page with more detailed usage statistics.
  - **Files**:
    - `app/(dashboard)/dashboard/metrics/page.tsx`: Update this file.
    - `actions/db/metrics-actions.ts`: Update this file.
  - **Implementation Details**:
    - Add page usage visualization
    - Show extraction success rates
    - Visualize usage trends over time
  - **User Instructions**: Create meaningful visualizations that help users understand their usage patterns and extraction quality.

- [ ] Step 8.4: Improve Settings Page
  - **Task**: Enhance settings page with more customization options.
  - **Files**:
    - `app/(dashboard)/dashboard/settings/page.tsx`: Update this file.
  - **Implementation Details**:
    - Add extraction preferences
    - Allow default prompt customization
    - Add export format preferences
  - **User Instructions**: Create intuitive settings controls for all customizable aspects of the extraction process.

- [ ] Step 8.5: Improve Dashboard Page UI
  - **Task**: Enhance main dashboard with better overview and quick actions.
  - **Files**:
    - `app/(dashboard)/dashboard/page.tsx`: Update this file.
  - **Implementation Details**:
    - Show key metrics at a glance
    - Add quick action buttons for common tasks
    - Show recent documents with preview
  - **User Instructions**: Create a dashboard that provides immediate value and clear next actions for the user.

## Testing & Validation Plan

For each implemented feature, follow these testing steps:

1.  **Unit Tests**:
    - Write unit tests for all new utilities and functions
    - Test edge cases thoroughly, especially for preprocessing and validation logic
    - Add tests for model fallback paths and error recovery

2.  **Integration Tests**:
    - Test the full extraction pipeline with different document types and sizes
    - Verify correct behavior with batch processing and parallel execution
    - Test rate limiting and quota enforcement

3.  **UI Tests**:
    - Verify all UI improvements across different browsers and screen sizes
    - Test the review page with different document types
    - Ensure hover highlighting and extraction editing works reliably

4.  **Performance Testing**:
    - Measure extraction times before and after improvements
    - Test with large batches and multi-page documents
    - Verify caching improves performance for similar documents

## Deployment Strategy

1.  **Phased Rollout**:
    - Deploy preprocessing improvements first
    - Follow with prompt engineering and model improvements
    - Add document-specific enhancements
    - Finally, deploy UI improvements

2.  **Feature Flags**:
    - Use feature flags to enable/disable new functionality
    - Allow gradual rollout of risky features
    - Provide opt-in for advanced features

3.  **Monitoring**:
    - Add detailed logging for all new components
    - Set up alerts for extraction failures and performance issues
    - Monitor usage patterns to identify bottlenecks

## Conclusion

This implementation plan provides a comprehensive approach to enhancing Ingestio's document extraction capabilities. By focusing on preprocessing, intelligent prompt engineering, and flexible schemas, Ingestio can adapt to new document types while maintaining high accuracy for existing ones. The improvements to multi-page handling, usage tracking, and UI will create a more intuitive and transparent user experience.
