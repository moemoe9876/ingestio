Okay, let's thoroughly redesign the **Settings Page** (`app/(dashboard)/dashboard/settings/page.tsx`) to create that unified, premium "Account Hub" experience, addressing the issues identified in the current implementation and screenshots.

**1. Analysis of Current Implementation (Screenshots)**

*   **Settings Page (`/settings`):**
    *   **Layout:** Uses tabs ("General", "Notifications", "Privacy & Data") with content displayed in a single large card per tab.
    *   **General Tab:** Contains "Appearance & Language". Uses `Select` components for Theme, Language, Date Format, Time Format. Layout is a simple vertical stack within the card. Descriptive text under labels has very low contrast. Save button is present at the bottom.
    *   **Notifications Tab:** Lists notification types with `Switch` components. Layout is again a simple list. Descriptive text contrast is low. Save button present.
    *   **Privacy & Data Tab:** Lists privacy toggles with `Switch` components. Includes an "Export Your Data" section with a button. Save button present.
    *   **Saving:** The "Save Settings" button appears consistently at the bottom, suggesting it might save *all* settings across tabs, or at least all settings within the *current* tab, which isn't ideal UX.
    *   **Missing:** Billing/Subscription information is completely absent. Profile editing is separate.
*   **Profile Page (`/profile`):**
    *   Renders the standard Clerk `<UserProfile>` component. It's functional for identity management (email, password, MFA, connected accounts) but exists entirely separate from application settings.
*   **Overall:** The separation is the main issue. The settings page itself is functional but lacks visual organization within tabs and has contrast problems. The saving mechanism seems suboptimal.

**2. Critique of Current Design**

*   **Fragmentation:** Key user settings (identity, preferences, billing) are scattered across different URLs (`/profile`, `/settings`, potentially `/billing`). This forces users to navigate multiple places for related tasks.
*   **Poor Information Density/Layout (Settings):** Within each settings tab, options are just listed vertically. Grouping related items within nested cards or sections would improve clarity and scannability.
*   **Contrast/Accessibility:** The light grey descriptive text under labels in the dark theme is very difficult to read and likely fails accessibility standards.
*   **Saving UX:** A single "Save" button for an entire tab (or potentially the whole page) is poor UX. Users expect changes to be saved more granularly, ideally per section, or at least have clear feedback on what is being saved. It's unclear if changes in one tab persist when switching to another before saving.
*   **Missed Opportunity:** No integration of billing/subscription status, a critical piece of account management for a SaaS app.
*   **Clerk Integration:** While functional, embedding the Clerk component within a unified settings page would provide a smoother experience than linking out to a separate profile page.

**3. Initial Improvement Ideas (Draft 1)**

*   Merge `/profile` and billing into `/settings` using Tabs.
*   Tabs: Profile | Preferences | Notifications | Privacy | Billing.
*   Profile Tab: Embed `<UserProfile>`. *Keep `/profile/[[...rest]]/page.tsx` file.*
*   Other Tabs: Use `Card` components *within* each tab to group settings (e.g., Appearance Card, Language Card).
*   Saving: Add a "Save" button inside the `CardFooter` of *each* card containing editable settings. Enable only when that card's settings change.
*   Billing Tab: Show current plan/usage, upgrade options, manage link.
*   Improve contrast for descriptive text.
*   Use better layout (flex/grid) for label/control pairs within cards.

**4. Self-Critique of Draft 1**

*   This structure is much better – unified, tabbed, section-based saving.
*   The Clerk routing requirement is handled.
*   Per-card saving is a good UX improvement.
*   Need to detail the state management for fetching data and handling the "dirty" state for each save button.
*   Need to specify *which* backend actions to call for saving preferences/notifications/privacy (likely `updateUserIdentityAction` updating `metadata`).
*   Need to detail the UI components for the Billing tab more clearly (Progress bar, plan comparison).

**5. Refined Redesign Concept (Apple-Level - Final)**

