"use client";

import { useEffect, type RefObject } from "react";

type Rgba = { r: number; g: number; b: number; a: number };

const transparent: Rgba = { r: 255, g: 255, b: 255, a: 0 };

function cx(base: string, extra = "") {
  return [base, extra].filter(Boolean).join(" ");
}

export function adaptiveGlassSurface(extra?: string) {
  return cx("adaptive-glass", extra);
}

export function adaptiveGlassItem(extra?: string) {
  return cx("adaptive-glass-item", extra);
}

export function adaptiveGlassCluster(extra?: string) {
  return cx("adaptive-glass-cluster", extra);
}

export function adaptiveGlassActive(extra?: string) {
  return cx("adaptive-glass-active", extra);
}

export function adaptiveGlassIconButton(extra?: string) {
  return cx("adaptive-glass-icon-button", extra);
}

function parseColor(value: string): Rgba | null {
  const color = value.trim();
  if (!color || color === "transparent") return null;

  const modern = color.match(/^rgba?\(([^)]+)\)$/i);
  if (!modern) return null;

  const parts = modern[1]
    .replace(/\//g, " ")
    .split(/[,\s]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;

  const toChannel = (part: string) => {
    if (part.endsWith("%")) return Math.round((Number.parseFloat(part) / 100) * 255);
    return Number.parseFloat(part);
  };

  const alpha = parts[3] === undefined ? 1 : parts[3].endsWith("%") ? Number.parseFloat(parts[3]) / 100 : Number.parseFloat(parts[3]);
  return {
    r: clamp(toChannel(parts[0]), 0, 255),
    g: clamp(toChannel(parts[1]), 0, 255),
    b: clamp(toChannel(parts[2]), 0, 255),
    a: clamp(alpha, 0, 1)
  };
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function composite(fg: Rgba, bg: Rgba): Rgba {
  const alpha = fg.a + bg.a * (1 - fg.a);
  if (alpha <= 0) return transparent;
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / alpha,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / alpha,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / alpha,
    a: alpha
  };
}

function luminance(color: Rgba) {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function contrastRatio(a: Rgba, b: Rgba) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function rgba(color: Rgba, alpha = color.a) {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

function elementStack(element: Element) {
  const stack: Element[] = [];
  let current: Element | null = element;
  while (current) {
    stack.push(current);
    current = current.parentElement;
  }
  return stack.reverse();
}

function resolvedBackground(element: Element) {
  let result = transparent;
  for (const item of elementStack(element)) {
    const color = parseColor(getComputedStyle(item).backgroundColor);
    if (color) result = composite(color, result);
  }
  return composite(result, { r: 247, g: 249, b: 251, a: 1 });
}

function nearbyTextColor(element: Element) {
  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    if ((current.textContent || "").trim().length > 0) {
      const color = parseColor(getComputedStyle(current).color);
      if (color && color.a > 0.2) return color;
    }
    current = current.parentElement;
  }
  return null;
}

function samplePoints(rect: DOMRect) {
  const insetX = Math.min(18, rect.width * 0.2);
  const insetY = Math.min(12, rect.height * 0.25);
  return [
    [rect.left + rect.width / 2, rect.top + rect.height / 2],
    [rect.left + insetX, rect.top + insetY],
    [rect.right - insetX, rect.top + insetY],
    [rect.left + insetX, rect.bottom - insetY],
    [rect.right - insetX, rect.bottom - insetY]
  ] as const;
}

function average(colors: Rgba[]) {
  if (colors.length === 0) return { r: 247, g: 249, b: 251, a: 1 };
  return colors.reduce(
    (acc, color) => ({
      r: acc.r + color.r / colors.length,
      g: acc.g + color.g / colors.length,
      b: acc.b + color.b / colors.length,
      a: acc.a + color.a / colors.length
    }),
    { r: 0, g: 0, b: 0, a: 0 }
  );
}

function applyPalette(element: HTMLElement, background: Rgba, textSamples: Rgba[]) {
  const lightFg: Rgba = { r: 15, g: 23, b: 42, a: 1 };
  const darkFg: Rgba = { r: 248, g: 250, b: 252, a: 1 };
  const bgLum = luminance(background);
  const textLum = textSamples.length ? luminance(average(textSamples)) : bgLum;
  const lightContrast = contrastRatio(lightFg, background);
  const darkContrast = contrastRatio(darkFg, background);
  const useDarkGlass = darkContrast > lightContrast || bgLum < 0.34 || textLum < 0.38;

  const lightStrength = clamp(1 - bgLum, 0, 1);
  const lightAlpha = 0.54 + lightStrength * 0.2;
  const borderAlpha = 0.44 + lightStrength * 0.18;
  const shadowAlpha = 0.06 + lightStrength * 0.08;

  const vars = useDarkGlass
    ? {
        "--adaptive-glass-fg": "rgba(248, 250, 252, 0.96)",
        "--adaptive-glass-muted-fg": "rgba(226, 232, 240, 0.74)",
        "--adaptive-glass-bg-a": "rgba(15, 23, 42, 0.54)",
        "--adaptive-glass-bg-b": "rgba(15, 23, 42, 0.36)",
        "--adaptive-glass-bg-c": "rgba(255, 255, 255, 0.10)",
        "--adaptive-glass-border": "rgba(255, 255, 255, 0.22)",
        "--adaptive-glass-hairline": "rgba(255, 255, 255, 0.14)",
        "--adaptive-glass-hover-bg": "rgba(255, 255, 255, 0.12)",
        "--adaptive-glass-chip-bg": "rgba(255, 255, 255, 0.10)",
        "--adaptive-glass-chip-border": "rgba(255, 255, 255, 0.18)",
        "--adaptive-glass-active-bg": "rgba(248, 250, 252, 0.92)",
        "--adaptive-glass-active-fg": "rgba(15, 23, 42, 0.96)",
        "--adaptive-glass-active-shadow": "0 12px 26px rgba(0, 0, 0, 0.28)",
        "--adaptive-glass-text-shadow": "0 1px 1px rgba(0, 0, 0, 0.24)",
        "--adaptive-glass-shadow": "0 20px 55px rgba(0, 0, 0, 0.22)"
      }
    : {
        "--adaptive-glass-fg": "rgba(15, 23, 42, 0.94)",
        "--adaptive-glass-muted-fg": "rgba(51, 65, 85, 0.76)",
        "--adaptive-glass-bg-a": `rgba(255, 255, 255, ${lightAlpha.toFixed(3)})`,
        "--adaptive-glass-bg-b": `rgba(255, 255, 255, ${(lightAlpha - 0.18).toFixed(3)})`,
        "--adaptive-glass-bg-c": `rgba(20, 184, 166, ${(0.07 + lightStrength * 0.05).toFixed(3)})`,
        "--adaptive-glass-border": `rgba(255, 255, 255, ${borderAlpha.toFixed(3)})`,
        "--adaptive-glass-hairline": `rgba(15, 23, 42, ${(0.08 + lightStrength * 0.05).toFixed(3)})`,
        "--adaptive-glass-hover-bg": `rgba(255, 255, 255, ${(0.44 + lightStrength * 0.18).toFixed(3)})`,
        "--adaptive-glass-chip-bg": "rgba(255, 255, 255, 0.34)",
        "--adaptive-glass-chip-border": "rgba(255, 255, 255, 0.58)",
        "--adaptive-glass-active-bg": "rgba(15, 23, 42, 0.92)",
        "--adaptive-glass-active-fg": "rgba(255, 255, 255, 0.96)",
        "--adaptive-glass-active-shadow": "0 12px 28px rgba(15, 23, 42, 0.18)",
        "--adaptive-glass-text-shadow": `0 1px 1px ${rgba(background, 0.18)}`,
        "--adaptive-glass-shadow": `0 18px 48px rgba(15, 23, 42, ${shadowAlpha.toFixed(3)})`
      };

  for (const [name, value] of Object.entries(vars)) {
    element.style.setProperty(name, value);
  }
}

export function useAdaptiveGlass(ref: RefObject<HTMLElement | null>, watchKey?: string) {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof window === "undefined") return;

    let frame = 0;
    const sample = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const previousPointerEvents = element.style.pointerEvents;
      element.style.pointerEvents = "none";

      const backgrounds: Rgba[] = [];
      const textColors: Rgba[] = [];
      for (const [x, y] of samplePoints(rect)) {
        const target = document.elementFromPoint(clamp(x, 0, window.innerWidth - 1), clamp(y, 0, window.innerHeight - 1));
        if (!target) continue;
        backgrounds.push(resolvedBackground(target));
        const textColor = nearbyTextColor(target);
        if (textColor) textColors.push(textColor);
      }

      element.style.pointerEvents = previousPointerEvents;
      applyPalette(element, average(backgrounds), textColors);
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(sample);
    };

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    media.addEventListener("change", schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", schedule);
    };
  }, [ref, watchKey]);
}
