/**
 * Cookie name for the persisted active-project choice (Langfuse / PostHog).
 * Split into its own server-safe module, same reasoning as `view-cookie.ts`:
 * `project-picker.tsx` is `"use client"` and Next.js refuses cross-boundary
 * function imports from such modules.
 */
export const PROJECT_COOKIE_NAME = "pf-project";
export const PROJECT_COOKIE_MAX_AGE_DAYS = 30;
