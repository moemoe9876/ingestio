// components/utilities/user-nav.tsx
"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

export function UserNav() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }

  return (
    <UserButton 
      appearance={{
        elements: {
          rootBox: "h-9",
          userButtonAvatarBox: "h-9 w-9",
          userButtonTrigger: "rounded-full hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          userButtonPopoverCard: "rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
          userButtonPopoverActions: "p-0",
          userButtonPopoverActionButton: "rounded-md hover:bg-accent hover:text-accent-foreground",
          userButtonPopoverFooter: "p-0",
        }
      }}
      afterSignOutUrl="/"
      userProfileMode="modal"
    />
  );
}