*   **Goal:** A single, elegant `/settings` destination. Each tab is clean and focused. Saving is intuitive and scoped to logical sections. Billing is seamlessly integrated. The UI feels polished, accessible, and efficient.
*   **Structure:** `/dashboard/settings` page with 5 Tabs:
    *   **Profile:** Full-width Clerk `<UserProfile>` component. No extra card wrapper needed.
    *   **Preferences:** Contains Cards for "Appearance" (Theme) and "Language & Region" (Language, Date/Time Format).
    *   **Notifications:** Contains a Card for "Email Notifications" (Switches for different types).
    *   **Privacy:** Contains Cards for "Data Usage" (Analytics/Storage toggles) and "Manage Your Data" (Export/Delete buttons).
    *   **Subscription & Billing:** Contains Cards for "Current Plan & Usage" and "Available Plans".
*   **Saving Mechanism:** Each `Card` containing editable settings (Appearance, Language & Region, Notifications, Data Usage) gets its own `CardFooter` with a "Save Changes" button.
    *   State: Need `initialMetadata`, current settings state (`theme`, `language`, etc.), and dirty flags per card (`isAppearanceDirty`, `isLangRegionDirty`, etc.).
    *   Logic: When a setting changes, update its state *and* set the corresponding card's dirty flag to `true`. The Save button in the card's footer is enabled only when its dirty flag is `true`. Clicking Save calls `updateUserIdentityAction` with *only the changed section's* metadata merged into the existing metadata, shows a `toast`, and resets that card's dirty flag.
*   **Visual Design & UX:**
    *   **Contrast:** Increase contrast significantly for all descriptive text (`text-muted-foreground` should be clearly legible). Use a slightly lighter shade if needed, e.g., `text-gray-400` in dark mode.
    *   **Layout within Cards:** Use `flex justify-between items-center` for simple toggle settings (like Notifications/Privacy). Use `grid grid-cols-3 items-center gap-4` for label/control pairs (like Preferences) for better alignment.
    *   **Clarity:** Use clear `CardHeader`s with `CardTitle` and `CardDescription`. Add relevant `lucide-react` icons to headers.
    *   **Billing Tab:**
        *   *Current Plan:* Clearly display plan name (e.g., "Pro Plan") with a matching `Badge`. List key features/limits. Show usage with a prominent `Progress` bar and clear text ("X / Y pages used", "Z days left"). Make the "Manage Billing" button obvious (if applicable).
        *   *Available Plans:* Display other plans side-by-side (using grid). Highlight key differences. Make "Upgrade" buttons clear Calls To Action.
    *   **Feedback:** Use `useTransition` for all save/Stripe operations. Show loading spinners on buttons. Use `toast` for success/error feedback.
*   **State Management:** Fetch all data (`userData`, `profileData`, `usageData`) concurrently on load using `Promise.all` and manage a single `isLoading` state for the initial load.

---

**6. Implementation Plan (Markdown):**

**(Replaces current Step 5.8 and incorporates 5.9)**

**Step 5.8: Implement Unified Settings Page (Redesigned)**

*   **Task**: Refactor `settings/page.tsx` into a comprehensive, polished account management hub with tabs for Profile, Preferences, Notifications, Privacy, and Billing. Implement per-section saving, integrate Clerk Profile, and connect billing actions. Ensure high contrast and intuitive layout.
*   **Files**:
    *   `app/(dashboard)/dashboard/settings/page.tsx`: **Primary focus**. Implement Tabs, Cards, state management (including dirty states per card), data fetching/saving logic, Stripe integration.
    *   `app/(dashboard)/dashboard/profile/[[...rest]]/page.tsx`: **Keep this file structure** for Clerk component routing. Ensure it renders `<UserProfile>`.
    *   `actions/db/users-actions.ts`: `getCurrentUserDataAction`, `updateUserIdentityAction` (verify robust `metadata` handling).
    *   `actions/db/profiles-actions.ts`: `getProfileByUserIdAction`.
    *   `actions/stripe/checkout-actions.ts`: `createCheckoutSessionAction`, `createBillingPortalSessionAction`.
    *   `actions/db/user-usage-actions.ts`: `getCurrentUserUsageAction`.
    *   `lib/config/subscription-plans.ts`: Use `subscriptionPlans`, `getPlanById`.
    *   `components/ui/tabs.tsx`, `components/ui/card.tsx`, `components/ui/select.tsx`, `components/ui/switch.tsx`, `components/ui/button.tsx`, `components/ui/label.tsx`, `components/ui/separator.tsx`, `components/ui/progress.tsx`, `components/ui/skeleton.tsx`, `components/ui/alert-dialog.tsx`, `components/ui/tooltip.tsx`, `components/ui/badge.tsx`.
    *   `@clerk/nextjs`: Import `UserProfile`, `useUser`.
    *   `lucide-react`: Icons (`User`, `Palette`, `Languages`, `Bell`, `Lock`, `Database`, `Trash2`, `CreditCard`, `Save`, `Loader2`, `Download`, etc.)
