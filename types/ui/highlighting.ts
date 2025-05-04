/**
 * Shared types for document highlighting and positional data.
 */

/**
 * Represents a bounding box using 0-1000 normalized coordinates.
 * Format: [yMin, xMin, yMax, xMax]
 */
export type BoundingBox = [number, number, number, number];

/**
 * Contains position information for an extracted element, including
 * the page number and its normalized bounding box.
 */
export interface PositionData {
  page_number: number;
  bounding_box: BoundingBox;
}

/**
 * Represents a highlight rectangle to be displayed on the document viewer.
 * Uses normalized BoundingBox coordinates.
 */
export interface HighlightRect {
  pageNumber: number;
  boundingBox: BoundingBox;
  color?: string;
  id: string; // Unique identifier for the highlight
} 