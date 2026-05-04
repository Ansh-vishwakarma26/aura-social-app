"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "./utils";

const sizeClasses = {
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-20",
};

// ── Convenience wrapper ────────────────────────────────────────────────────────
// Usage: <Avatar src="..." alt="John" size="sm" />
interface AvatarProps {
  src?: string;
  alt?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}

function Avatar({ src, alt, size = "md", className }: AvatarProps) {
  const initials = alt
    ? alt.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700",
        sizeClasses[size],
        className,
      )}
    >
      <AvatarPrimitive.Image
        src={src}
        alt={alt ?? ""}
        className="aspect-square size-full object-cover"
      />
      <AvatarPrimitive.Fallback
        className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
        delayMs={300}
      >
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

// ── Low-level primitives (still exported for backward compat) ──────────────────
function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
