/**
 * This script helps prepare your Google service account credentials for Vercel
 * It reads the service-account.json file and outputs the content in a format
 * that can be pasted directly into a Vercel environment variable.
 */

const fs = require('fs');
const path = require('path');

// Path to the service account JSON file
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');

try {
  // Read the service account file
  const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
  
  // Parse it to ensure it's valid JSON
  const serviceAccountJson = JSON.parse(serviceAccountContent);
  
  // Stringify it without pretty printing (no whitespace)
  const compactJson = JSON.stringify(serviceAccountJson);
  
  console.log("✅ Success! Copy the following value into your GOOGLE_CREDENTIALS environment variable in Vercel:");
  console.log("\n" + compactJson + "\n");
  console.log("Note: Make sure to mark this as a 'secret' in Vercel's environment variable settings.");
  
} catch (error) {
  console.error("Error reading or parsing service account file:", error);
  console.error("Make sure the file exists at:", serviceAccountPath);
  process.exit(1);
} 