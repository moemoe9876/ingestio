"use client";

import { getProfileByUserIdAction } from "@/actions/db/profiles-actions";
import { getCurrentUserUsageAction } from "@/actions/db/user-usage-actions";
import { getCurrentUserDataAction, updateUserIdentityAction } from "@/actions/db/users-actions";
import { createBillingPortalSessionAction, createCheckoutSessionAction } from "@/actions/stripe/checkout-actions";
import { getUserSubscriptionDataKVAction } from "@/actions/stripe/sync-actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { SelectProfile } from "@/db/schema/profiles-schema";
import { SelectUserUsage } from "@/db/schema/user-usage-schema";
import { SelectUser } from "@/db/schema/users-schema";
import { PlanId, getPlanById, subscriptionPlans } from "@/lib/config/subscription-plans";
import { StripeCustomerDataKV } from "@/types/stripe-kv-types";
import { UserProfile, useUser } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Bell, CreditCard, Database, Languages, Loader2, Lock, Palette, Save, Trash2, User as UserIcon } from "lucide-react";
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

interface UserMetadata {
  theme?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  notificationSettings?: {
    processing?: boolean;
    errors?: boolean;
    summary?: boolean;
  };
  privacySettings?: {
    analytics?: boolean;
    storage?: boolean;
  };
}

