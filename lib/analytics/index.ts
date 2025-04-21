// Re-export all analytics helpers
export * from './client';
export * from './server';

// Common event names for consistent tracking
export const ANALYTICS_EVENTS = {
  // Auth events
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',
  
  // Document events
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_PROCESSED: 'document_processed',
  DOCUMENT_REVIEWED: 'document_reviewed',
  DOCUMENT_EXPORTED: 'document_exported',
  DOCUMENT_DELETED: 'document_deleted',
  
  // Batch events
  BATCH_CREATED: 'batch_created',
  BATCH_PROCESSED: 'batch_processed',
  
  // Subscription events
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CHANGED: 'subscription_changed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  
  // Feature usage events
  SCHEMA_GENERATED: 'schema_generated',
  CUSTOM_TEMPLATE_CREATED: 'custom_template_created',
  API_KEY_CREATED: 'api_key_created',
  
  // Extraction events
  EXTRACTION_STARTED: 'extraction_started',
  EXTRACTION_COMPLETED: 'extraction_completed',
  EXTRACTION_FAILED: 'extraction_failed',
  
  // Page views
  PAGE_VIEW: 'page_view'
}; 