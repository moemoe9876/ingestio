import { fetchBatchDetailAction } from "@/actions/batch/batchActions";
import { BatchDetailClient } from "@/components/batch/BatchDetailClient";
import { getCurrentUser } from "@/lib/auth/utils";
import { notFound, redirect } from "next/navigation";

interface BatchDetailPageProps {
  params: {
    batchId: string;
  };
}

export default async function BatchDetailPage({ params }: BatchDetailPageProps) {
  const userId = await getCurrentUser();
  if (!userId) {
    redirect("/login");
  }

  const { batchId } = params;

  if (!batchId) {
    notFound();
  }

  const result = await fetchBatchDetailAction(batchId);

  if (!result.isSuccess || !result.data) {
    if (result.error === "NOT_FOUND" || result.error === "FORBIDDEN") {
      notFound(); // Or a more specific error page
    }
    // Handle other errors, maybe show a generic error message
    // For now, just navigate to notFound for simplicity
    notFound();
  }

  const { batch, documents, totalDocuments } = result.data;

  // Basic check if the fetched batch belongs to the current user,
  // RLS should handle this, but an explicit check is good defense-in-depth.
  if (batch.userId !== userId) {
    notFound(); // Or redirect to an unauthorized page
  }
  
  return (
    <BatchDetailClient
      initialBatch={batch}
      initialDocuments={documents}
      initialTotalDocuments={totalDocuments}
      batchId={batchId}
    />
  );
} 