"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStyleVariant } from "@/components/style-variant";

export function StylePreview() {
  const { style } = useStyleVariant();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live preview</CardTitle>
        <CardDescription>
          The card, buttons, and input below render with the active Style ({style}).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>default</Badge>
            <Badge variant="secondary">secondary</Badge>
            <Badge variant="outline">outline</Badge>
          </div>
          <Input placeholder="Type something…" defaultValue="" />
          <p className="text-sm text-muted-foreground">
            For the full system, open the{" "}
            <a href="/design" className="font-medium text-foreground">
              Design page
            </a>
            .
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <span className="text-xs text-muted-foreground">
          Radii, borders, shadows, motion, and typography all follow your selection.
        </span>
      </CardFooter>
    </Card>
  );
}
