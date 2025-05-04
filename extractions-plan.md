---

**Ingestio.io Document Extraction Improvement Plan (Revised & Integrated - Full Detail)**

**Project:** Ingestio.io - AI Document Data Extraction

**Goal:** Enhance the existing document extraction capabilities to create a more robust, accurate, flexible, and scalable solution that handles diverse document types effectively, ensures consistent data handling, and respects user intent via prompts.

**Current Architecture Overview:**
Ingestio currently uses Google Vertex AI (Gemini 2.0 Flash), Sane Stripe/KV store, Redis rate limiting, Supabase DB/Storage, and Clerk Auth. Extraction actions exist but need refinement for robustness and flexibility.

**Implementation Plan:**

---

### Section 0: Immediate Codebase Alignment & Cleanup  
*These are quick wins discovered after reading the current repo. Completing them first will prevent churn while the larger refactor is underway.*  

*   [x] **Step 0.1: Remove Legacy Field-Filtering Helpers**  
    *   **Task**: Delete the now-obsolete `parseRequestedFields` and `filterExtractedData` helpers and all of their imports.  
    *   **Files**:  
        *   `prompts/extraction.ts` – **delete** the two helper functions and any exports.  
        *   `actions/ai/extraction-actions.ts` – **remove** the `import { filterExtractedData, parseRequestedFields }` line and the corresponding runtime calls (≈ lines 460-480).  
    *   **Rationale**: Step 2.4 relies on the AI to do the filtering. Removing these helpers early avoids merge conflicts with the later prompt work.

*   [x] **Step 0.2: Centralise Common Types**  
    *   **Task**: Extract the inline `PositionData`, `HighlightRect`, `FieldData` etc. interfaces that are currently repeated in multiple components into a shared type file.  
    *   **Files**:  
        *   `types/ui/highlighting.ts` (New) – define `BoundingBox`, `PositionData`, `HighlightRect`.  
        *   Update imports in:  
            *   `components/utilities/DataVisualizer.tsx`  
            *   `components/utilities/InteractiveDataField.tsx`  
            *   `components/utilities/PdfHighlightLayer.tsx`  
            *   `components/utilities/DocumentViewer.tsx`  
    *   **Benefit**: Keeps the upcoming bounding-box refactor DRY.

---

### Section 1: Document Preprocessing Enhancements

*   [x] **Step 1.1: Implement Document Segmentation**
    *   **Task**: Create a preprocessing utility that segments large documents into manageable chunks before sending them to the AI.
    *   **Files**:
        *   `lib/preprocessing/document-segmentation.ts` (New File): Implement logic to split documents (e.g., PDFs) into segments (e.g., 10-20 pages each). Consider logical breaks if possible.
        *   `actions/ai/extraction-actions.ts` (Modify): Update the main extraction action to detect large documents (based on `pageCount`), call the segmentation utility, process each segment individually (potentially in parallel or sequentially), and implement a strategy to merge the extracted results from different segments accurately. Ensure quota checks handle segmented processing correctly (e.g., check total pages upfront or check per segment).
    *   **User Instructions**: Add segmentation logic that respects document structure where possible. Track each segment's pages against user quota during processing.

*   [ ] **Step 1.2: Implement Image Preprocessing**
    *   **Task**: Add preprocessing steps for image-based documents or low-quality scans to improve OCR/extraction accuracy.
    *   **Files**:
        *   `lib/preprocessing/image-enhancement.ts` (New File): Implement functions for contrast enhancement, deskewing, noise reduction, and potentially binarization using libraries like Sharp or an external API.
        *   `actions/ai/extraction-actions.ts` (Modify): Integrate calls to the image enhancement functions conditionally, perhaps based on initial quality assessment or file type.
    *   **User Instructions**: Integrate with image processing libraries (e.g., Sharp) or service APIs. Apply enhancements selectively based on detected image quality or user options.

*   [ ] **Step 1.3: Add Language Detection**
    *   **Task**: Implement automatic language detection to tailor prompts and potentially models for multilingual documents.
    *   **Files**:
        *   `lib/preprocessing/language-detection.ts` (New File): Implement language detection, possibly using a lightweight library or a quick initial call to the Vertex AI model itself with a specific prompt for language identification.
        *   `prompts/extraction.ts` (Modify): Update prompt generation logic to incorporate detected language hints.
        *   `actions/ai/extraction-actions.ts` (Modify): Call the language detection utility early in the process. Pass the detected language to prompt generation functions and potentially store it in `extraction_jobs` or `extracted_data`.
    *   **User Instructions**: Detect language before the main extraction pass. Use the detected language to potentially select language-specific prompts or add hints to the AI (e.g., "The following document is in French. Extract...").

---

### Section 2: Advanced Prompt Engineering & AI Interaction

