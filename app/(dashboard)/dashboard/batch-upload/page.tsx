"use client";

import { getProfileByUserIdAction } from "@/actions/db/profiles-actions";
import { getCurrentUser } from "@/lib/auth-utils";
import { BATCH_PROCESSING_LIMIT_PLUS, BATCH_PROCESSING_LIMIT_GROWTH } from "@/lib/config/subscription-plans";
import { redirect } from "next/navigation";
import { useState, useTransition } from "react";
import { BatchFileUpload } from "@/components/utilities/BatchFileUpload";

export default async function BatchUploadPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfileByUserIdAction(user);

  if (!profile.isSuccess) {
    redirect("/login");
  }

  if (profile.data.membership === "starter") {
    return (
      <div>
        <h1>Access Denied</h1>
        <p>Batch upload is only available for Plus and Growth tiers.</p>
      </div>
    );
  }

  const maxFiles =
    profile.data.membership === "plus"
      ? BATCH_PROCESSING_LIMIT_PLUS
      : BATCH_PROCESSING_LIMIT_GROWTH;

  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const [files, setFiles] = useState<File[]>([]);
  const [batchName, setBatchName] = useState<string>("");
  const [extractionPrompt, setExtractionPrompt] = useState<string>("");

  return (
    <div>
      <h1>Batch Upload</h1>
      <p>
        Upload multiple documents for processing. Max {maxFiles} files per batch.
      </p>
      <BatchFileUpload
        maxFiles={maxFiles}
        allowedMimeTypes={allowedMimeTypes}
        maxFileSize={maxFileSize}
        onFilesChange={setFiles}
      />
      <form>
        <div>
          <label htmlFor="batchName">Batch Name (Optional)</label>
          <input
            type="text"
            id="batchName"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="extractionPrompt">Extraction Prompt</label>
          <textarea
            id="extractionPrompt"
            value={extractionPrompt}
            onChange={(e) => setExtractionPrompt(e.target.value)}
          />
        </div>
        <button type="submit" disabled={!files.length || !extractionPrompt}>
          Submit
        </button>
      </form>
    </div>
  );
}
