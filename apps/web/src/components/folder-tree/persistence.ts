/**
 * Cookie name + parser for the FolderTree's open-paths state. Lives in its
 * own module (no "use client" directive) so it can be imported from server
 * components — the React component file is "use client", and Next.js refuses
 * to let a server component import named exports from it.
 */

export const FOLDER_OPEN_COOKIE_NAME = "pf-folders-open";
export const FOLDER_OPEN_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/** Parse the raw cookie value back into a list of folder paths. */
export function parseOpenPathsCookie(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    return decodeURIComponent(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