*   [ ] **Step 2.1: Implement Two-Stage Extraction**
    *   **Task**: Refactor the extraction flow into a two-pass approach: first classify the document, then perform targeted extraction based on the classification.
    *   **Files**:
        *   `actions/ai/extraction-actions.ts` (Modify): Orchestrate the two-stage process. Call a classification step first, then use the result to inform the main extraction call.
        *   `prompts/classification.ts` (New File): Define prompts specifically designed to ask the AI to classify the document type (e.g., "Is this an invoice, receipt, resume, contract, or other?") and potentially identify key structural elements.
        *   `prompts/extraction.ts` (Modify): Refine extraction prompts to be more effective when potentially receiving the document type as input context.
    *   **User Instructions**: Implement the first pass for classification. Use the classification result (e.g., 'invoice') in the second pass to select a more specific default prompt (via `getDefaultPrompt`) or add context to the user's custom prompt before enhancement.


*   [x] **Step 2.2: Define Flexible System Instructions**
    *   **Task**: Update `SYSTEM_INSTRUCTIONS` in `prompts/extraction.ts` to be general yet directive, focusing on following user requests and output format, explicitly forbidding positional data in the final output.
    *   **Files**: `prompts/extraction.ts` (Modify `SYSTEM_INSTRUCTIONS`).
    *   **Rationale**: Guides the AI consistently across all document types without relying on specific examples. Addresses the requirement to exclude positional data.
    *   **User Instructions**: Update `SYSTEM_INSTRUCTIONS` with directives like:
        ```
        You are an AI assistant specialized in extracting structured data from ANY document type based on user instructions.
        CRITICAL INSTRUCTIONS:
        1. Adhere Strictly to User Request: Extract ONLY the fields and information explicitly mentioned or clearly implied by the user's prompt below. Do NOT include any extra fields, even if common for the document type, unless the user asks for 'all information' or similar broad terms.
        2. Output Format: ALWAYS return the final result as a single, valid JSON object starting with '{' and ending with '}'. Do NOT wrap the result in a top-level JSON array '[]'.
        3. NO Positional Data: Do NOT include any bounding box, coordinate, or positional information in the final JSON output provided to the user. Extract only the textual or numerical data values and their associated field names.
        4. Confidence Scores: Include a 'confidence' score (0.0-1.0) for each extracted value IF requested by the enhanced prompt.
        5. Data Integrity: If requested information is not found, use null for the value. Format dates as YYYY-MM-DD if possible. Extract currency symbols if present.
        ```

*   [x] **Step 2.3: Enhance Dynamic Prompt Generation (`enhancePrompt`)**
    *   **Task**: Update `enhancePrompt` to combine the `SYSTEM_INSTRUCTIONS`, the raw `userPrompt`, contextual hints (language), and flags for confidence/positions *for the AI's internal use only*.
    *   **Files**: `prompts/extraction.ts` (Update `enhancePrompt`).
    *   **Rationale**: Creates the final prompt sent to the AI, ensuring all necessary instructions are included.
    *   **User Instructions**:
        1.  Modify `enhancePrompt(userPrompt: string, includeConfidence: boolean, includePositions: boolean, detectedLanguage?: string)`:
        2.  Construct the final prompt string starting with `SYSTEM_INSTRUCTIONS`.
        3.  Add contextual hints: `Context: The document appears to be in [detectedLanguage || 'Unknown']. The user's request is:`
        4.  Append the raw `userPrompt`.
        5.  Append instructions based on flags *only if needed for internal AI reasoning, but reiterate exclusion from final output*:
            *   If `includeConfidence`: "Internally, assign a confidence score (0.0-1.0) to each value." (The system instruction already forbids it in the output).
            *   If `includePositions`: "Internally, note the position (page number, bounding box) for each value." (The system instruction already forbids it in the output).
        6.  Return the fully constructed prompt string.

*   [ ] **Step 2.4: Remove Client-Side Filtering Logic (NOW MIGRATED TO SECTION 0.1)**  
    *   **Action**: Follow Step 0.1 to physically delete `parseRequestedFields` / `filterExtractedData` and their usages.

---

### Section 3: Schema, Model, and Output Handling Improvements

*   [ ] **Step 3.1: Implement Adaptive Schemas**
    *   **Task**: Create dynamic schema generation capabilities, potentially allowing schemas to evolve based on initial extraction results or document analysis.
    *   **Files**: `actions/ai/schema.ts` (Modify), `lib/schema/adaptive-schema.ts` (New File).
    *   **Implementation Details**: Explore techniques where an initial AI pass suggests a schema, which is then refined or used for a second extraction pass. Consider schema versioning if schemas change over time for the same document type. Add dynamic validation based on detected document type.
    *   **User Instructions**: Design a system where the schema used for `generateObject` can be dynamically determined or refined based on the specific document being processed.

