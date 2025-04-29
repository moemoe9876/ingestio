Okay, let's create a detailed plan to address the AI extraction issues (Problems 2, 3, and 4) focusing on creating a robust and flexible system capable of handling diverse documents, as requested.

---

**Implementation Plan: Enhance AI Extraction Robustness and Flexibility**

**Goal:** Refactor the AI data extraction process (`extractDocumentDataAction`) to reliably handle various document types and user prompts, ensuring consistent data structure storage while maximizing the accuracy and relevance of extracted information. This involves making the primary AI call (`generateObject`) more resilient, improving fallback handling, and delegating field filtering responsibility to the AI.

**Context:** The current `extractDocumentDataAction` sometimes fails when using `generateObject` because the AI returns a JSON array (`[{...}]`) instead of the expected JSON object (`{...}`). This forces a fallback to `generateText`, which can lead to inconsistencies in the data structure stored in the `extracted_data` table. Additionally, the current method of parsing the user's prompt to filter fields (`parseRequestedFields`, `filterExtractedData`) is not robust enough for varied natural language requests.

---

### Problem 2: `generateObject` Failure (Array vs. Object Mismatch)

*   **Issue:** The `generateObject` function in `actions/ai/extraction-actions.ts` uses a schema (`z.record(z.any())`) that expects a single JSON object as output. However, the AI model sometimes returns a JSON array containing a single object (e.g., `[{ "field": "value" }]`), causing the schema validation within `generateObject` to fail (`AI_TypeValidationError: Expected object, received array`).
*   **Why it Matters:** This forces the code into the less reliable `generateText` fallback path even when the AI *did* successfully extract the data, just in a slightly different top-level format.
*   **Goal:** Make the primary `generateObject` call more resilient by allowing it to accept either an object or a single-element array containing the expected object structure.

*   **Instructions for AI (Step E1): Enhance `generateObject` Schema**
    1.  **Modify File:** `actions/ai/extraction-actions.ts`.
    2.  **Locate:** The `extractDocumentDataAction` function.
    3.  **Define Schemas:**
        *   Keep or define a base schema representing the *expected structure of the data fields* themselves (including nested objects/arrays if applicable). Let's call this `baseExtractionSchema`. A generic starting point is `z.record(z.any())`, but more specific schemas (like `invoiceSchema`, `resumeSchema` if you have them) are better if the document type is known or detected. For flexibility, let's use a generic one for now that allows nesting:
            ```typescript
            // Define a recursive helper type/schema if needed, or use z.any() for max flexibility initially
            const flexibleDataSchema: z.ZodTypeAny = z.lazy(() =>
              z.union([
                z.string(),
                z.number(),
                z.boolean(),
                z.null(),
                z.array(flexibleDataSchema),
                z.record(flexibleDataSchema)
              ])
            );
            const baseExtractionSchema = z.record(flexibleDataSchema);
            ```
        *   Define a **new top-level schema** that accepts *either* the `baseExtractionSchema` (an object) *or* an array containing *one or more* instances of `baseExtractionSchema`.
            ```typescript
            const flexibleOutputSchema = z.union([
              baseExtractionSchema, // Accepts { field: value, ... }
              z.array(baseExtractionSchema).min(1) // Accepts [{ field: value, ... }, ...]
            ]);
            ```
    4.  **Update `generateObject` Call:** Modify the `generateObject` call within the `try` block to use this new `flexibleOutputSchema`:
        ```typescript
        // Inside the try block for generateObject
        const result = await generateObject({
          model: observableModel,
          schema: flexibleOutputSchema, // Use the flexible union schema
          messages: [ /* ... your messages ... */ ]
        });

        // The result.object can now be EITHER an object OR an array of objects
        const rawExtractedData = result.object;
        ```
    5.  **Explain:** This change allows `generateObject` to successfully validate the AI's response whether it returns a single object or an array of objects, significantly reducing the chance of hitting the `AI_TypeValidationError` and needing the `generateText` fallback for this specific reason.

---

### Problem 3 & 4: Fallback Inconsistency & Storing Arrays

