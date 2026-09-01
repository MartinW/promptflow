"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useStyleVariant } from "@/components/style-variant";
import { useThemeFamily } from "@/components/theme-family";

const TYPE_SCALE = [
  { token: "text-xs", className: "text-xs" },
  { token: "text-sm", className: "text-sm" },
  { token: "text-base", className: "text-base" },
  { token: "text-lg", className: "text-lg" },
  { token: "text-xl", className: "text-xl" },
  { token: "text-2xl", className: "text-2xl" },
  { token: "text-3xl", className: "text-3xl" },
  { token: "text-4xl", className: "text-4xl" },
];

const SPACING_TOKENS = [
  { name: "1 (4px)", className: "h-2 w-2" },
  { name: "2 (8px)", className: "h-2 w-4" },
  { name: "3 (12px)", className: "h-2 w-6" },
  { name: "4 (16px)", className: "h-2 w-8" },
  { name: "6 (24px)", className: "h-2 w-12" },
  { name: "8 (32px)", className: "h-2 w-16" },
  { name: "12 (48px)", className: "h-2 w-24" },
  { name: "16 (64px)", className: "h-2 w-32" },
];

const ELEVATIONS = [
  { name: "elevation-0", varName: "--elevation-0" },
  { name: "elevation-1", varName: "--elevation-1" },
  { name: "elevation-2", varName: "--elevation-2" },
  { name: "elevation-3", varName: "--elevation-3" },
];

const MOTION_TOKENS = [
  { name: "duration-fast", varName: "--duration-fast" },
  { name: "duration-base", varName: "--duration-base" },
  { name: "duration-slow", varName: "--duration-slow" },
];

const COLOR_TOKENS = [
  { name: "background", varName: "--background" },
  { name: "foreground", varName: "--foreground" },
  { name: "card", varName: "--card" },
  { name: "popover", varName: "--popover" },
  { name: "primary", varName: "--primary" },
  { name: "primary-foreground", varName: "--primary-foreground" },
  { name: "secondary", varName: "--secondary" },
  { name: "secondary-foreground", varName: "--secondary-foreground" },
  { name: "muted", varName: "--muted" },
  { name: "muted-foreground", varName: "--muted-foreground" },
  { name: "accent", varName: "--accent" },
  { name: "accent-foreground", varName: "--accent-foreground" },
  { name: "destructive", varName: "--destructive" },
  { name: "border", varName: "--border" },
  { name: "input", varName: "--input" },
  { name: "ring", varName: "--ring" },
];

