import type { Metadata } from "next";
import { ModelPreferencesPicker } from "@/components/preferred-models";
import { groupModelsByProvider, listModels, type ModelGroup } from "@/lib/openrouter";

export const metadata: Metadata = {
  title: "Models · Settings · PromptFlow",
};

const FALLBACK_GROUPS: ModelGroup[] = [
  {
    provider: "Anthropic",
    models: [
      { id: "anthropic/claude-3.5-sonnet", shortName: "claude-3.5-sonnet", provider: "Anthropic", contextLabel: "200k", priceLabel: "$3/$15" },
      { id: "anthropic/claude-3.5-haiku", shortName: "claude-3.5-haiku", provider: "Anthropic", contextLabel: "200k", priceLabel: "$0.80/$4" },
    ],
  },
  {
    provider: "OpenAI",
    models: [
      { id: "openai/gpt-4o", shortName: "gpt-4o", provider: "OpenAI", contextLabel: "128k", priceLabel: "$5/$15" },
      { id: "openai/gpt-4o-mini", shortName: "gpt-4o-mini", provider: "OpenAI", contextLabel: "128k", priceLabel: "$0.15/$0.6" },
    ],
  },
  {
    provider: "Google",
    models: [
      { id: "google/gemini-2.0-flash-exp", shortName: "gemini-2.0-flash-exp", provider: "Google", contextLabel: "1M", priceLabel: "Free" },
    ],
  },
];

export default async function ModelsSettingsPage() {
  const models = await listModels();
  const modelGroups = models.length > 0 ? groupModelsByProvider(models) : FALLBACK_GROUPS;

  return (
    <section aria-labelledby="models-heading" className="space-y-4">
      <div>
        <h2 id="models-heading" className="text-base font-medium">
          Models
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose which models appear in the Playground drop-down. Leave all unchecked to show every available model.
        </p>
      </div>
      <ModelPreferencesPicker allGroups={modelGroups} />
    </section>
  );
}