*   [ ] **Step 3.2: Implement Multi-Model Approach**
    *   **Task**: Implement logic to select the most appropriate AI model based on document characteristics or task complexity.
    *   **Files**: `lib/ai/vertex-client.ts` (Modify/Add models), `actions/ai/extraction-actions.ts` (Modify).
    *   **Implementation Details**: Define criteria (e.g., document type, length, language, required accuracy) for model selection. Update `getVertexModel`/`getVertexStructuredModel` or add a new routing function. Implement fallback logic to try a different model if the primary one fails. Consider strategies for combining results if multiple models are used.
    *   **User Instructions**: Create a model router function. Define logic for selecting models (e.g., use Flash for simple tasks, Pro for complex tables/layouts).

*   [ ] **Step 3.3: Enhance Confidence Scoring**
    *   **Task**: Improve the reliability and utility of confidence scores provided by the AI.
    *   **Files**: `actions/ai/extraction-actions.ts` (Modify), `lib/ai/confidence-scoring.ts` (New File).
    *   **Implementation Details**: If the AI model provides token-level probabilities, investigate how to aggregate these into field-level confidence scores. Implement normalization if using multiple models to ensure scores are comparable. Define confidence thresholds to automatically flag fields needing human review in the UI.
    *   **User Instructions**: Research if Vertex AI models used provide token probabilities. Implement normalization logic. Add threshold checks for review routing.

*   [ ] **Step 3.4: Handle AI Output Variations & Normalize Structure**
    *   **Task**: Make the primary AI call (`generateObject`) more resilient to array-vs-object responses and ensure data saved to the database (`extracted_data.data`) is consistently a single JSON object.
    *   **Files**: `actions/ai/extraction-actions.ts` (Modify).
    *   **Instructions**:
        1.  **Define Flexible Schema:** Inside `extractDocumentDataAction`, define a Zod schema (`flexibleOutputSchema`) using `z.union()` that accepts *either* the expected object structure (`baseExtractionSchema` - e.g., `z.record(z.any())`) *or* an array of that structure (`z.array(baseExtractionSchema).min(1)`).
        2.  **Use Flexible Schema:** Pass this `flexibleOutputSchema` to the `generateObject` call's `schema` option.
        3.  **Normalize After `generateObject`:** After a successful `generateObject` call (`result.object`), check if the result (`rawExtractedData`) is an array. Normalize it to a single object (`normalizedData`) using the logic: single-element array becomes the object, multi-element array gets wrapped (e.g., `{ "results": [...] }`), empty array becomes `{}`.
        4.  **Normalize After `generateText` Fallback:** In the `catch` block for `generateObject`, after parsing the JSON from the `generateText` response (`parsedJson`), apply the *same normalization logic* as above to `parsedJson` to get `normalizedData`. Handle potential JSON parsing errors by storing raw text.
        5.  **Save Normalized Data:** Ensure the `extracted_data` table insertion uses the final `normalizedData` object for the `data` column. (Ensure `filterExtractedData` call is removed per Step 2.4).
    *   **Goal:** Prevent `generateObject` from failing solely due to the array vs. object format mismatch and ensure the database always stores a consistent object structure.

---

### Section 4: Processing Pipeline Enhancements

*   [ ] **Step 4.1: Implement Parallel Processing**
    *   **Task**: Enhance batch processing capabilities to handle multiple documents concurrently.
    *   **Files**: `actions/batch/batch-extraction-actions.ts` (Modify), `app/api/batch-processor/route.ts` (Modify), `lib/processing/worker-pool.ts` (New File or integrate library).
    *   **Implementation Details**: Refactor the batch processor API route to fetch pending documents and distribute them to multiple processing units (e.g., Vercel Serverless Functions invoked asynchronously, or a dedicated queue/worker system if scaling demands). Implement locking mechanisms to prevent duplicate processing. Consider priority queues.
    *   **User Instructions**: Design and implement a system (e.g., using queues like BullMQ with Redis, or simpler async function invocations) to process documents within a batch in parallel, respecting overall rate limits and quotas.

*   [ ] **Step 4.2: Implement Document Caching Strategy**
    *   **Task**: Introduce caching to avoid reprocessing identical or very similar documents with the same prompt.
    *   **Files**: `lib/caching/document-cache.ts` (New File), `actions/ai/extraction-actions.ts` (Modify).
    *   **Implementation Details**: Develop a document fingerprinting mechanism (e.g., hashing file content). Before calling the AI, check a cache (e.g., Redis) using a key derived from the fingerprint and the extraction prompt hash. If a valid result exists, return it. Otherwise, proceed with extraction and store the result in the cache with a TTL.
    *   **User Instructions**: Implement fingerprinting. Use Redis for caching extraction results. Add cache check/store logic to `extractDocumentDataAction`.

