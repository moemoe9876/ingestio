/*
<ai_context>
Initializes the database connection and schema for the app.
</ai_context>
*/

import {
  documentsTable,
  exportsTable,
  extractedDataTable,
  extractionBatchesTable,
  extractionJobsTable,
  profilesTable,
  userUsageTable,
  usersTable
} from "@/db/schema"
import { config } from "dotenv"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

config({ path: ".env.local" })

const schema = {
  profiles: profilesTable,
  users: usersTable,
  documents: documentsTable,
  extractedData: extractedDataTable,
  extractionBatches: extractionBatchesTable,
  extractionJobs: extractionJobsTable,
  exports: exportsTable,
  userUsage: userUsageTable
}

const client = postgres(process.env.DATABASE_URL!)

export const db = drizzle(client, { schema })
