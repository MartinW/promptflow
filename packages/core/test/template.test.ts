import { describe, expect, it } from "vitest";
import {
  extractVariables,
  formatReferenceTag,
  parseReferenceBody,
  parseReferenceDetails,
  parseReferences,
  parseTemplateTokens,
  renderPrompt,
  validatePromptTemplate,
} from "../src/template";

const REF = (name: string, suffix: "version=1" | "label=production" | "label=latest" = "label=production") =>
  `@@@langfusePrompt:name=${name}|${suffix}@@@`;

describe("validatePromptTemplate", () => {
  it("returns valid for a template with no variables", () => {
    const result = validatePromptTemplate("Hello, world.");
    expect(result.valid).toBe(true);
    expect(result.variables).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("extracts simple variables", () => {
    const result = validatePromptTemplate("Hello, {{name}}!");
    expect(result.valid).toBe(true);
    expect(result.variables).toEqual(["name"]);
  });

  it("extracts variables in first-seen order, deduplicated", () => {
    const result = validatePromptTemplate("Hi {{name}}. {{name}} again. Bye {{user}}.");
    expect(result.variables).toEqual(["name", "user"]);
  });

  it("tolerates whitespace inside braces", () => {
    const result = validatePromptTemplate("{{ name }} and {{  city  }}");
    expect(result.valid).toBe(true);
    expect(result.variables).toEqual(["name", "city"]);
  });

  it("flags unclosed `{{`", () => {
    const result = validatePromptTemplate("Hello, {{name");
    expect(result.valid).toBe(false);
    expect(result.issues[0].kind).toBe("unclosed_variable");
  });

  it("flags empty variable name", () => {
    const result = validatePromptTemplate("Hello, {{}}!");
    expect(result.valid).toBe(false);
    expect(result.issues[0].kind).toBe("invalid_variable_name");
  });

  it("flags invalid variable names (digit prefix)", () => {
    const result = validatePromptTemplate("Hello, {{1name}}!");
    expect(result.valid).toBe(false);
    expect(result.issues[0].kind).toBe("invalid_variable_name");
  });

  it("flags invalid variable names (special characters)", () => {
    const result = validatePromptTemplate("Hello, {{first-name}}!");
    expect(result.valid).toBe(false);
    expect(result.issues[0].kind).toBe("invalid_variable_name");
  });

  it("ignores stray single braces in prose", () => {
    const result = validatePromptTemplate("This { is } fine.");
    expect(result.valid).toBe(true);
  });
});

describe("renderPrompt", () => {
  it("substitutes variables", () => {
    expect(renderPrompt("Hello, {{name}}!", { name: "Alice" })).toBe("Hello, Alice!");
  });

  it("substitutes the same variable in multiple places", () => {
    expect(renderPrompt("{{name}} and {{name}} again", { name: "Bob" })).toBe("Bob and Bob again");
  });

  it("tolerates whitespace inside braces", () => {
    expect(renderPrompt("{{ name }}", { name: "Carol" })).toBe("Carol");
  });

  it("leaves missing variables literal in lenient mode", () => {
    expect(renderPrompt("Hello {{name}}", {})).toBe("Hello {{name}}");
  });

  it("throws on missing variables in strict mode", () => {
    expect(() => renderPrompt("Hello {{name}}", {}, { strict: true })).toThrow(
      /missing variable "name"/,
    );
  });

  it("substitutes empty strings", () => {
    expect(renderPrompt("a{{x}}b", { x: "" })).toBe("ab");
  });
});

describe("extractVariables", () => {
  it("returns deduplicated, ordered variable names", () => {
    expect(extractVariables("{{a}} {{b}} {{a}} {{c}}")).toEqual(["a", "b", "c"]);
  });

  it("does not include references", () => {
    expect(extractVariables(`{{a}} ${REF("some/prompt")} {{b}}`)).toEqual(["a", "b"]);
  });
});

describe("Langfuse-style references in validatePromptTemplate", () => {
  it("recognises a label-pinned reference", () => {
    const result = validatePromptTemplate(`Hello {{name}}, see ${REF("shared/intro", "label=production")}.`);
    expect(result.valid).toBe(true);
    expect(result.variables).toEqual(["name"]);
    expect(result.references).toEqual(["shared/intro"]);
    expect(result.referenceDetails[0]).toEqual({ name: "shared/intro", label: "production" });
  });

  it("recognises a version-pinned reference", () => {
    const result = validatePromptTemplate(REF("agents/code", "version=1"));
    expect(result.valid).toBe(true);
    expect(result.referenceDetails[0]).toEqual({ name: "agents/code", version: 1 });
  });

  it("dedupes references in first-seen order by name", () => {
    const template = `${REF("a")} ${REF("b")} ${REF("a")} ${REF("c")}`;
    const result = validatePromptTemplate(template);
    expect(result.references).toEqual(["a", "b", "c"]);
  });

  it("flags a malformed reference (missing pin)", () => {
    const result = validatePromptTemplate("Hi @@@langfusePrompt:name=oops@@@");
    expect(result.valid).toBe(false);
    expect(result.issues[0].kind).toBe("invalid_reference");
  });

  it("flags a malformed reference (invalid version)", () => {
    const result = validatePromptTemplate("@@@langfusePrompt:name=p|version=notanumber@@@");
    expect(result.valid).toBe(false);
    expect(result.issues[0].kind).toBe("invalid_reference");
  });

  it("accepts the full prompt-name alphabet", () => {
    const result = validatePromptTemplate(REF("agents/chat.v2:greeting_v1-prod", "label=production"));
    expect(result.valid).toBe(true);
    expect(result.references).toEqual(["agents/chat.v2:greeting_v1-prod"]);
  });

  it("returns tokens with positions for variables and references", () => {
    const template = `x {{a}} y ${REF("b/c", "label=production")} z`;
    const result = validatePromptTemplate(template);
    const variable = result.tokens.find((t) => t.kind === "variable");
    const reference = result.tokens.find((t) => t.kind === "reference");
    expect(variable).toMatchObject({ kind: "variable", name: "a", start: 2, end: 7 });
    expect(reference?.name).toBe("b/c");
    expect(reference?.reference).toEqual({ name: "b/c", label: "production" });
  });
});

describe("renderPrompt leaves references alone", () => {
  it("substitutes variables but not references", () => {
    const tag = REF("intro");
    expect(
      renderPrompt(`Hi {{name}}, see ${tag}.`, { name: "Ada", intro: "ignored" }),
    ).toBe(`Hi Ada, see ${tag}.`);
  });
});

describe("parseTemplateTokens", () => {
  it("returns variables, references, and positional tokens", () => {
    const result = parseTemplateTokens(`{{a}} ${REF("b")} {{a}}`);
    expect(result.variables).toEqual(["a"]);
    expect(result.references).toEqual(["b"]);
    expect(result.tokens).toHaveLength(3);
  });
});

describe("parseReferences", () => {
  it("returns deduplicated, ordered references", () => {
    expect(parseReferences(`${REF("a")} ${REF("b")} ${REF("a")} ${REF("c")}`)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("returns empty array for templates with no references", () => {
    expect(parseReferences("{{name}} plain text")).toEqual([]);
  });
});

describe("parseReferenceDetails", () => {
  it("returns structured references with version/label", () => {
    const result = parseReferenceDetails(
      `${REF("a", "version=2")} ${REF("b", "label=production")}`,
    );
    expect(result).toEqual([
      { name: "a", version: 2 },
      { name: "b", label: "production" },
    ]);
  });
});

describe("parseReferenceBody", () => {
  it("parses name + version", () => {
    expect(parseReferenceBody("name=foo|version=3")).toEqual({ name: "foo", version: 3 });
  });

  it("parses name + label", () => {
    expect(parseReferenceBody("name=foo|label=production")).toEqual({
      name: "foo",
      label: "production",
    });
  });

  it("rejects body missing the pin", () => {
    expect(parseReferenceBody("name=foo")).toBeNull();
  });

  it("rejects body with wrong order", () => {
    // Both fields must be present; "name" is always required.
    expect(parseReferenceBody("version=1|label=x")).toBeNull();
  });

  it("rejects body with extra fields", () => {
    expect(parseReferenceBody("name=foo|label=x|extra=y")).toBeNull();
  });
});

describe("formatReferenceTag", () => {
  it("formats a version-pinned reference", () => {
    expect(formatReferenceTag({ name: "foo", version: 2 })).toBe(
      "@@@langfusePrompt:name=foo|version=2@@@",
    );
  });

  it("formats a label-pinned reference", () => {
    expect(formatReferenceTag({ name: "foo", label: "production" })).toBe(
      "@@@langfusePrompt:name=foo|label=production@@@",
    );
  });

  it("falls back to label=latest when neither version nor label is given", () => {
    expect(formatReferenceTag({ name: "foo" })).toBe(
      "@@@langfusePrompt:name=foo|label=latest@@@",
    );
  });

  it("round-trips through parseReferenceBody", () => {
    const ref = { name: "a/b.c-d", version: 7 };
    const tag = formatReferenceTag(ref);
    const inner = tag.replace(/^@@@langfusePrompt:|@@@$/g, "");
    expect(parseReferenceBody(inner)).toEqual(ref);
  });
});