*   [ ] **Step 4.3: Enhance Error Recovery**
    *   **Task**: Improve how the system handles transient AI errors or failures during extraction.
    *   **Files**: `actions/ai/extraction-actions.ts` (Modify), `lib/error-handling/extraction-recovery.ts` (New File or integrate library).
    *   **Implementation Details**: Implement automatic retries (e.g., using an exponential backoff strategy) for specific types of AI errors (e.g., temporary unavailability, rate limits). Consider trying a fallback model (Step 3.2) on persistent failure. For partial successes (e.g., some fields extracted before error), save the partial data to `extracted_data` and mark the job/document status appropriately (e.g., 'failed_partial').
    *   **User Instructions**: Add retry logic (e.g., using `p-retry` library) around AI calls. Implement saving partial results on failure.

---

### Section 5: Document-Type Specific Improvements

*   [ ] **Step 5.1: Enhance Invoice and Receipt Extraction**
    *   **Task**: Improve extraction accuracy and structure for financial documents.
    *   **Files**: `prompts/extraction.ts` (Modify/Add specific prompts), `actions/ai/extraction-actions.ts` (Potentially add specific logic/schemas).
    *   **Implementation Details**: Focus prompts on accurately identifying and structuring line items (description, quantity, unit price, total). Add prompts/logic to validate totals (subtotal + tax = total). Handle multiple currencies. Extract payment terms.
    *   **User Instructions**: Refine prompts for invoices/receipts. Consider using more structured Zod schemas within `generateObject` specifically for these types if document classification (Step 2.1) is implemented.

*   [ ] **Step 5.2: Enhance Form and Application Extraction**
    *   **Task**: Improve extraction for documents with clear form structures.
    *   **Files**: `prompts/extraction.ts` (Modify/Add specific prompts), `actions/ai/extraction-actions.ts`.
    *   **Implementation Details**: Prompt the AI to identify field labels and their corresponding values, maintaining the form's inherent structure. Add specific instructions for handling checkboxes, radio buttons (extracting the selected option). Include signature detection prompts if needed.
    *   **User Instructions**: Develop prompts tailored to form structures. Instruct AI to map labels to values accurately.

*   [ ] **Step 5.3: Add Contract and Legal Document Extraction**
    *   **Task**: Implement capabilities for extracting key information from legal documents.
    *   **Files**: `prompts/extraction.ts` (Add new prompts), `actions/ai/contract-extraction-actions.ts` (Potentially New File for specialized logic).
    *   **Implementation Details**: Create prompts to identify and classify clauses (e.g., termination, liability). Extract named entities (parties involved). Extract key dates, terms, and conditions.
    *   **User Instructions**: Define prompts for common legal document elements.

*   [ ] **Step 5.4: Enhance Resume and CV Extraction**
    *   **Task**: Improve the detail and structure of data extracted from resumes.
    *   **Files**: `prompts/extraction.ts` (Modify resume prompt), `actions/ai/extraction-actions.ts`.
    *   **Implementation Details**: Refine prompts to extract skills and potentially map them to a standard taxonomy. Structure work experience chronologically. Extract education details including GPA/honors. Identify certifications and languages with proficiency levels.
    *   **User Instructions**: Enhance resume prompts for greater detail and structure, especially for skills and work history timelines.

---

### Section 6: Result Validation and Enhancement

*   [ ] **Step 6.1: Implement Business Rule Validation**
    *   **Task**: Add a layer of validation beyond basic schema checks, based on domain-specific rules.
    *   **Files**: `lib/validation/business-rules.ts` (New File), `actions/ai/extraction-actions.ts` (Modify).
    *   **Implementation Details**: Create a framework to define and apply rules (e.g., "invoice total must equal sum of line items + tax", "end date must be after start date"). Run these validations *after* successful AI extraction. Flag invalid data in the results or UI. Standardize formats (dates, numbers, addresses).
    *   **User Instructions**: Implement a validation function called after AI extraction. Define rules for common document types.

*   [ ] **Step 6.2: Implement Data Postprocessing**
    *   **Task**: Add steps to clean, normalize, or enrich extracted data after validation.
    *   **Files**: `lib/postprocessing/data-normalization.ts` (New File), `actions/ai/extraction-actions.ts` (Modify).
    *   **Implementation Details**: Implement functions for tasks like resolving different names for the same entity, standardizing addresses, removing extraneous characters, or potentially enriching data by calling external APIs (use with caution regarding cost/latency).
    *   **User Instructions**: Create postprocessing functions called after successful validation.

