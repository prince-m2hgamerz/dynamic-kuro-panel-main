

# Plan: Final Panel Overhaul — All Tasks

This is a large set of changes covering bot upgrades, auth fixes, performance, security, SDK support, and more. I'll break it into prioritized phases.

---

## Phase 1: Critical Bug Fixes

### 1A. Referral Code Role/Balance Not Applying
**Problem:** When registering with a referral code, the user always gets "reseller" role regardless of `assigned_role` in referral code.
**Root cause:** The `register-user` edge function creates the user with `email_confirm: true`, which triggers the `handle_new_user` database trigger. The trigger runs and inserts role as `reseller` (fallback), overriding the edge function's intended role. The edge function doesn't explicitly set role/balance after user creation — it relies on the trigger which has a race condition.
**Fix:** After `auth.admin.createUser`, explicitly update the profile balance and insert the correct role from `codeData.assigned_role` in the `register-user` edge function, overriding whatever the trigger set.

### 1B. Screen Getting Stuck on Refresh
**Problem:** Sometimes the screen freezes and refresh doesn't fix it.
**Fix:** Add error boundaries around main layout + auth context. Add a loading timeout (5s) that forces a state reset if auth loading hangs. Add `window.addEventListener('unhandledrejection')` handler to prevent silent crashes.

### 1C. 40% Backend Requests Getting Blocked
**Problem:** Normal panel operations hit rate limits or get blocked by security middleware.
**Fix:** In `sarkar-api`, the rate limit inserts a new row per request instead of using upsert — this fills up the table and causes false positives. Also `check_frontend_access` RPC has aggressive limits. Will review and relax panel-side rate limits (keep API-side strict). Ensure authenticated panel requests bypass API rate limiting.

### 1D. Navbar Not Closing on Page Change (Mobile)
**Problem:** When opening a new page from sidebar, the sidebar stays open.
**Fix:** In sidebar components (OwnerSidebar, AdminSidebar, ResellerSidebar), use the `useSidebar` hook to call `setOpenMobile(false)` when a nav link is clicked on mobile.

---

## Phase 2: Auth & Email

### 2A. Switch to Native Supabase Auth Emails
**Problem:** Currently using custom recovery template. User wants standard Supabase auth confirmation/recovery emails.
**Fix:** Remove the custom `supabase/templates/recovery.html`. The project already uses Supabase Auth — the confirmation and recovery emails will be sent by default Supabase auth. Ensure the `/reset-password` page exists and handles the `type=recovery` token properly.

---

## Phase 3: Performance & Smoothness

### 3A. Faster Page Transitions
**Fix:**
- Remove `AnimatePresence mode="wait"` which blocks the new page until old page finishes exit animation — change to `mode="sync"` or remove exit animations entirely
- Reduce animation duration from 0.4s to 0.15s
- Add `React.lazy` + `Suspense` for heavy pages to enable code splitting

### 3B. Remove Unused Assets
**Fix:** Delete unused images from `public/images/` (TGRKVIP.gif, sunset-bg.webp, sunset-house.webp, login-blocked-bg.webp) after confirming they're not referenced anywhere.

---

## Phase 4: Telegram Bot Upgrade

### 4A. Custom Bot Name in Messages
**Fix:** Add a `display_name` column to `telegram_bots` table. Use it in /start and /buy messages instead of hardcoded "Sarkar PVT Bot".

### 4B. Broadcast System from Panel
**Fix:** Add a "Broadcast" page/section in the panel for owners. It calls an edge function that sends messages to all `telegram_bot_users`. Support text messages and target specific bots.

### 4C. Key Expiry Alerts to Owner
**Fix:** Enhance `key-expiry-check` edge function to send Telegram alerts to admin with key details (device name, device model, days remaining, user info).

### 4D. Send Message to Individual User
**Fix:** Add a "Send Message" action in the Users page that calls the bot to send a custom message to a user's Telegram.

---

## Phase 5: Java/Android SDK Support

### 5A. New SDK Connect Endpoint
**New endpoint:** `sarkar-api/sdk/panel/connect`
- Accepts: `user_key`, `package_name` (from Java client)
- Flow: Check if package verification is enabled for the key → if ON, validate `package_name` against approved packages → then check key validity
- Separate from C++ `/connect` endpoint

### 5B. Package Management Page
**New page:** SDK Panel / Package Keys
- Manage approved package names (add/remove)
- Generate keys with package restriction ON/OFF toggle
- Keys generated here only work via the SDK endpoint

### 5C. Database Changes
- New `approved_packages` table: `id, package_name, created_by, created_at, is_active`
- Add `package_restricted` boolean to `license_keys` table
- Add `approved_package_id` nullable FK to `license_keys`

---

## Phase 6: Security Audit & Hardening

### 6A. Full Security Review
- Verify all RLS policies are correct (already done — anon denied everywhere)
- Check edge functions don't expose sensitive data in error messages (already obfuscated)
- Verify no client-side localStorage contains exploitable tokens
- Ensure `service_role_key` is never exposed client-side
- Check for SQL injection vectors in edge functions (parameterized queries used)

### 6B. Remove Console Logs in Production
- Audit all `console.log` statements in edge functions that might leak sensitive data
- Keep error logging but remove request payload logging

---

## Phase 7: Prompt Generation
Create a detailed AI prompt document at `/mnt/documents/sarkar_panel_v2_prompt.md` with full system architecture, DB schema, RBAC, UI specs (matching your screenshots), and the requirement that everything is server-side.

---

## Implementation Order
1. Phase 1 (bugs) → 2 (auth) → 3 (performance) → 4 (bot) → 5 (SDK) → 6 (security) → 7 (prompt)
2. Final recheck after all changes

## Technical Summary
- **Edge functions modified:** `register-user`, `telegram-bot`, `sarkar-api`, `key-expiry-check`
- **New edge function:** SDK connect handler (or new route in sarkar-api)
- **New DB tables:** `approved_packages`
- **DB migrations:** Add `display_name` to `telegram_bots`, add `package_restricted` to `license_keys`
- **Frontend files:** ~15 files modified for performance, mobile sidebar close, error boundaries
- **Files deleted:** Unused images in `public/images/`

