"use client";

import { syncSubscriptionAfterSuccessAction } from '@/actions/stripe';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function StripeSuccessPage() {
  console.log("--- StripeSuccessPage Render Start ---");
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("--- useEffect RUNNING ---");
    let isMounted = true;
    
    const sync = async () => {
      console.log("[Effect] sync() STARTED");
      // Ensure state is reset at the start of each sync attempt if effect re-runs
      // Although ideally, the effect shouldn't re-run unnecessarily.
      // setIsLoading(true);
      // setError(null);
      console.log("[Effect] Attempting to sync subscription...");
      
      try {
        const result = await syncSubscriptionAfterSuccessAction();
        console.log("[Effect] Sync action result:", result);

        if (!isMounted) {
          console.log("[Effect] Component unmounted before state update - SKIPPING");
          return; 
        }

        if (result.isSuccess) {
          console.log("[Effect] Sync SUCCESS - preparing toast and redirect");
          toast({ 
            title: "Success!", 
            description: "Your subscription is active." 
          });
          // Small delay for user feedback before redirecting
          setTimeout(() => {
            console.log("[Effect] Redirecting after timeout...");
            router.push('/dashboard');
          }, 1000);
          // No need to set isLoading false here because we redirect
        } else {
          console.log(`[Effect] Sync FAILED (isSuccess: false) - setting error: ${result.message}`);
          setError("Failed to sync subscription: " + result.message + ". Please refresh or contact support.");
          console.log("[Effect] Setting isLoading to false (sync failed)");
          setIsLoading(false);
          toast({ 
            title: "Sync Error", 
            description: result.message, 
            variant: "destructive" 
          });
        }
      } catch (e) {
        if (!isMounted) {
          console.log("[Effect] Component unmounted before CATCH state update - SKIPPING");
          return;
        }
        const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred";
        console.log(`[Effect] Sync CATCH - setting error: ${errorMessage}`);
        setError(errorMessage);
        console.log("[Effect] Setting isLoading to false (sync catch)");
        setIsLoading(false);
        toast({ 
          title: "Error", 
          description: errorMessage, 
          variant: "destructive" 
        });
      }
      console.log("[Effect] sync() FINISHED");
    };
    
    sync();
    
    return () => { 
      console.log("--- useEffect CLEANUP --- IsMounted set to false");
      isMounted = false; 
    };
  // IMPORTANT: Keep original dependencies for now to observe the behavior
  }, [router, toast]);

  console.log(`--- StripeSuccessPage Render - isLoading: ${isLoading}, error: ${error} ---`);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {isLoading && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h1 className="text-xl font-semibold mb-2">Finalizing your subscription...</h1>
          <p className="text-muted-foreground text-center">Please wait while we update your account.</p>
        </>
      )}
      
      {error && !isLoading && (
        <div className="text-center">
          <h1 className="text-xl font-semibold text-destructive mb-2">Sync Failed</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-4">
            <Button onClick={() => window.location.reload()} variant="default">
              Retry Sync
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        </div>
      )}
       {/* Add a state for successful but waiting for redirect? Maybe not needed. */}
       {!isLoading && !error && (
          // This state might briefly appear after success before redirect timeout
          <>
             <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
             <h1 className="text-xl font-semibold mb-2">Sync Successful!</h1>
             <p className="text-muted-foreground text-center">Redirecting you shortly...</p>
           </>
       )}
    </div>
  );
} 