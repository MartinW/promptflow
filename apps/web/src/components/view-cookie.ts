/**
 * Cookie name for the persisted /prompts view toggle (list / canvas /
 * duplicates). Split into its own server-safe module so the page Server
 * Component can import it — `view-toggle.tsx` is `"use client"` and
 * Next.js refuses cross-boundary function imports from such modules.
 */
export const VIEW_COOKIE_NAME = "pf-view";
export const VIEW_COOKIE_MAX_AGE_DAYS = 30;