*   [ ] **Step 6.3: Improve Human-in-the-Loop Workflow**
    *   **Task**: Enhance the Review page UI to better support manual verification and correction.
    *   **Files**: `app/(dashboard)/dashboard/review/[id]/page.tsx` (Modify), `components/utilities/DataVisualizer.tsx` (Modify).
    *   **Implementation Details**: Clearly highlight fields with low confidence scores (using enhanced scoring from Step 3.3). Make editing fields in `DataVisualizer` more intuitive. Implement a "Confirm" or "Approve" action that potentially updates the document status and could provide feedback to the AI models (if supported).
    *   **User Instructions**: Improve UI clarity for review. Implement inline editing and a confirmation workflow.

---

### Section 7: Multi-Page PDF and Usage Improvements

*   [ ] **Step 7.1: Fix Multi-Page PDF Viewer**
    *   **Task**: Update the PDF viewer components to correctly render and navigate multi-page documents.
    *   **Files**: `components/utilities/PdfViewer.tsx` (If used directly), `components/utilities/PdfViewerUrl.tsx` (Modify).
    *   **Implementation Details**: Ensure `react-pdf`'s `Document` and `Page` components are used correctly to handle multiple pages. Add UI controls (e.g., buttons, input field) for page navigation (Next, Previous, Go to Page #). Display the current page number and total pages. Ensure highlights (Step 7.4) work correctly across pages.
    *   **User Instructions**: Implement page navigation controls and ensure correct rendering of all pages in `PdfViewerUrl.tsx`.

*   [x] **Step 7.2: Update Page Usage Logic** *(Completed via Page Count Fix Plan P1-P3)*
    *   **Summary**: Server-side page counting is implemented, and usage is incremented accurately post-extraction based on the correct page count.

*   [ ] **Step 7.3: Add Option to Export Without Bounding Boxes**
    *   **Task**: Provide a user option during data export to include or exclude positional (bounding box) data.
    *   **Files**: `actions/db/documents.ts` (Modify or add new export action), `app/(dashboard)/dashboard/review/[id]/page.tsx` (Modify export dialog/trigger).
    *   **Implementation Details**: Add a checkbox or toggle in the export UI (e.g., the Export Dialog). Pass this preference to the server action responsible for generating the export file. In the action, if the option is unchecked, recursively strip the `position` property from the extracted data *before* formatting it as JSON/CSV/Excel.
    *   **User Instructions**: Add UI option for including position data. Implement server-side filtering logic in the export action.

*   [ ] **Step 7.4: Fix Data Highlighting on Hover**
    *   **Task**: Ensure hovering over a field in `DataVisualizer` correctly and smoothly highlights the corresponding area in the `DocumentViewer`.
    *   **Files**: `components/utilities/DataVisualizer.tsx` (Modify `onHighlight` prop handling), `components/utilities/PdfHighlightLayer.tsx` (Modify styling/rendering), `app/(dashboard)/dashboard/review/[id]/page.tsx` (Manage state linking).
    *   **Implementation Details**: Refine the state management (`currentHighlight`) in the Review page. Ensure `DataVisualizer` correctly emits highlight events with accurate position data. Ensure `DocumentViewer`/`PdfHighlightLayer` receives the highlight prop and renders the highlight box correctly, potentially scrolling the relevant page/area into view (`scrollIntoView({ behavior: 'smooth', block: 'center' })`). Improve visual styling of the highlight (e.g., subtle pulse, clear border).
    *   **User Instructions**: Debug the state flow between `DataVisualizer` hover and `DocumentViewer` highlight rendering. Implement smooth scrolling to the highlighted area.

---

### Section 8: UI and Experience Improvements

*   [ ] **Step 8.1: Fix History Page Cache Issue**
    *   **Task**: Resolve issues where recently processed documents might not appear immediately in the History page due to caching.
    *   **Files**: `actions/db/documents.ts` (Review `fetchUserDocumentsAction`), `app/(dashboard)/dashboard/history/page.tsx` (Modify data fetching/revalidation).
    *   **Implementation Details**: Investigate if `revalidatePath` calls in upload/extraction actions are sufficient. Consider using `router.refresh()` on the client-side after actions complete, or implementing more targeted revalidation if needed. Ensure sorting by timestamp in `fetchUserDocumentsAction` is correct. Add a manual "Refresh" button as a fallback.
    *   **User Instructions**: Ensure history updates promptly after document processing. Add manual refresh if necessary.

*   [ ] **Step 8.2: Improve History Page UI**
    *   **Task**: Enhance the visual design and functionality of the History page.
    *   **Files**: `app/(dashboard)/dashboard/history/page.tsx` (Modify).
    *   **Implementation Details**: Implement robust client-side or server-side filtering/sorting options (Status, Date Range, Type). Improve the visual presentation of document list items or cards. Consider adding bulk actions (e.g., delete multiple). Improve loading and empty states.
    *   **User Instructions**: Refine the History page UI for better clarity, filtering, and potentially bulk operations.

