"use client";

import { getProfileByUserIdAction } from "@/actions/db/profiles-actions";
import { getCurrentUserDataAction, updateUserIdentityAction } from "@/actions/db/users-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { SelectProfile } from "@/db/schema/profiles-schema";
import { SelectUser } from "@/db/schema/users-schema";
import { useUser } from "@clerk/nextjs";
import { Download, Loader, Save } from "lucide-react";
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
  const [isPending, startTransition] = useTransition();
  const { user } = useUser();
  
  // Form states
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("en");
  const [dateFormat, setDateFormat] = useState("mdy");
  const [timeFormat, setTimeFormat] = useState("12h");
  
  // Notification settings
  const [notifyProcessing, setNotifyProcessing] = useState(true);
  const [notifyErrors, setNotifyErrors] = useState(true);
  const [notifySummary, setNotifySummary] = useState(false);
  
  // Privacy settings
  const [dataAnalytics, setDataAnalytics] = useState(true);
  const [dataStorage, setDataStorage] = useState(true);
  
  // User data
  const [userData, setUserData] = useState<SelectUser | null>(null);
  const [profileData, setProfileData] = useState<SelectProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load user settings from metadata if available
  useEffect(() => {
    async function loadUserData() {
      try {
        setIsLoading(true);
        const userResult = await getCurrentUserDataAction();
        
        if (!user?.id) return;
        
        const profileResult = await getProfileByUserIdAction(user.id);
        
        if (userResult.isSuccess && userResult.data) {
          setUserData(userResult.data);
          
          // Load settings from metadata if available
          const metadata = userResult.data.metadata as UserMetadata || {};
          
          if (metadata.theme) {
            setTheme(metadata.theme);
          }
          
          if (metadata.language) {
            setLanguage(metadata.language);
          }
          
          if (metadata.dateFormat) {
            setDateFormat(metadata.dateFormat);
          }
          
          if (metadata.timeFormat) {
            setTimeFormat(metadata.timeFormat);
          }
          
          if (metadata.notificationSettings) {
            if (metadata.notificationSettings.processing !== undefined) {
              setNotifyProcessing(metadata.notificationSettings.processing);
            }
            
            if (metadata.notificationSettings.errors !== undefined) {
              setNotifyErrors(metadata.notificationSettings.errors);
            }
            
            if (metadata.notificationSettings.summary !== undefined) {
              setNotifySummary(metadata.notificationSettings.summary);
            }
          }
          
          if (metadata.privacySettings) {
            if (metadata.privacySettings.analytics !== undefined) {
              setDataAnalytics(metadata.privacySettings.analytics);
            }
            
            if (metadata.privacySettings.storage !== undefined) {
              setDataStorage(metadata.privacySettings.storage);
            }
          }
        }
        
        if (profileResult.isSuccess && profileResult.data) {
          setProfileData(profileResult.data);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        toast({
          title: "Error",
          description: "Failed to load user settings",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);
  
  const handleSaveSettings = () => {
    if (!user?.id || !userData) return;
    
    startTransition(async () => {
      try {
        // Collect metadata from all settings categories
        const metadata: UserMetadata = {
          theme,
          language,
          dateFormat,
          timeFormat,
          notificationSettings: {
            processing: notifyProcessing,
            errors: notifyErrors,
            summary: notifySummary
          },
          privacySettings: {
            analytics: dataAnalytics,
            storage: dataStorage
          }
        };
        
        // Update user data with metadata
        const updateResult = await updateUserIdentityAction(user.id, {
          metadata: metadata as Record<string, any>
        });
        
        if (updateResult.isSuccess) {
          toast({
            title: "Success",
            description: "Settings updated successfully",
            variant: "default"
          });
          
          // Update local user data
          setUserData(updateResult.data);
        } else {
          toast({
            title: "Error",
            description: updateResult.message,
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive"
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Appearance & Language</CardTitle>
              <CardDescription>
                Customize application appearance and language settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="theme">Theme Preference</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred theme
                  </p>
                </div>
                <Select 
                  value={theme}
                  onValueChange={setTheme}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select 
                  value={language}
                  onValueChange={setLanguage}
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date-format">Date Format</Label>
                <Select 
                  value={dateFormat}
                  onValueChange={setDateFormat}
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time-format">Time Format</Label>
                <Select 
                  value={timeFormat}
                  onValueChange={setTimeFormat}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                    <SelectItem value="24h">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Manage how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Email Notifications</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notify-processing" className="font-normal">Document Processing</Label>
                      <p className="text-xs text-muted-foreground">
                        When document processing is complete
                      </p>
                    </div>
                    <Switch 
                      id="notify-processing" 
                      checked={notifyProcessing}
                      onCheckedChange={setNotifyProcessing}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notify-errors" className="font-normal">Processing Errors</Label>
                      <p className="text-xs text-muted-foreground">
                        When document processing encounters an error
                      </p>
                    </div>
                    <Switch 
                      id="notify-errors" 
                      checked={notifyErrors}
                      onCheckedChange={setNotifyErrors}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notify-summary" className="font-normal">Weekly Summary</Label>
                      <p className="text-xs text-muted-foreground">
                        Weekly summary of your document processing activity
                      </p>
                    </div>
                    <Switch 
                      id="notify-summary" 
                      checked={notifySummary}
                      onCheckedChange={setNotifySummary}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="privacy">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control how your data is used and stored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="data-analytics" className="font-normal">Usage Analytics</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow collection of anonymized usage data to improve the service
                    </p>
                  </div>
                  <Switch 
                    id="data-analytics" 
                    checked={dataAnalytics}
                    onCheckedChange={setDataAnalytics}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="data-processing" className="font-normal">Document Storage</Label>
                    <p className="text-xs text-muted-foreground">
                      Store processed documents for future reference
                    </p>
                  </div>
                  <Switch 
                    id="data-processing" 
                    checked={dataStorage}
                    onCheckedChange={setDataStorage}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="p-4 rounded-md border">
                  <h3 className="font-medium flex items-center gap-2">
                    <Download className="h-4 w-4 text-primary" />
                    Export Your Data
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Download a copy of your personal data and documents
                  </p>
                  <Button variant="outline">
                    Request Data Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline">Cancel</Button>
        <Button 
          onClick={handleSaveSettings}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 