export default function DesignPage() {
  const { style } = useStyleVariant();
  const { family } = useThemeFamily();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-12">
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Design system</h1>
        <p className="text-sm text-muted-foreground">
          Every token and primitive rendered under the active settings. Active style:{" "}
          <span className="font-medium text-foreground">{style}</span> · theme:{" "}
          <span className="font-medium text-foreground">{family}</span>. Change them in{" "}
          <a href="/settings" className="underline underline-offset-3 hover:text-foreground">
            Settings
          </a>
          .
        </p>
      </header>

      <Section title="Type scale" caption="Each step pulls from the active Style's leading + tracking.">
        <div className="space-y-4">
          {TYPE_SCALE.map(({ token, className }) => (
            <div key={token} className="grid grid-cols-[7rem_1fr] items-baseline gap-4">
              <code className="text-xs text-muted-foreground">{token}</code>
              <div className={className}>The quick brown fox jumps over the lazy dog</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Display heading" caption="Uses --font-heading (Style display family).">
        <div className="space-y-2">
          <div className="font-heading text-4xl font-semibold tracking-tight">Bold ideas, plainly delivered</div>
          <div className="font-heading text-2xl font-medium">A measured second line</div>
          <div className="font-mono text-sm text-muted-foreground">font-mono · for code and tabular data</div>
        </div>
      </Section>

      <Section title="Color tokens" caption="Live values from the active Theme + Mode.">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {COLOR_TOKENS.map(({ name, varName }) => (
            <div key={name} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <span
                aria-hidden
                className="size-8 rounded-md ring-1 ring-foreground/10"
                style={{ background: `var(${varName})` }}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{name}</div>
                <code className="block text-[0.65rem] text-muted-foreground truncate">{varName}</code>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Shape" caption="Radius and border-width come from --radius and --border-width.">
        <div className="flex flex-wrap items-center gap-6">
          <ShapeSwatch label="rounded-sm" className="rounded-sm" />
          <ShapeSwatch label="rounded-md" className="rounded-md" />
          <ShapeSwatch label="rounded-lg" className="rounded-lg" />
          <ShapeSwatch label="rounded-xl" className="rounded-xl" />
          <ShapeSwatch label="rounded-2xl" className="rounded-2xl" />
          <ShapeSwatch
            label="border-width"
            style={{ border: "var(--border-width) solid var(--border)" }}
          />
        </div>
      </Section>

      <Section title="Elevation" caption="Each tier reads from --elevation-N — Brutalist swaps to hard offsets, Terminal flattens.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pb-8">
          {ELEVATIONS.map(({ name, varName }) => (
            <div key={name} className="space-y-2">
              <div
                className="h-20 w-full rounded-lg bg-card"
                style={{ boxShadow: `var(${varName})` }}
              />
              <code className="text-xs text-muted-foreground">{name}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Motion" caption="Hover the swatches — duration and easing follow the Style.">
        <div className="flex flex-wrap gap-4">
          {MOTION_TOKENS.map(({ name, varName }) => (
            <div
              key={name}
              className="group/motion flex h-16 w-32 cursor-pointer items-end overflow-hidden rounded-lg border border-border bg-card p-2"
              style={{
                transitionProperty: "background-color, transform",
                transitionDuration: `var(${varName})`,
                transitionTimingFunction: "var(--ease-standard)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "";
                e.currentTarget.style.transform = "";
              }}
            >
              <code className="text-xs text-muted-foreground">{name}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing" caption="Tailwind numeric scale — kept consistent across Styles, used per density.">
        <div className="space-y-2">
          {SPACING_TOKENS.map(({ name, className }) => (
            <div key={name} className="flex items-center gap-4">
              <code className="w-24 text-xs text-muted-foreground">{name}</code>
              <div className={`${className} rounded-sm bg-foreground`} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons" caption="Variants × sizes × states.">
        <div className="space-y-6">
          <Row label="default">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </Row>
          <Row label="size">
            <Button size="xs">xs</Button>
            <Button size="sm">sm</Button>
            <Button size="default">default</Button>
            <Button size="lg">lg</Button>
          </Row>
          <Row label="state">
            <Button>Idle</Button>
            <Button disabled>Disabled</Button>
            <Button aria-invalid="true">Invalid</Button>
          </Row>
        </div>
      </Section>

      <Section title="Badges" caption="Inline status pills.">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="ghost">ghost</Badge>
          <Badge variant="destructive">destructive</Badge>
          <Badge variant="link">link</Badge>
        </div>
      </Section>

      <Section title="Inputs" caption="Form fields — radius, border-width, focus ring all token-driven.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Default</span>
            <Input placeholder="Type here" defaultValue="" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Filled</span>
            <Input defaultValue="A value" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Disabled</span>
            <Input disabled defaultValue="Disabled" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Invalid</span>
            <Input aria-invalid defaultValue="Bad value" />
          </label>
          <label className="sm:col-span-2 space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Textarea</span>
            <Textarea placeholder="Multi-line input…" rows={3} />
          </label>
        </div>
      </Section>

      <Section title="Card" caption="Surface primitive — radius and elevation follow the Style.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Standard card</CardTitle>
              <CardDescription>Header, body, footer.</CardDescription>
              <CardAction>
                <Button size="sm" variant="ghost">
                  Action
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p>
                Cards use <code className="font-mono text-xs">--radius</code> and either
                <code className="font-mono text-xs"> ring-1</code> (Clean) or <code className="font-mono text-xs"> --elevation-1</code> (Brutalist/Terminal).
              </p>
            </CardContent>
            <CardFooter>
              <span className="text-xs text-muted-foreground">A footer note</span>
            </CardFooter>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>Compact card</CardTitle>
              <CardDescription>Same primitive, dense size.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Smaller padding, tighter rhythm.</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Dialog" caption="Open the dialog to test motion + elevation under the active Style.">
        <DialogDemo />
      </Section>

      <Section title="Patterns" caption="Common compositions.">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Empty state</CardTitle>
              <CardDescription>No items yet.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-6 text-center text-muted-foreground">
                <span className="text-3xl">∅</span>
                <p className="text-sm">Nothing to show.</p>
                <Button size="sm">Create one</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Loading</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 w-3/4 rounded-md bg-muted animate-pulse" />
                <div className="h-3 w-2/3 rounded-md bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded-md bg-muted animate-pulse" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
              <CardDescription>Something went wrong.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Try again, or contact support if it persists.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="outline">
                Retry
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      <Section title="Separator">
        <div className="space-y-3 max-w-md">
          <p className="text-sm">Section A</p>
          <Separator />
          <p className="text-sm">Section B</p>
        </div>
      </Section>
    </main>
  );
}

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-medium">{title}</h2>
        {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="w-20 text-xs text-muted-foreground">{label}</code>
      {children}
    </div>
  );
}

function ShapeSwatch({
  label,
  className,
  style,
}: {
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`size-16 bg-muted ring-1 ring-foreground/10 ${className ?? ""}`}
        style={style}
      />
      <code className="text-xs text-muted-foreground">{label}</code>
    </div>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>A dialog under the active Style</DialogTitle>
          <DialogDescription>
            The open/close motion uses <code className="font-mono text-xs">--duration-base</code>
            and <code className="font-mono text-xs">--ease-standard</code>.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Borders, radius, and shadow come from the same tokens as the rest of the system.
        </p>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
