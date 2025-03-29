"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UserCircle, Mail, Building, Key, ShieldCheck, History, Save } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState({
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    company: "Acme Technologies",
    role: "Administrator",
    plan: "Business",
    joinDate: "January 15, 2023"
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    company: user.company,
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSaveProfile = () => {
    setUser(prev => ({
      ...prev,
      name: formData.name,
      email: formData.email,
      company: formData.company
    }));
    setIsEditing(false);
  };
  
  const handlePasswordChange = () => {
    // Password change logic would go here
    console.log("Password change requested");
    // Reset password fields
    setFormData(prev => ({
      ...prev,
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Your personal account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="w-16 h-16 text-primary" />
                </div>
                {!isEditing && (
                  <Button variant="outline" size="sm" className="absolute -bottom-2 right-0">
                    Change
                  </Button>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-lg">{user.name}</h3>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{user.company}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span>{user.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <span>Member since {user.joinDate}</span>
              </div>
            </div>
            
            <div className="pt-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="md:col-span-2">
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="account">Account Settings</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="account">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    Update your account details and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input 
                          id="name" 
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input 
                        id="company" 
                        value={formData.company}
                        onChange={(e) => handleInputChange("company", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Notification Preferences</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="email-notifications" className="rounded" defaultChecked />
                        <Label htmlFor="email-notifications" className="font-normal cursor-pointer">
                          Email notifications for completed document processing
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="summary-emails" className="rounded" defaultChecked />
                        <Label htmlFor="summary-emails" className="font-normal cursor-pointer">
                          Weekly summary emails
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  {isEditing && (
                    <Button onClick={handleSaveProfile}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="security">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Update your password and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Input 
                          id="current-password" 
                          type="password" 
                          value={formData.currentPassword}
                          onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                        />
                        <Key className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input 
                        id="new-password" 
                        type="password" 
                        value={formData.newPassword}
                        onChange={(e) => handleInputChange("newPassword", e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input 
                        id="confirm-password" 
                        type="password" 
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Two-Factor Authentication</Label>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Enhanced account security</span>
                      </div>
                      <Button variant="outline" size="sm">Enable 2FA</Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    onClick={handlePasswordChange}
                    disabled={!formData.currentPassword || !formData.newPassword || formData.newPassword !== formData.confirmPassword}
                  >
                    Update Password
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="billing">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Subscription & Billing</CardTitle>
                  <CardDescription>
                    Manage your subscription plan and payment methods
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-md bg-primary/5 border border-primary/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Current Plan: {user.plan}</h3>
                        <p className="text-muted-foreground text-sm">Your subscription renews on April 15, 2023</p>
                      </div>
                      <Button variant="outline">Change Plan</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Payment Methods</h3>
                    <div className="p-4 rounded-md border border-border flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">Visa ending in 4242</div>
                          <div className="text-sm text-muted-foreground">Expires 04/2025</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                    
                    <Button variant="outline" className="mt-2">
                      Add Payment Method
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Billing History</h3>
                    <div className="rounded-md border">
                      <div className="grid grid-cols-4 p-3 bg-muted/50 font-medium text-sm">
                        <div>Date</div>
                        <div>Amount</div>
                        <div>Status</div>
                        <div className="text-right">Invoice</div>
                      </div>
                      <div className="grid grid-cols-4 p-3 border-t">
                        <div>Mar 15, 2023</div>
                        <div>$49.99</div>
                        <div>
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs bg-green-100 text-green-700">
                            Paid
                          </span>
                        </div>
                        <div className="text-right">
                          <Button variant="ghost" size="sm" className="h-6 px-2">Download</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 p-3 border-t">
                        <div>Feb 15, 2023</div>
                        <div>$49.99</div>
                        <div>
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs bg-green-100 text-green-700">
                            Paid
                          </span>
                        </div>
                        <div className="text-right">
                          <Button variant="ghost" size="sm" className="h-6 px-2">Download</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 