*   [ ] **Step 8.3: Improve Metrics Page**
    *   **Task**: Enhance the Metrics page with more detailed statistics and visualizations.
    *   **Files**: `app/(dashboard)/dashboard/metrics/page.tsx` (Modify), `actions/db/metrics-actions.ts` (Modify).
    *   **Implementation Details**: Add charts visualizing page usage trends over time. Display extraction success rates per document type. Show distribution of processing times. Ensure charts handle loading/empty states gracefully and have good contrast/accessibility.
    *   **User Instructions**: Add more insightful charts and stats to the Metrics page based on available data.

*   [ ] **Step 8.4: Improve Settings Page**
    *   **Task**: Enhance the Settings page with more user customization options related to extraction.
    *   **Files**: `app/(dashboard)/dashboard/settings/page.tsx` (Modify), `actions/db/users-actions.ts` (Modify `updateUserIdentityAction` if needed).
    *   **Implementation Details**: Add options for users to set default extraction preferences (e.g., always include confidence scores). Allow users to save and manage custom default prompts. Add preferences for default export formats. Store these settings in the `users.metadata` JSONB column.
    *   **User Instructions**: Add a "Extraction Preferences" section to the Settings page.

*   [ ] **Step 8.5: Improve Dashboard Page UI**
    *   **Task**: Enhance the main Dashboard page for a better overview and quick actions.
    *   **Files**: `app/(dashboard)/dashboard/page.tsx` (Modify).
    *   **Implementation Details**: Refine the display of key metrics (KPIs). Improve the "Recent Documents" list presentation. Ensure the "Quick Upload" action is prominent. Add visual cues for account status or quota warnings.
    *   **User Instructions**: Implement the refined Dashboard design focusing on clarity, actionability, and key information at a glance.

---

### Section 9: Bounding-Box & Segmentation Mask Refactor  
*A single, coherent approach for positional data across extraction, storage, and visualisation.*

*   [ ] **Step 9.1: Standardise Coordinate System**  
    *   **Decision**: All bounding boxes will be stored as **0-1000 normalised** arrays `[yMin, xMin, yMax, xMax]` (matching Google Gen-AI Vision output and the reference implementation in `bounding-box-example.md`).  
    *   **Type**: Re-export this as `type BoundingBox = [number, number, number, number];` in `types/ui/highlighting.ts` (created in Step 0.2).

*   [ ] **Step 9.2: Utility Helpers**  
    *   **Files**:  
        *   `lib/pdf/bounding-box-utils.ts` (New).  
        *   Functions:  
            ```ts
            export function normalisedToPixels(box: BoundingBox, pageWidth: number, pageHeight: number) {
              const [yMin, xMin, yMax, xMax] = box.map(v => v / 1000);
              const left   = xMin * pageWidth;
              const top    = yMin * pageHeight;
              const width  = (xMax - xMin) * pageWidth;
              const height = (yMax - yMin) * pageHeight;
              return { left, top, width, height };
            }
            ```  
        *   Add inverse helpers if future back-conversion is needed.

*   [ ] **Step 9.3: Update Extraction Pipeline**  
    *   **Files**:  
        *   `actions/ai/extraction-actions.ts` – Right after receiving `result.object`, run a post-process that ensures any absolute pixel boxes are converted to the 0-1000 format using page dimensions from the PDF `metadata.page_size` (already fetched in `extractDocumentDataAction`).  
    *   **Snippet**:  
        ```ts
        import { toNormalisedBox } from '@/lib/pdf/bounding-box-utils';
        // …
        if (includePositions && raw.position?.bounding_box?.length === 4) {
          raw.position.bounding_box = toNormalisedBox(
            raw.position.bounding_box,
            raw.position.page_width,
            raw.position.page_height
          );
        }
        ```

*   [ ] **Step 9.4: Migrate UI Components**  
    *   **Files & Changes**:  
        *   `components/utilities/PdfHighlightLayer.tsx` – replace percentage math with `normalisedToPixels`.  
        *   `components/utilities/DocumentViewer.tsx` – same as above for direct overlays.  
        *   `components/utilities/DataVisualizer.tsx` & `InteractiveDataField.tsx` – no functional changes, but update imports to use the shared `PositionData` type.  
    *   **Behavioural Check**: Verify that hover highlighting still aligns perfectly on various page sizes and zoom levels.

*   [ ] **Step 9.5: Optional Segmentation Mask Overlay**  
    *   **Task**: Add mask visualisation (semi-transparent PNG) similar to `bounding-box-example.md`.  
    *   **Files**:  
        *   `components/utilities/PdfMaskLayer.tsx` (New) – sibling to `PdfHighlightLayer.tsx`.  
        *   `app/(dashboard)/dashboard/review/[id]/page.tsx` – toggle layer visibility based on a "Show masks" switch.  
    *   **Note**: Store mask `data:image/png;base64,…` strings in `extracted_data.data.*.position.mask` where applicable. DB type is `text`.