export default function SettingsPage() {
  const [isSavingAppearance, startSavingAppearanceTransition] = useTransition();
  const [isSavingLangRegion, startSavingLangRegionTransition] = useTransition();
  const [isSavingNotifications, startSavingNotificationsTransition] = useTransition();
  const [isSavingPrivacy, startSavingPrivacyTransition] = useTransition();
  const [isBillingActionPending, startBillingActionTransition] = useTransition();
  const [isExporting, startTransition] = useTransition();
  
  const { user, isLoaded: isUserLoaded } = useUser();
  const { theme: nextTheme } = useTheme();
  
  const [initialMetadata, setInitialMetadata] = useState<UserMetadata | null>(null);
  
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("en");
  const [dateFormat, setDateFormat] = useState("mdy");
  const [timeFormat, setTimeFormat] = useState("12h");
  const [isAppearanceDirty, setIsAppearanceDirty] = useState(false);
  const [isLangRegionDirty, setIsLangRegionDirty] = useState(false);
  
  const [notifyProcessing, setNotifyProcessing] = useState(true);
  const [notifyErrors, setNotifyErrors] = useState(true);
  const [notifySummary, setNotifySummary] = useState(false);
  const [isNotificationsDirty, setIsNotificationsDirty] = useState(false);
  
  const [dataAnalytics, setDataAnalytics] = useState(true);
  const [dataStorage, setDataStorage] = useState(true);
  const [isDataUsageDirty, setIsDataUsageDirty] = useState(false);
  
  const [userData, setUserData] = useState<SelectUser | null>(null);
  const [profileData, setProfileData] = useState<SelectProfile | null>(null);
  const [usageData, setUsageData] = useState<SelectUserUsage | null>(null);
  
  const [kvSubscriptionData, setKvSubscriptionData] = useState<StripeCustomerDataKV | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'profile');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    router.replace(url.pathname + url.search);
  };

  useEffect(() => {
    async function loadInitialData() {
      if (!user?.id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const [userResult, profileResult, usageResult, kvSubscriptionResult] = await Promise.all([
          getCurrentUserDataAction(),
          getProfileByUserIdAction(user.id),
          getCurrentUserUsageAction(user.id),
          getUserSubscriptionDataKVAction(),
        ]);
        
        if (userResult.isSuccess && userResult.data) {
          setUserData(userResult.data);
          const metadata = (userResult.data.metadata || {}) as UserMetadata;
          setInitialMetadata(metadata);
          
          setTheme(metadata.theme || "system");
          setLanguage(metadata.language || "en");
          setDateFormat(metadata.dateFormat || "mdy");
          setTimeFormat(metadata.timeFormat || "12h");
          
          setNotifyProcessing(metadata.notificationSettings?.processing ?? true);
          setNotifyErrors(metadata.notificationSettings?.errors ?? true);
          setNotifySummary(metadata.notificationSettings?.summary ?? false);
          
          setDataAnalytics(metadata.privacySettings?.analytics ?? true);
          setDataStorage(metadata.privacySettings?.storage ?? true);
        } else {
          console.error("Failed to load user data:", userResult.message);
          setError("Failed to load user data.");
        }
        
        if (profileResult.isSuccess && profileResult.data) {
          setProfileData(profileResult.data);
        } else {
          console.error("Failed to load profile data:", profileResult.message);
        }
        
        if (usageResult.isSuccess && usageResult.data) {
          setUsageData(usageResult.data);
        } else {
          console.error("Failed to load usage data:", usageResult.message);
          setError("Failed to load usage data.");
        }
        
        if (kvSubscriptionResult.isSuccess && kvSubscriptionResult.data) {
          setKvSubscriptionData(kvSubscriptionResult.data);
        } else {
          console.error("Failed to load KV subscription data:", kvSubscriptionResult.message);
          setError("Could not load subscription details.");
        }
        
      } catch (err) {
        console.error("Error loading settings data:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
        setIsAppearanceDirty(false);
        setIsLangRegionDirty(false);
        setIsNotificationsDirty(false);
        setIsDataUsageDirty(false);
      }
    }
    
    if (isUserLoaded && user?.id) {
      loadInitialData();
    }
  }, [user?.id, isUserLoaded]);
  
  useEffect(() => {
    if (!initialMetadata) return;
    const isDirty = theme !== (initialMetadata.theme || "system");
    setIsAppearanceDirty(isDirty);
  }, [theme, initialMetadata]);
  
  useEffect(() => {
    if (!initialMetadata) return;
    const isDirty =
      language !== (initialMetadata.language || "en") ||
      dateFormat !== (initialMetadata.dateFormat || "mdy") ||
      timeFormat !== (initialMetadata.timeFormat || "12h");
    setIsLangRegionDirty(isDirty);
  }, [language, dateFormat, timeFormat, initialMetadata]);
  
  useEffect(() => {
    if (!initialMetadata) return;
    const isDirty =
      notifyProcessing !== (initialMetadata.notificationSettings?.processing ?? true) ||
      notifyErrors !== (initialMetadata.notificationSettings?.errors ?? true) ||
      notifySummary !== (initialMetadata.notificationSettings?.summary ?? false);
    setIsNotificationsDirty(isDirty);
  }, [notifyProcessing, notifyErrors, notifySummary, initialMetadata]);
  
  useEffect(() => {
    if (!initialMetadata) return;
    const isDirty =
      dataAnalytics !== (initialMetadata.privacySettings?.analytics ?? true) ||
      dataStorage !== (initialMetadata.privacySettings?.storage ?? true);
    setIsDataUsageDirty(isDirty);
  }, [dataAnalytics, dataStorage, initialMetadata]);
  
  const handleSaveAppearance = () => {
    if (!user?.id || !userData) return;
    
    startSavingAppearanceTransition(async () => {
      const updatedMetadataSection = { theme };
      
      const result = await updateUserIdentityAction(user.id, {
        metadata: { ...initialMetadata, ...updatedMetadataSection } as Record<string, any>
      });
      
      if (result.isSuccess) {
        toast({ title: "Success", description: "Appearance settings updated." });
        setUserData(result.data);
        const newMetadata = result.data.metadata as UserMetadata;
        setInitialMetadata(newMetadata);
        setIsAppearanceDirty(false);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const handleSaveLangRegion = () => {
    if (!user?.id || !userData) return;
    
    startSavingLangRegionTransition(async () => {
      const updatedMetadataSection = {
        language,
        dateFormat,
        timeFormat,
      };
      
      const result = await updateUserIdentityAction(user.id, {
        metadata: { ...initialMetadata, ...updatedMetadataSection } as Record<string, any>
      });
      
      if (result.isSuccess) {
        toast({ title: "Success", description: "Language & Region settings updated." });
        setUserData(result.data);
        const newMetadata = result.data.metadata as UserMetadata;
        setInitialMetadata(newMetadata);
        setIsLangRegionDirty(false);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const handleSaveNotifications = () => {
    if (!user?.id || !userData) return;
    
    startSavingNotificationsTransition(async () => {
      const updatedMetadataSection = {
        notificationSettings: {
          processing: notifyProcessing,
          errors: notifyErrors,
          summary: notifySummary
        }
      };
      
      const result = await updateUserIdentityAction(user.id, {
        metadata: { ...initialMetadata, ...updatedMetadataSection } as Record<string, any>
      });
      
      if (result.isSuccess) {
        toast({ title: "Success", description: "Notification settings updated." });
        setUserData(result.data);
        const newMetadata = result.data.metadata as UserMetadata;
        setInitialMetadata(newMetadata);
        setIsNotificationsDirty(false);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const handleSavePrivacy = () => {
    if (!user?.id || !userData) return;
    
    startSavingPrivacyTransition(async () => {
      const updatedMetadataSection = {
        privacySettings: {
          analytics: dataAnalytics,
          storage: dataStorage
        }
      };
      
      const result = await updateUserIdentityAction(user.id, {
        metadata: { ...initialMetadata, ...updatedMetadataSection } as Record<string, any>
      });
      
      if (result.isSuccess) {
        toast({ title: "Success", description: "Privacy settings updated." });
        setUserData(result.data);
        const newMetadata = result.data.metadata as UserMetadata;
        setInitialMetadata(newMetadata);
        setIsDataUsageDirty(false);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const handleManageBilling = () => {
    if (!user?.id) return;
    const customerIdFromKV = kvSubscriptionData?.customerId;

    if (!customerIdFromKV) {
      toast({ title: "Billing Error", description: "No billing information found for this account.", variant: "destructive" });
      return;
    }
    
    startBillingActionTransition(async () => {
      try {
        const result = await createBillingPortalSessionAction(customerIdFromKV, "/dashboard/settings");
        if (result.isSuccess && result.data?.url) {
          window.location.href = result.data.url;
        } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
        }
      } catch (err) {
        toast({ title: "Error", description: "Failed to open billing portal.", variant: "destructive" });
      }
    });
  };
  
  const handleUpgrade = (planId: PlanId) => {
    if (!user?.id) return;
    startBillingActionTransition(async () => {
      try {
        const result = await createCheckoutSessionAction(user.id, planId, "/dashboard/settings");
        if (result.isSuccess && result.data?.url) {
          window.location.href = result.data.url;
        } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
        }
      } catch (err) {
        toast({ title: "Error", description: "Failed to initiate upgrade.", variant: "destructive" });
      }
    });
  };
  
  const handleRequestDataExport = () => {
    toast({ title: "Info", description: "Data export request functionality is coming soon." });
  };
  
  const handleDeleteAccount = () => {
    toast({ title: "Info", description: "Account deletion functionality is coming soon." });
  };

  if (isLoading || !isUserLoaded) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
           <Skeleton className="h-9 w-1/4" />
           <Skeleton className="h-5 w-1/2" />
         </div>
         <div className="flex items-center justify-center min-h-[50vh]">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      </div>
    );
  }
  
  if (error) {
     return (
       <div className="flex flex-col gap-6 items-center justify-center min-h-[50vh]">
         <h1 className="text-2xl font-bold text-destructive">Error Loading Settings</h1>
         <p className="text-muted-foreground">{error}</p>
         <Button onClick={() => window.location.reload()}>Retry</Button>
       </div>
     );
   }

  const currentPlanId = kvSubscriptionData?.status === 'active' && kvSubscriptionData.planId 
                        ? kvSubscriptionData.planId 
                        : 'starter';
  const currentPlan = getPlanById(currentPlanId as PlanId);
  const usagePercentage = usageData && currentPlan.documentQuota > 0 && currentPlan.documentQuota !== Infinity
    ? Math.min(100, (usageData.pagesProcessed / currentPlan.documentQuota) * 100)
    : usageData && currentPlan.documentQuota === Infinity ? 0 : 0;

  return (
    <TooltipProvider>
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings, preferences, and subscription
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="profile"><UserIcon className="mr-2 h-4 w-4 inline-block" />Profile</TabsTrigger>
          <TabsTrigger value="preferences"><Palette className="mr-2 h-4 w-4 inline-block" />Preferences</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4 inline-block" />Notifications</TabsTrigger>
          <TabsTrigger value="privacy"><Lock className="mr-2 h-4 w-4 inline-block" />Privacy</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="mr-2 h-4 w-4 inline-block" />Subscription</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-6">
          <UserProfile
             path="/dashboard/settings"
             routing="path"
            appearance={{
              baseTheme: nextTheme === "dark" ? dark : undefined,
              elements: {
                headerTitle: 'text-2xl font-semibold text-foreground',
                headerSubtitle: 'text-sm text-muted-foreground',
                formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
                formFieldLabel: 'text-foreground font-medium',
              }
            }}
          />
        </TabsContent>
        
        <TabsContent value="preferences" className="mt-6 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-muted-foreground" />Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
                <div className="sm:col-span-1 space-y-1">
                  <Label htmlFor="theme" className="font-medium">Theme Preference</Label>
                  <p className="text-sm text-foreground/70">
                    Choose light, dark, or system default theme.
                  </p>
                </div>
                <div className="sm:col-span-2">
                   <Select
                    value={theme}
                    onValueChange={(value) => {
                      setTheme(value);
                    }}
                    disabled={isSavingAppearance}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
               <Button
                 onClick={handleSaveAppearance}
                 disabled={!isAppearanceDirty || isSavingAppearance}
                 className="ml-auto"
               >
                 {isSavingAppearance ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                 Save Changes
               </Button>
             </CardFooter>
          </Card>
          
          <Card className="border-border">
             <CardHeader>
               <CardTitle className="flex items-center gap-2"><Languages className="h-5 w-5 text-muted-foreground" />Language & Region</CardTitle>
               <CardDescription>
                 Set your preferred language and date/time formats.
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-3 items-start gap-4">
                 <Label htmlFor="language" className="font-medium pt-2 sm:text-right sm:col-span-1">Language</Label>
                 <div className="sm:col-span-2">
                    <Select
                      value={language}
                      onValueChange={setLanguage}
                      disabled={isSavingLangRegion}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-foreground/70 mt-1">
                      Select the display language for the application.
                    </p>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-3 items-start gap-4">
                 <Label htmlFor="date-format" className="font-medium pt-2 sm:text-right sm:col-span-1">Date Format</Label>
                 <div className="sm:col-span-2">
                   <Select
                     value={dateFormat}
                     onValueChange={setDateFormat}
                     disabled={isSavingLangRegion}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select date format" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                       <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                       <SelectItem value="ymd">YYYY/MM/DD</SelectItem>
                     </SelectContent>
                   </Select>
                    <p className="text-xs text-foreground/70 mt-1">
                      Choose how dates are displayed.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 items-start gap-4">
                  <Label htmlFor="time-format" className="font-medium pt-2 sm:text-right sm:col-span-1">Time Format</Label>
                  <div className="sm:col-span-2">
                    <Select
                      value={timeFormat}
                      onValueChange={setTimeFormat}
                      disabled={isSavingLangRegion}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                        <SelectItem value="24h">24-hour</SelectItem>
                      </SelectContent>
                    </Select>
                     <p className="text-xs text-foreground/70 mt-1">
                      Choose how times are displayed.
                    </p>
                  </div>
                </div>
             </CardContent>
             <CardFooter>
               <Button
                 onClick={handleSaveLangRegion}
                 disabled={!isLangRegionDirty || isSavingLangRegion}
                 className="ml-auto"
               >
                 {isSavingLangRegion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                 Save Changes
               </Button>
             </CardFooter>
           </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-muted-foreground" />Email Notifications</CardTitle>
              <CardDescription>
                Manage how and when you receive email notifications about your account activity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-processing" className="font-medium">Document Processing</Label>
                  <p className="text-sm text-foreground/70">
                    Receive an email when document processing is complete.
                  </p>
                </div>
                <Switch
                  id="notify-processing"
                  checked={notifyProcessing}
                  onCheckedChange={setNotifyProcessing}
                  disabled={isSavingNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-errors" className="font-medium">Processing Errors</Label>
                  <p className="text-sm text-foreground/70">
                    Get notified if document processing encounters an error.
                  </p>
                </div>
                <Switch
                  id="notify-errors"
                  checked={notifyErrors}
                  onCheckedChange={setNotifyErrors}
                  disabled={isSavingNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between rounded-lg border p-4">
                 <div className="space-y-0.5">
                  <Label htmlFor="notify-summary" className="font-medium">Weekly Summary</Label>
                  <p className="text-sm text-foreground/70">
                    Receive a weekly summary of your document activity.
                  </p>
                </div>
                <Switch
                  id="notify-summary"
                  checked={notifySummary}
                  onCheckedChange={setNotifySummary}
                  disabled={isSavingNotifications}
                />
              </div>
            </CardContent>
            <CardFooter>
               <Button
                 onClick={handleSaveNotifications}
                 disabled={!isNotificationsDirty || isSavingNotifications}
                 className="ml-auto"
               >
                 {isSavingNotifications ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                 Save Changes
               </Button>
             </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="privacy" className="mt-6 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-muted-foreground" />Data Usage</CardTitle>
              <CardDescription>
                Control how your data is used within the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="data-analytics" className="font-medium">Usage Analytics</Label>
                    <p className="text-sm text-foreground/70">
                      Allow collection of anonymized usage data to help improve the service.
                    </p>
                  </div>
                  <Switch 
                    id="data-analytics" 
                    checked={dataAnalytics}
                    onCheckedChange={setDataAnalytics}
                    disabled={isSavingPrivacy}
                  />
                </div>
                
                <div className="flex items-center justify-between rounded-lg border p-4">
                   <div className="space-y-0.5">
                     <Label htmlFor="data-storage" className="font-medium">Document Storage</Label>
                     <p className="text-sm text-foreground/70">
                       Allow storing processed documents for future access and reference.
                     </p>
                   </div>
                  <Switch 
                    id="data-storage" 
                    checked={dataStorage}
                    onCheckedChange={setDataStorage}
                    disabled={isSavingPrivacy}
                  />
                </div>
            </CardContent>
            <CardFooter>
               <Button 
                 onClick={handleSavePrivacy} 
                 disabled={!isDataUsageDirty || isSavingPrivacy}
                 className="ml-auto"
               >
                 {isSavingPrivacy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                 Save Changes
               </Button>
             </CardFooter>
          </Card>
          
          <Card className="border-border">
             <CardHeader>
               <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-muted-foreground" />Manage Your Data</CardTitle>
               <CardDescription>
                 Actions related to your personal data stored in the application.
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <h3 className="font-medium">Export Your Data</h3>
                    <p className="text-sm text-foreground/70">
                      Request a copy of your personal data and documents stored in the application.
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleRequestDataExport} disabled={isSavingPrivacy}>Request Data Export</Button>
               </div>
               
               <Separator />
               
               <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-destructive/50 p-4">
                 <div className="space-y-1">
                   <h3 className="font-medium text-destructive">Delete Account</h3>
                   <p className="text-sm text-foreground/70">
                     Permanently delete your account and all associated data. This action cannot be undone.
                   </p>
                 </div>
                  <AlertDialog>
                     <AlertDialogTrigger asChild>
                       <Button variant="destructive" disabled={isExporting}> <Trash2 className="mr-2 h-4 w-4" />Delete Account</Button>
                     </AlertDialogTrigger>
                     <AlertDialogContent>
                       <AlertDialogHeader>
                         <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                         <AlertDialogDescription>
                           This action cannot be undone. This will permanently delete your account, profile, documents, usage history, and remove all your data from our servers.
                         </AlertDialogDescription>
                       </AlertDialogHeader>
                       <AlertDialogFooter>
                         <AlertDialogCancel>Cancel</AlertDialogCancel>
                         <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                           Yes, Delete Account
                         </AlertDialogAction>
                       </AlertDialogFooter>
                     </AlertDialogContent>
                   </AlertDialog>
               </div>
             </CardContent>
           </Card>
        </TabsContent>
        
        <TabsContent value="billing" className="mt-6 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-muted-foreground" />Your Subscription</CardTitle>
              <CardDescription>
                Manage your current subscription plan and billing details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!profileData ? (
                <div className="space-y-2">
                   <Skeleton className="h-6 w-1/3" />
                   <Skeleton className="h-4 w-2/3" />
                   <Skeleton className="h-4 w-1/2 mt-4" />
                   <Skeleton className="h-3 w-full" />
                   <Skeleton className="h-4 w-1/4 mt-1" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 rounded-lg border p-4 bg-muted/30">
                     <div className="flex-grow">
                       <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                       <div className="flex items-center gap-2 mt-1">
                          <p className="text-xl font-semibold">{currentPlan.name}</p>
                          {currentPlan.planId !== 'starter' && <Badge variant="secondary">{currentPlan.planId.charAt(0).toUpperCase() + currentPlan.planId.slice(1)}</Badge>}
                          {kvSubscriptionData?.status === 'active' && kvSubscriptionData.cancelAtPeriodEnd && <Badge variant="destructive">Cancels Soon</Badge>}
                       </div>
                       <p className="text-sm text-foreground/70 mt-1">{currentPlan.description}</p>
                     </div>
                     {kvSubscriptionData && kvSubscriptionData.status !== 'none' && kvSubscriptionData.customerId && (
                        <Button onClick={handleManageBilling} disabled={isBillingActionPending} variant="outline" size="sm" className="mt-2 sm:mt-0 flex-shrink-0">
                          {isBillingActionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Manage Billing
                        </Button>
                     )}
                  </div>

                  <Separator />
                  
                  <div>
                     <h3 className="text-base font-medium mb-3">Usage This Period</h3>
                      {usageData ? (
                       <div className="space-y-2">
                         <Tooltip>
                             <TooltipTrigger asChild>
                                 <Progress value={usagePercentage} className="w-full h-2.5" />
                             </TooltipTrigger>
                             <TooltipContent>
                                 <p>{usagePercentage.toFixed(0)}% used</p>
                             </TooltipContent>
                         </Tooltip>
                         <p className="text-sm text-foreground/70">
                           {usageData.pagesProcessed.toLocaleString()} / {currentPlan.documentQuota === Infinity ? 'Unlimited' : currentPlan.documentQuota.toLocaleString()} documents processed.
                         </p>
                       </div>
                     ) : (
                       <div className="space-y-2">
                          <Skeleton className="h-2.5 w-full" />
                          <Skeleton className="h-4 w-1/3" />
                       </div>
                     )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>
                Choose a plan that best suits your needs or manage your existing one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {Object.values(subscriptionPlans)
                   .filter(plan => plan.planId !== 'starter')
                   .map((plan) => (
                     <Card key={plan.planId} className={`flex flex-col justify-between ${plan.planId === currentPlanId ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground/20 transition-colors'}`}>
                       <CardHeader>
                         <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                              {plan.name}
                              {plan.planId === currentPlanId && <Badge variant="outline">Current</Badge>}
                            </CardTitle>
                            {plan.isPopular && <Badge variant="default">Popular</Badge>}
                         </div>
                         <CardDescription>{plan.description}</CardDescription>
                       </CardHeader>
                       <CardContent className="flex-grow space-y-3">
                         <p className="text-3xl font-bold">${plan.priceMonthly}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                         <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1.5">
                           <li>{plan.documentQuota === Infinity ? 'Unlimited documents' : `${plan.documentQuota.toLocaleString()} documents/month`}</li>
                           <li>{plan.batchProcessing ? `Batch processing up to ${plan.batchProcessingLimit} docs` : 'Single document processing'}</li>
                           <li>{plan.supportLevel} support</li>
                           <li>{plan.dataRetentionDays} days data retention</li>
                         </ul>
                       </CardContent>
                       <CardFooter>
                         {plan.planId === currentPlanId ? (
                            <Button disabled className="w-full">Current Plan</Button>
                         ) : (
                           <Button
                             onClick={() => handleUpgrade(plan.planId)}
                             disabled={isBillingActionPending || !user?.id}
                             variant={plan.isPopular ? "default" : "outline"}
                             className="w-full"
                           >
                             {isBillingActionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                             {currentPlanId === 'starter' ? 'Upgrade to ' : 'Switch to '} {plan.name}
                           </Button>
                         )}
                       </CardFooter>
                     </Card>
                   ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  );
}