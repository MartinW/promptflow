/**
 * Folder-tree projection.
 *
 * Prompt names are slash-delimited (e.g. `agents/chat/system`). This module
 * parses a flat list of names into a nested tree for sidebar rendering and
 * canvas grouping. It's a pure projection — no persistence — so the source
 * of truth stays the prompt name.
 */

export interface FolderNode {
  /** Folder path from root, e.g. `agents/chat`. Empty string for the root. */
  path: string;
  /** Last segment of the path, e.g. `chat`. Empty for the root. */
  name: string;
  children: Map<string, FolderNode>;
  /** Prompt names that live directly in this folder (not its children). */
  prompts: string[];
}

function makeNode(path: string, name: string): FolderNode {
  return { path, name, children: new Map(), prompts: [] };
}

/**
 * Build a folder tree from a flat list of prompt names.
 *
 * Edge cases handled:
 *   - Trailing/leading slashes are ignored (`/foo/`, `foo/` → folder `foo`).
 *   - Consecutive slashes collapse (`a//b` → `a/b`).
 *   - Names without slashes go directly under root.
 */
export function buildFolderTree(names: string[]): FolderNode {
  const root = makeNode("", "");
  for (const name of names) {
    const segments = name.split("/").filter((s) => s.length > 0);
    if (segments.length === 0) continue;
    if (segments.length === 1) {
      root.prompts.push(name);
      continue;
    }
    const leaf = segments[segments.length - 1];
    const folderSegments = segments.slice(0, -1);
    let cursor = root;
    let path = "";
    for (const segment of folderSegments) {
      path = path ? `${path}/${segment}` : segment;
      let child = cursor.children.get(segment);
      if (!child) {
        child = makeNode(path, segment);
        cursor.children.set(segment, child);
      }
      cursor = child;
    }
    cursor.prompts.push(name);
    // `leaf` is unused intentionally — the name is stored verbatim. Keeping the
    // variable as documentation of intent.
    void leaf;
  }
  sortNode(root);
  return root;
}

function sortNode(node: FolderNode): void {
  node.prompts.sort();
  const sortedKeys = Array.from(node.children.keys()).sort();
  const sortedChildren = new Map<string, FolderNode>();
  for (const key of sortedKeys) {
    const child = node.children.get(key);
    if (child) {
      sortNode(child);
      sortedChildren.set(key, child);
    }
  }
  node.children = sortedChildren;
}

/** Find a node by its folder path. Returns null if not found. */
export function nodeForPath(root: FolderNode, path: string): FolderNode | null {
  if (!path) return root;
  const segments = path.split("/").filter((s) => s.length > 0);
  let cursor: FolderNode | undefined = root;
  for (const segment of segments) {
    cursor = cursor?.children.get(segment);
    if (!cursor) return null;
  }
  return cursor ?? null;
}

/**
 * Walk every node in DFS order (root first). Useful for flattening to a
 * rendered list with depth annotations.
 */
export function walkTree(
  root: FolderNode,
  visit: (node: FolderNode, depth: number) => void,
  depth = 0,
): void {
  visit(root, depth);
  for (const child of root.children.values()) {
    walkTree(child, visit, depth + 1);
  }
}
