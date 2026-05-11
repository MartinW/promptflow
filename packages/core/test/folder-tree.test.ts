import { describe, expect, it } from "vitest";
import { buildFolderTree, nodeForPath, walkTree, type FolderNode } from "../src/folder-tree";

function paths(root: FolderNode): string[] {
  const out: string[] = [];
  walkTree(root, (node) => {
    out.push(node.path);
  });
  return out;
}

describe("buildFolderTree", () => {
  it("returns an empty root for an empty list", () => {
    const root = buildFolderTree([]);
    expect(root.path).toBe("");
    expect(root.children.size).toBe(0);
    expect(root.prompts).toEqual([]);
  });

  it("puts unnested names directly under root", () => {
    const root = buildFolderTree(["greeting", "farewell"]);
    expect(root.prompts).toEqual(["farewell", "greeting"]);
    expect(root.children.size).toBe(0);
  });

  it("nests slash-delimited names", () => {
    const root = buildFolderTree(["agents/chat/system", "agents/chat/user", "agents/code"]);
    expect(paths(root)).toEqual(["", "agents", "agents/chat"]);
    const chat = nodeForPath(root, "agents/chat");
    expect(chat?.prompts).toEqual(["agents/chat/system", "agents/chat/user"]);
    const agents = nodeForPath(root, "agents");
    expect(agents?.prompts).toEqual(["agents/code"]);
  });

  it("collapses consecutive slashes (a//b → a/b)", () => {
    const root = buildFolderTree(["foo//bar"]);
    const foo = nodeForPath(root, "foo");
    expect(foo).not.toBeNull();
    expect(foo?.prompts).toEqual(["foo//bar"]);
  });

  it("ignores leading and trailing slashes", () => {
    const root = buildFolderTree(["/foo/bar/", "baz/"]);
    expect(nodeForPath(root, "foo")?.prompts).toEqual(["/foo/bar/"]);
    // `baz/` has no leaf segment, so it goes under root as itself.
    expect(root.prompts).toEqual(["baz/"]);
  });

  it("sorts children alphabetically", () => {
    const root = buildFolderTree(["z/a", "a/b", "m/c"]);
    const keys = Array.from(root.children.keys());
    expect(keys).toEqual(["a", "m", "z"]);
  });
});

describe("nodeForPath", () => {
  it("returns the root for an empty path", () => {
    const root = buildFolderTree(["x/y"]);
    expect(nodeForPath(root, "")).toBe(root);
  });

  it("returns null for unknown paths", () => {
    const root = buildFolderTree(["x/y"]);
    expect(nodeForPath(root, "missing/folder")).toBeNull();
  });
});
