import { namespaceColor } from "@promptflow/core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type * as React from "react";

interface TagBadgeProps extends React.ComponentProps<typeof Badge> {
  tag: string;
}

/**
 * Tag badge coloured by its namespace. Known namespaces (voice, app, env, …)
 * map to fixed palette slots; unknown prefixes hash deterministically into a
 * fallback palette so the same tag always renders the same colour.
 *
 * Implemented as inline styles driven by HSL hues to avoid bloating Tailwind's
 * generated CSS with one class per palette slot.
 */
export function TagBadge({ tag, className, style, ...rest }: TagBadgeProps) {
  const color = namespaceColor(tag);
  const merged: React.CSSProperties = {
    backgroundColor: `hsl(${color.hue} 80% 92%)`,
    color: `hsl(${color.hue} 70% 26%)`,
    borderColor: `hsl(${color.hue} 60% 80%)`,
    ...style,
  };
  return (
    <Badge variant="outline" className={cn("border", className)} style={merged} {...rest}>
      {tag}
    </Badge>
  );
}
