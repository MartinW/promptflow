import type { Metadata } from "next";
import { StylePreview } from "@/components/style-preview";
import { ThemePicker } from "@/components/theme-picker";

export const metadata: Metadata = {
  title: "Theme · Settings · PromptFlow",
};

export default function ThemeSettingsPage() {
  return (
    <section aria-labelledby="theme-heading" className="space-y-6">
      <div>
        <h2 id="theme-heading" className="text-base font-medium">
          Theme
        </h2>
        <p className="text-sm text-muted-foreground">Choose how the interface should appear.</p>
      </div>
      <ThemePicker />
      <StylePreview />
    </section>
  );
}