*   **Step Dependencies**: 1.9, 3.1, 4.1, 4.6, 6.2, 6.3.

**User Instructions:**

1.  **Data Fetching & State (`settings/page.tsx`)**:
    *   Import hooks (`useState`, `useEffect`, `useTransition`), actions, components, types (`SelectUser`, `SelectProfile`, `UserMetadata`), `useUser`.
    *   Define state: `userData`, `profileData`, `usageData`, `isLoading`, `error`.
    *   Define state for *each* setting: `theme`, `language`, `dateFormat`, `timeFormat`, `notifyProcessing`, `notifyErrors`, `notifySummary`, `dataAnalytics`, `dataStorage`.
    *   Define **dirty state** for each saveable card: `isAppearanceDirty`, `isLangRegionDirty`, `isNotificationsDirty`, `isPrivacyDirty`. Initialize to `false`.
    *   Define `initialMetadata` state to store the initially fetched metadata for comparison.
    *   `useEffect`: On mount (if `user.id`), fetch data via `Promise.all` (`getCurrentUserDataAction`, `getProfileByUserIdAction`, `getCurrentUserUsageAction`).
    *   Populate settings states from fetched `userData.metadata`. Store fetched metadata in `initialMetadata`. Handle loading/error.

2.  **Main Structure (`settings/page.tsx`)**:
    *   Render page title/description.
    *   Implement `Tabs` (`defaultValue="profile"`).
    *   `TabsList`: `TabsTrigger` for "Profile", "Preferences", "Notifications", "Privacy", "Subscription & Billing".

3.  **Profile Tab (`TabsContent value="profile"`)**:
    *   Render `<UserProfile path="/dashboard/profile" routing="path" appearance={{...}} />`. Ensure it takes appropriate width/height.

4.  **Preferences Tab (`TabsContent value="preferences"`)**:
    *   Use a grid layout (`grid grid-cols-1 md:grid-cols-2 gap-6`).
    *   **Card 1: Appearance**:
        *   `CardHeader`: Title, Description, Icon (`Palette`).
        *   `CardContent`: Use `div className="grid grid-cols-3 items-center gap-4"`. `Label` (col-span-1, text-right), `Select` (col-span-2) for Theme Preference. **Increase contrast** for description text below the label.
        *   `CardFooter`: `<Button onClick={handleSavePreferences} disabled={!isAppearanceDirty || isPending}>Save</Button>`.
    *   **Card 2: Language & Region**:
        *   `CardHeader`: Title, Description, Icon (`Languages`).
        *   `CardContent`: Use grid layout for Language, Date Format, Time Format `Select` components.
        *   `CardFooter`: `<Button onClick={handleSaveLangRegion} disabled={!isLangRegionDirty || isPending}>Save</Button>`.
    *   **Dirty Checking:** In `onValueChange` for each `Select`, update state *and* compare with `initialMetadata` to set the correct dirty flag (e.g., `setIsAppearanceDirty(newTheme !== initialMetadata?.theme)`).

