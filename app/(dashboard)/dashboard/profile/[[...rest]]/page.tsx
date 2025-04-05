"use client";

import { UserProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export default function ProfilePage() {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>
      
      <div className="w-full flex justify-center">
        <UserProfile 
          path="/dashboard/profile" 
          routing="path"
          appearance={{
            baseTheme: theme === "dark" ? dark : undefined,
            elements: {
              card: 'shadow-md rounded-lg border border-border',
              headerTitle: 'text-foreground',
              headerSubtitle: 'text-muted-foreground',
              formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
              formFieldLabel: 'text-foreground',
              formFieldInput: 'bg-background border border-input rounded-md',
              navbar: 'bg-background',
              navbarButton: 'text-foreground',
              navbarButtonActive: 'text-primary',
              profileSectionTitleText: 'text-foreground',
              profileSectionContent: 'text-muted-foreground',
              accordionTriggerButton: 'text-foreground',
            }
          }}
        />
      </div>
    </div>
  );
} 