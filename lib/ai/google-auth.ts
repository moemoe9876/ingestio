"use server";

/**
 * Google Authentication Helper
 * 
 * This file provides utilities for authenticating with Google services
 * using a service account. It supports both file-based authentication
 * (local development) and environment variable based authentication
 * (production/deployment).
 */

import fs from 'fs';
import { GoogleAuth } from 'google-auth-library';

/**
 * Gets Google Application Default Credentials
 * This supports both local development (using a file) and production (using env variables)
 */
export async function getGoogleCredentials() {
  try {
    // First, check if we have JSON content in an environment variable
    const credentialsJson = process.env.GOOGLE_CREDENTIALS;
    
    if (credentialsJson) {
      console.log("Using Google credentials from environment variable");
      try {
        // Parse the credentials JSON
        const credentials = JSON.parse(credentialsJson);
        return new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
      } catch (error) {
        console.error("Error parsing Google credentials from environment variable:", error);
        throw new Error("Invalid Google credentials format in environment variable");
      }
    }
    
    // Check if we're using a file path
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    // If the path exists and is a file, use it directly
    if (credentialsPath && fs.existsSync(credentialsPath) && fs.statSync(credentialsPath).isFile()) {
      console.log("Using Google credentials from file path");
      // The GoogleAuth library will automatically use this path
      return new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
    } 
    
    // Fall back to default project ID approach
    const projectId = process.env.VERTEX_PROJECT || process.env.GOOGLE_VERTEX_PROJECT;
    
    if (!projectId) {
      throw new Error("Google Vertex project setting is missing. Pass it using the 'project' parameter or the GOOGLE_VERTEX_PROJECT environment variable.");
    }
    
    return new GoogleAuth({
      projectId,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
  } catch (error) {
    console.error("Error initializing Google Auth:", error);
    throw error;
  }
}

/**
 * Gets the Google project ID
 */
export function getGoogleProjectId(): string {
  // Try to get from credentials first
  const credentialsJson = process.env.GOOGLE_CREDENTIALS;
  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson);
      if (credentials.project_id) {
        return credentials.project_id;
      }
    } catch (error) {
      // Fall back to environment variables
    }
  }
  
  // Fall back to environment variables
  const projectId = process.env.VERTEX_PROJECT || process.env.GOOGLE_VERTEX_PROJECT;
  
  if (!projectId) {
    throw new Error("Google Vertex project setting is missing. Pass it using the 'project' parameter or the GOOGLE_VERTEX_PROJECT environment variable.");
  }
  
  return projectId;
} 