5.  **Notifications Tab (`TabsContent value="notifications"`)**:
    *   Render one `Card`.
    *   `CardHeader`: Title, Description, Icon (`Bell`).
    *   `CardContent`: Use `div className="space-y-4"`. For each notification type, use `div className="flex items-center justify-between"`. Left side: `div` with `Label` and description (improve contrast). Right side: `Switch` bound to state.
    *   `CardFooter`: `<Button onClick={handleSaveNotifications} disabled={!isNotificationsDirty || isPending}>Save</Button>`.
    *   **Dirty Checking:** In `onCheckedChange` for each `Switch`, update state and compare with `initialMetadata.notificationSettings` to set `isNotificationsDirty`.

6.  **Privacy Tab (`TabsContent value="privacy"`)**:
    *   Use grid layout (`grid grid-cols-1 md:grid-cols-2 gap-6`).
    *   **Card 1: Data Usage**:
        *   `CardHeader`: Title, Description, Icon (`Lock`).
        *   `CardContent`: Sections for "Usage Analytics", "Document Storage" using `Switch` components with improved layout/contrast.
        *   `CardFooter`: `<Button onClick={handleSavePrivacy} disabled={!isPrivacyDirty || isPending}>Save</Button>`.
    *   **Card 2: Manage Your Data**:
        *   `CardHeader`: Title, Icon (`Database`).
        *   `CardContent`: Section "Export Your Data" (Button triggers `requestDataExportAction` - TBD). Section "Delete Account" (`AlertDialog` triggers `deleteAccountAction` - TBD).
    *   **Dirty Checking:** In `Switch` handlers, update state and compare with `initialMetadata.privacySettings` to set `isPrivacyDirty`.

7.  **Subscription & Billing Tab (`TabsContent value="billing"`)**:
    *   Use grid layout (`grid grid-cols-1 lg:grid-cols-3 gap-6`).
    *   **Card 1: Current Plan & Usage (lg:col-span-1)**:
        *   `CardHeader`: Title "Current Plan".
        *   `CardContent`: Display plan name (`profileData.membership`) with `Badge`. List key features/limits from `getPlanById`. Show usage "X / Y pages". Render `<Progress value={usagePercentage} />`. Show "Z days left".
        *   `CardFooter`: Conditionally render `<Button onClick={handleManageBilling} disabled={isPending}>Manage Billing</Button>` if `profileData.stripeCustomerId`. Wrap logic in `useTransition`. Call `createBillingPortalSessionAction` -> redirect.
    *   **Card 2: Available Plans (lg:col-span-2)**:
        *   `CardHeader`: Title "Available Plans".
        *   `CardContent`: Use grid (`grid grid-cols-1 md:grid-cols-2 gap-4`). Map `subscriptionPlans`. For paid plans *not* current, render a mini-card showing name, price, key limit, and "Upgrade" `Button`.
        *   **Upgrade Button Logic:** Wrap in `useTransition`. Call `createCheckoutSessionAction(userId, plan.planId)`. Redirect on success. Handle errors with `toast`.

8.  **Saving Logic (`settings/page.tsx`)**:
    *   Implement `handleSavePreferences`, `handleSaveNotifications`, `handleSavePrivacy`.
    *   Each uses `startTransition`.
    *   Construct the *specific section's* metadata (e.g., `prefsMeta = { theme, language, dateFormat, timeFormat }`).
    *   Call `updateUserIdentityAction(userId, { metadata: { ...initialMetadata, ...prefsMeta } })`. **Crucially, merge with initialMetadata to avoid overwriting other sections.**
    *   On success: `toast`, update `userData` state, update `initialMetadata` with the *newly saved* data, reset the specific dirty flag (e.g., `setIsPreferencesDirty(false)`).
    *   On failure: `toast`.

9.  **Backend Actions**:
    *   Verify `updateUserIdentityAction` correctly merges nested JSONB `metadata`.
    *   Implement `requestDataExportAction` and `deleteAccountAction` if needed for MVP, otherwise defer.

10. **Polish**: Focus on contrast, spacing, alignment, responsive behavior, loading states (`Skeleton`), and clear feedback (`toast`). Use `Tooltip`s generously.