*   [ ] **Step 9.6: Export Sanitisation**  
    *   **Files**: `actions/db/documents.ts` (export action).  
    *   **Logic**: When the user opts to exclude positional data (Step 7.3), strip **both** `bounding_box` **and** `mask` keys.

*   [ ] **Step 9.7: Back-Fill Existing Records (Optional)**  
    *   **Script**: `scripts/migrations/backfill-bounding-boxes.ts` – loop through past `extracted_data` rows, detect legacy percentage boxes, convert to 0-1000 normalised form, and update rows in chunks.

---

## Testing & Validation Plan (Updated Considerations)

1.  **Unit Tests**:
    *   Test new preprocessing utilities (Segmentation, Image Enhancement, Language Detection).
    *   Test prompt enhancement logic (Step 2.2).
    *   Test the flexible Zod schema (`flexibleOutputSchema`) (Step 3.4).
    *   Test the normalization logic (array vs. object) (Step 3.4).
    *   Test model routing logic (Step 3.2).
    *   Test confidence scoring/normalization (Step 3.3).
    *   Test business rule validation (Step 6.1).
    *   Test data postprocessing (Step 6.2).
2.  **Integration Tests**:
    *   Test `extractDocumentDataAction` mocking AI responses:
        *   Verify correct preprocessing steps are called based on input.
        *   Verify correct prompt is generated based on user input, detected type, language.
        *   Verify correct model is selected (if multi-model is implemented).
        *   Verify AI output variations are handled and normalized correctly (Step 3.4).
        *   Verify results are validated/postprocessed correctly (Steps 6.1, 6.2).
        *   Verify client-side filtering is removed and AI handles filtering (Step 2.4).
    *   Test batch processing with parallel workers (Step 4.1).
    *   Test caching mechanism (Step 4.2).
    *   Test error recovery and retry logic (Step 4.3).
3.  **UI/E2E Tests**:
    *   Test extraction with specific prompts ("extract only X") -> Verify *only* X appears (verifies Step 2.2 & 2.4).
    *   Test extraction with generic prompts ("extract all") -> Verify comprehensive data appears.
    *   Test extraction with documents requiring preprocessing (large PDFs, low-quality images, different languages) -> Verify success and accuracy.
    *   Test multi-page PDF viewer navigation and highlighting (Steps 7.1, 7.4).
    *   Test export option without bounding boxes (Step 7.3).
    *   Test the improved History, Metrics, Settings, and Dashboard UIs (Section 8).
    *   Test the human-in-the-loop review/edit workflow (Step 6.3).
4.  **Performance Testing**:
    *   Measure impact of preprocessing steps on overall time.
    *   Benchmark extraction time for different models (if multi-model implemented).
    *   Test cache hit rate and performance improvement (Step 4.2).
    *   Test batch processing throughput with parallel workers (Step 4.1).

---

### Section 10: Critical Bug Fixes for Production Readiness

*From analyzing console logs and runtime errors, several critical issues need immediate attention to stabilize the application.*

*   [x] **Step 10.1: Fix Next.js Params Handling**
    *   **Issue**: Runtime console warning about direct param access in `app/(dashboard)/dashboard/review/[id]/page.tsx`
    *   **Task**: Update all page components to use React.use() for accessing route parameters
    *   **Files**:
        *   `app/(dashboard)/dashboard/review/[id]/page.tsx` – Update line 98 from `const { id } = params;` to `const { id } = React.use(params);`
        *   Search the codebase for similar patterns in other dynamic route components
    *   **Implementation Details**: Add `import { use } from 'react';` to affected components and use `const { paramName } = use(params);` pattern
    Possible Ways to Fix It
The next-async-request-api codemod can fix many of these cases automatically:

Terminal

$ npx @next/codemod@canary next-async-request-api .
The codemod cannot cover all cases, so you may need to manually adjust some code.

If the warning occurred on the Server (e.g. a route handler, or a Server Component), you must await the dynamic API to access its properties:

app/[id]/page.js

async function Page({ params }) {
  // asynchronous access of `params.id`.
  const { id } = await params
  return <p>ID: {id}</p>
}
If the warning occurred in a synchronous component (e.g. a Client component), you must use React.use() to unwrap the Promise first:

app/[id]/page.js

'use client'
import * as React from 'react'
 
function Page({ params }) {
  // asynchronous access of `params.id`.
  const { id } = React.use(params)
  return <p>ID: {id}</p>
}


