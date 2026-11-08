import { describe, expect, it } from "vitest";
import { parseSkillFrontmatter } from "../src/skills";

describe("parseSkillFrontmatter", () => {
  it("parses a valid frontmatter block", () => {
    const content = [
      "---",
      "name: pdf-extraction",
      "description: Extract structured data from PDF documents.",
      "---",
      "",
      "Instructions for the agent.",
    ].join("\n");
    expect(parseSkillFrontmatter(content)).toEqual({
      name: "pdf-extraction",
      description: "Extract structured data from PDF documents.",
    });
  });

  it("strips matching quotes around values", () => {
    const content = ['---', 'name: "pdf-extraction"', "description: 'Extract PDFs.'", "---"].join(
      "\n",
    );
    expect(parseSkillFrontmatter(content)).toEqual({
      name: "pdf-extraction",
      description: "Extract PDFs.",
    });
  });

  it("ignores unrelated frontmatter fields", () => {
    const content = [
      "---",
      "name: pdf-extraction",
      "license: MIT",
      "description: Extract PDFs.",
      "---",
    ].join("\n");
    expect(parseSkillFrontmatter(content)).toEqual({
      name: "pdf-extraction",
      description: "Extract PDFs.",
    });
  });

  it("returns null when description is missing", () => {
    const content = ["---", "name: pdf-extraction", "---"].join("\n");
    expect(parseSkillFrontmatter(content)).toBeNull();
  });

  it("returns null when name is missing", () => {
    const content = ["---", "description: Extract PDFs.", "---"].join("\n");
    expect(parseSkillFrontmatter(content)).toBeNull();
  });

  it("returns null when there is no frontmatter block", () => {
    expect(parseSkillFrontmatter("Just plain instructions, no frontmatter.")).toBeNull();
  });

  it("returns null for an unclosed frontmatter block", () => {
    const content = ["---", "name: pdf-extraction", "description: Extract PDFs."].join("\n");
    expect(parseSkillFrontmatter(content)).toBeNull();
  });

  it("handles CRLF line endings", () => {
    const content = ["---", "name: pdf-extraction", "description: Extract PDFs.", "---"].join(
      "\r\n",
    );
    expect(parseSkillFrontmatter(content)).toEqual({
      name: "pdf-extraction",
      description: "Extract PDFs.",
    });
  });
});