*   **Issue:** When `generateObject` fails (for the array reason or others) and the code falls back to `generateText`, the parsed result might be an array (e.g., `[{...}]`). The current logic might store this array directly in the `extracted_data.data` column, leading to inconsistent data structures (sometimes object, sometimes array).
*   **Why it Matters:** Code that later consumes data from the `extracted_data` table needs to handle both possible structures (object or array), adding complexity. We want a predictable object structure for easier processing.
*   **Goal:** Implement a normalization step *after* successful extraction (whether via `generateObject` or the `generateText` fallback) to ensure the data saved to the database is consistently a single JSON object.

*   **Instructions for AI (Step E2): Implement Post-Extraction Normalization**
    1.  **Modify File:** `actions/ai/extraction-actions.ts`.
    2.  **Locate:** The `extractDocumentDataAction` function.
    3.  **Apply After `generateObject` Success:** Inside the `try` block for `generateObject`, *after* successfully getting `rawExtractedData = result.object`:
        ```typescript
        const rawExtractedData = result.object;
        let normalizedData = rawExtractedData; // Start with the raw result

        // Normalize if it's an array
        if (Array.isArray(rawExtractedData)) {
            if (rawExtractedData.length === 1) {
                // If array has one object, extract that object
                normalizedData = rawExtractedData[0];
                console.log("[Normalization] Extracted single object from array response.");
            } else if (rawExtractedData.length > 1) {
                // If multiple objects, wrap them (or decide on other handling)
                console.warn("[Normalization] AI returned multiple objects in array. Wrapping under 'results' key.");
                normalizedData = { results: rawExtractedData };
            } else {
                // If empty array, treat as empty object or handle as needed
                console.warn("[Normalization] AI returned empty array. Storing empty object.");
                normalizedData = {};
            }
        }
        // 'normalizedData' now holds the object we want to store

        // Replace 'extractedData = filterExtractedData(...)' with the normalized version
        // Note: We will remove filterExtractedData entirely in the next step
        extractedData = normalizedData; // Temporarily assign here, will be refined in Step E3
        ```
    4.  **Apply After `generateText` Fallback Success:** Inside the `catch` block for `generateObject`, *after* successfully parsing the JSON from `textResult.text`:
        ```typescript
        // Inside the catch block for generateObject, after generateText
        try {
            const cleanedResponse = textResult.text.replace(/^```json\s*/, '')...trim();
            const parsedJson = JSON.parse(cleanedResponse);
            let normalizedData = parsedJson; // Start with parsed result

            // Normalize if it's an array
            if (Array.isArray(parsedJson)) {
                if (parsedJson.length === 1) {
                    normalizedData = parsedJson[0];
                    console.log("[Normalization Fallback] Extracted single object from array text response.");
                } else if (parsedJson.length > 1) {
                    console.warn("[Normalization Fallback] AI returned multiple objects in array text. Wrapping under 'results' key.");
                    normalizedData = { results: parsedJson };
                } else {
                    console.warn("[Normalization Fallback] AI returned empty array text. Storing empty object.");
                    normalizedData = {};
                }
            }
            // 'normalizedData' now holds the object we want to store

            // Replace 'extractedData = filterExtractedData(...)'
            // Note: We will remove filterExtractedData entirely in the next step
            extractedData = normalizedData; // Temporarily assign here, will be refined in Step E3

        } catch (parseError) {
            console.error("Failed to parse text fallback response:", parseError);
            extractedData = { raw_text: textResult.text }; // Keep raw text fallback
        }
        ```
    5.  **Update Database Insertion:** Ensure the `db.from('extracted_data').insert(...)` call uses the `normalizedData` (or the final `extractedData` variable after normalization) for the `data` column.
    6.  **Explain:** This normalization step guarantees that, regardless of whether the AI returns an object or an array (via `generateObject` or `generateText`), the data ultimately saved in the `extracted_data` table is consistently structured as a single JSON object, simplifying downstream processing.

---

### Problem 4 (Implicit): Ineffective Prompt Parsing & Filtering

*   **Issue:** The current `parseRequestedFields` function uses simple string matching/splitting, which failed to identify "salesman name" as a requested field. This means the subsequent `filterExtractedData` function likely returned *all* data extracted by the AI, not just the specific field(s) the user intended.
*   **Why it Matters:** Users expect the AI to follow instructions. If they ask for specific fields but get everything, it's confusing and inefficient. Relying on client-side filtering after getting *all* data from the AI is also less efficient.
*   **Goal:** Delegate the responsibility of filtering fields to the AI itself by refining the prompt structure. Remove the brittle client-side parsing and filtering logic.

*   **Instructions for AI (Step E3): Delegate Field Filtering to AI**
    1.  **Modify File:** `prompts/extraction.ts`.
    2.  **Update `SYSTEM_INSTRUCTIONS` or `enhancePrompt`:** Add/strengthen the instruction telling the AI to *only* return the fields specified in the user's prompt. Make it very explicit.
        *   **Example Addition to `SYSTEM_INSTRUCTIONS`:**
            ```
            "CRITICAL: Adhere strictly to the user's request. Extract ONLY the fields explicitly mentioned or implied by the user's prompt. Do not include any extra fields, even if they seem relevant to the document type, unless the user asks for 'all information' or similar broad terms. If the user asks for 'salesman name', return ONLY the salesman name field in the JSON."
            ```
        *   **Alternatively, add to `enhancePrompt`:** Ensure the final combined prompt clearly instructs the AI about this filtering requirement based on the `userPromptText`.
    3.  **Modify File:** `actions/ai/extraction-actions.ts`.
    4.  **Remove Client-Side Filtering:**
        *   Delete the `parseRequestedFields` function call: `const requestedFields = parseRequestedFields(userPromptText);`
        *   Delete the `filterExtractedData` function call: `extractedData = filterExtractedData(normalizedData, requestedFields);`
        *   Directly use the `normalizedData` (from Step E2) as the final `extractedData` to be saved:
            ```typescript
            // After normalization logic from Step E2...
            extractedData = normalizedData; // Use the normalized data directly
            ```
    5.  **Remove Utility Functions:** Delete the `parseRequestedFields` and `filterExtractedData` functions entirely from `prompts/extraction.ts` as they are no longer needed.
    6.  **Explain:** By instructing the AI within the prompt to perform the filtering, we leverage its understanding of the request directly. This removes the need for complex and potentially inaccurate client-side parsing (`parseRequestedFields`) and filtering (`filterExtractedData`), simplifying the application code and improving the likelihood that the user receives exactly what they asked for. The normalization step (E2) still ensures a consistent object structure is saved.

---

### Step E4: Testing and Verification

*   [ ] **Task**: Thoroughly test the refactored extraction action with various scenarios.
*   [ ] **Goal**: Confirm that the AI correctly returns data (object or array handled), normalization works, filtering is done by the AI based on the prompt, and the correct object structure is saved.
*   **Instructions**:
    1.  **Test Case: Array Return:** Use a prompt/document combination known to previously cause the AI to return `[{...}]`. Verify `generateObject` now succeeds (using the `flexibleOutputSchema`) and the normalization step correctly extracts the single object before saving. Check the `extracted_data` table to confirm an object `{...}` was saved, not an array.
    2.  **Test Case: Object Return:** Use a prompt/document where the AI returns `{...}`. Verify `generateObject` succeeds and the data is saved correctly as an object.
    3.  **Test Case: Specific Field Prompt:** Use a prompt like "Extract only the invoice number and total amount". Verify the `extracted_data` record contains *only* those fields (or closely related ones as interpreted by the AI), not all possible invoice fields.
    4.  **Test Case: Generic Prompt:** Use a prompt like "Extract all information from this invoice". Verify the `extracted_data` record contains a comprehensive set of fields relevant to an invoice.
    5.  **Test Case: Fallback Scenario:** (If possible to trigger) Force `generateObject` to fail for a reason *other* than the array/object mismatch (e.g., model error, timeout). Verify the `generateText` fallback runs, the normalization step attempts to process its output, and either a normalized object or `{ raw_text: "..." }` is saved.
    6.  **Test Case: Different Document Types:** Test with invoices, receipts, resumes, etc., using both specific and generic prompts to ensure flexibility.

---

By implementing these steps (E1, E2, E3), you will create a more resilient extraction pipeline that handles AI output variations gracefully, ensures consistent data storage, and leverages the AI more effectively for interpreting user requests, leading to a more robust and flexible system overall. Remember to test thoroughly (E4) after implementation.