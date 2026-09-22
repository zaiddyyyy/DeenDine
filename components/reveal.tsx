"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  as?: "div" | "span";
}

/**
 * Marketing-surface-only scroll/mount reveal (clip-path wipe). Fires once via
 * IntersectionObserver and never re-triggers — an element already in the
 * initial viewport (e.g. the hero) simply reveals immediately on mount.
 * Not for functional UI a user sees on every visit/interaction.
 */
export function Reveal({ children, className, delayMs = 0, as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      // threshold 0 (not e.g. 0.15): some browsers report a degenerate
      // zero-area intersectionRect for an otherwise fully-visible element,
      // which makes isIntersecting false at any threshold above zero.
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(el);

    // Safety net: content on a marketing page must never stay permanently
    // invisible because of an observer quirk in some browser/environment.
    const fallback = window.setTimeout(() => setVisible(true), 2000);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  const Tag = as;

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      data-visible={visible ? "" : undefined}
      className={cn("reveal", className)}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