*   [x] **Step 10.2: Fix Supabase Cookie Handling**
    *   **Issue**: Synchronous cookie access causing recurring warnings `cookies().get(...) should be awaited`
    *   **Files**: `lib/supabase/server.ts` (Modified)
    *   **Implementation Details**:
        ```ts
        // Update the cookies implementation to use async/await
        cookies: {
          async get(name) {
            const cookieValue = await cookieStore.get(name);
            return cookieValue?.value;
          },
          async set(name, value, options) {
            try {
              await cookieStore.set(name, value, options);
            } catch (error) {
              // Handle cookies set error in middleware
            }
          },
          async remove(name, options) {
            try {
              await cookieStore.set(name, "", { ...options, maxAge: 0 });
            } catch (error) {
              // Handle cookies removal error
            }
          }
        }
        ```

*   [x] **Step 10.3: Fix PDF Viewer Null Reference Error**
    *   **Issue**: Runtime error: "Cannot read properties of null (reading 'sendWithPromise')" in `PdfViewerUrl.tsx`
    *   **Files**: `components/utilities/PdfViewerUrl.tsx` (Modified)
    *   **Implementation Details**: 
        1. Add proper null checking before PDF document/page access
        2. Implement better loading state management
        3. Add error boundary to prevent crashes
        ```tsx
        // Add conditional rendering with null checks
        {numPages > 0 && (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            options={options}
            loading={<div className="text-center py-4">Loading PDF...</div>}
          >
            {Array.from(new Array(numPages), (_el, index) => {
              const pageNumber = index + 1;
              return (
                <div 
                  key={`page_container_${pageNumber}`} 
                  className="relative mb-4"
                  ref={refCallbacks[index]}
                >
                  {/* Only render Page when container width is available */}
                  {containerWidth && (
                    <Page
                      key={`page_${pageNumber}`}
                      pageNumber={pageNumber}
                      width={containerWidth}
                      {...pageProps}
                    />
                  )}
                  {/* ...rest of the code */}
                </div>
              );
            })}
          </Document>
        )}
        ```

*   [] **Step 10.4: Fix Array vs Object Extraction Response (URGENT)**
    *   **Issue**: AI extraction fails with: "Expected object, received array" (validating Step 3.4's importance)
    *   **Logs Snippet**: `[{"salesman_name":{"value":"JESSE TURNER","confidence":0.95,"position":{"page_number":1,"bounding_box":[83,345,319,787]}}}]`
    *   **Files**: `actions/ai/extraction-actions.ts` (Modified)
    *   **Implementation Details**: 
        1. Create a flexible schema that accepts both object and array responses
        2. Add normalization logic to convert arrays to objects
        ```ts
        // Define flexible schema
        const flexibleOutputSchema = z.union([
          z.record(z.any()), // Object format
          z.array(z.record(z.any())).min(1) // Array format
        ]);

        // Use schema in generateObject call
        const result = await generateObject({
          model: observableModel,
          messages: [{ role: "user", content: enhancedPrompt }],
          schema: flexibleOutputSchema,
        });

        // Normalize array to object if needed
        let normalizedData = result.object;
        if (Array.isArray(normalizedData)) {
          if (normalizedData.length === 1) {
            // Single item array becomes the object
            normalizedData = normalizedData[0];
          } else if (normalizedData.length > 1) {
            // Multiple items get wrapped
            normalizedData = { results: normalizedData };
          } else {
            // Empty array becomes empty object
            normalizedData = {};
          }
        }
        
        // Continue with normalized data
        ```

*   [x] **Step 10.5: Fix Extraction Jobs Table Schema Issue**
    *   **Issue**: Database error: "Could not find the 'data' column of 'extraction_jobs' in the schema cache"
    *   **Files**: 
        *   `db/schema/extraction-jobs-schema.ts` (Verify column exists)
    *   **Implementation Details**:
        1. Verify schema definition has `data` column
        2. Add migration to add column if missing
        3. Update related code to use correct column names

*   [ ] **Step 10.6: Implement Error Boundaries and Fallback UI**
    *   **Task**: Add React error boundaries to prevent full application crashes
    *   **Files**:
        *   `components/utilities/ErrorBoundary.tsx` (New)
        *   Apply to critical components:
           * PDF viewer
           * Data visualizer
           * Review page
    *   **Implementation Details**: Create a reusable error boundary component with appropriate fallback UI, then wrap key components for graceful error handling

*   [ ] **Step 10.7: Add Comprehensive Error Logging**
    *   **Task**: Implement structured logging for all critical operations
    *   **Files**:
        *   `lib/monitoring/logger.ts` (New or enhance existing)
        *   Apply to extraction actions, document loading, and other critical paths
    *   **Implementation Details**: Create a standardized logger with severity levels, structured metadata, and optional integration with external monitoring services

---

