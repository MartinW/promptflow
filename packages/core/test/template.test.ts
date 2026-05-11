import { describe, expect, it } from "vitest";
import {
  extractVariables,
  parseReferences,
  parseTemplateTokens,
  renderPrompt,
  validatePromptTemplate,
} from "../src/template";

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
    expect(extractVariables("{{a}} {{@some/prompt}} {{b}}")).toEqual(["a", "b"]);
  });
});

describe("references in validatePromptTemplate", () => {
  it("recognises {{@name}} as a reference, not a variable", () => {
    const result = validatePromptTemplate("Hello {{name}}, see also {{@shared/intro}}.");
    expect(result.valid).toBe(true);
    expect(result.variables).toEqual(["name"]);
    expect(result.references).toEqual(["shared/intro"]);
  });

  it("tolerates whitespace around reference braces", () => {
    const result = validatePromptTemplate("{{ @greetings:hello }}");
    expect(result.valid).toBe(true);
    expect(result.references).toEqual(["greetings:hello"]);
  });

  it("dedupes references in first-seen order", () => {
    const result = validatePromptTemplate("{{@a}} {{@b}} {{@a}} {{@c}}");
    expect(result.references).toEqual(["a", "b", "c"]);
  });

  it("flags an invalid reference name", () => {
    const result = validatePromptTemplate("Hi {{@bad name}}");
    expect(result.valid).toBe(false);
    expect(result.issues[0].kind).toBe("invalid_reference_name");
  });

  it("flags an empty reference (`{{@}}`)", () => {
    const result = validatePromptTemplate("Hi {{@}}");
    expect(result.valid).toBe(false);
    expect(result.issues[0].kind).toBe("invalid_reference_name");
  });

  it("accepts the full prompt-name alphabet (letters, digits, . _ - : /)", () => {
    const result = validatePromptTemplate("{{@agents/chat.v2:greeting_v1-prod}}");
    expect(result.valid).toBe(true);
    expect(result.references).toEqual(["agents/chat.v2:greeting_v1-prod"]);
  });

  it("returns tokens with positions for variables and references", () => {
    const template = "x {{a}} y {{@b/c}} z";
    const result = validatePromptTemplate(template);
    expect(result.tokens).toEqual([
      { kind: "variable", name: "a", start: 2, end: 7 },
      { kind: "reference", name: "b/c", start: 10, end: 18 },
    ]);
  });
});

describe("renderPrompt leaves references alone", () => {
  it("substitutes variables but not references", () => {
    expect(
      renderPrompt("Hi {{name}}, see {{@intro}}.", { name: "Ada", intro: "ignored" }),
    ).toBe("Hi Ada, see {{@intro}}.");
  });
});

describe("parseTemplateTokens", () => {
  it("returns variables, references, and positional tokens", () => {
    const result = parseTemplateTokens("{{a}} {{@b}} {{a}}");
    expect(result.variables).toEqual(["a"]);
    expect(result.references).toEqual(["b"]);
    expect(result.tokens).toHaveLength(3);
    expect(result.tokens[0]).toMatchObject({ kind: "variable", name: "a" });
    expect(result.tokens[1]).toMatchObject({ kind: "reference", name: "b" });
    expect(result.tokens[2]).toMatchObject({ kind: "variable", name: "a" });
  });
});

describe("parseReferences", () => {
  it("returns deduplicated, ordered references", () => {
    expect(parseReferences("{{@a}} {{@b}} {{@a}} {{@c}}")).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for templates with no references", () => {
    expect(parseReferences("{{name}} plain text")).toEqual([]);
  });
});
