---
title: "feat: Add Light Theme with Toggle"
type: feat
status: active
date: 2026-02-21
---

# feat: Add Light Theme with Toggle

## Overview

Add a user-togglable light/dark/system theme to the app. The dark theme is currently hardcoded (`className="dark"` on `<html>`). Both `:root` (light) and `.dark` token sets already exist in `globals.css`, but the light tokens need redesigning to match the retro pixel aesthetic with warm off-white + amber tones.

## Problem Statement

The app is locked to dark mode with no way for users to switch. Users who prefer light mode or want to respect their OS preference have no option.

## Proposed Solution

1. Install `next-themes` for theme management
2. Redesign light mode CSS tokens (warm off-white + amber palette)
3. Add `ThemeProvider` wrapper with `attribute="class"` to match existing `.dark` selector
4. Add theme toggle (light/dark/system) in the user menu dropdown
5. Default to `"system"` for new users; persist in localStorage

## Technical Approach

### Phase 1: Infrastructure — next-themes Setup

**Files changed:**

- `app/layout.tsx` — Remove hardcoded `className="dark"`, add `suppressHydrationWarning` to `<html>`, wrap children in `ThemeProvider`

```tsx
// app/layout.tsx
import { ThemeProvider } from "next-themes";

<html lang="en" suppressHydrationWarning>
  <body className={`${GeistPixelSquare.variable} font-sans antialiased`}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  </body>
</html>;
```

**Install:**

```bash
pnpm add next-themes
```

**Key decisions:**

- `attribute="class"` — matches existing `@custom-variant dark (&:is(.dark *))` in globals.css
- `defaultTheme="system"` — respects OS preference for new users
- `enableSystem` — enables `prefers-color-scheme` media query listening
- `suppressHydrationWarning` on `<html>` — prevents React hydration mismatch warnings from the blocking script `next-themes` injects
- FOUC strategy: rely on `next-themes`' default blocking `<script>` injection (reads localStorage before paint). Acceptable for this app — no cookie/middleware needed.

### Phase 2: Redesign Light Mode Tokens

**File changed:** `app/globals.css` — update `:root` block

Redesign the light mode palette to be warm off-white + amber, preserving the retro/pixel aesthetic:

```css
:root {
  /* Warm paper/cream background instead of pure white */
  --background: oklch(0.97 0.01 85); /* warm off-white, slight amber tint */
  --foreground: oklch(0.18 0.02 60); /* dark warm brown, not pure black */

  /* Cards slightly lighter than background for subtle layering */
  --card: oklch(0.98 0.008 85);
  --card-foreground: oklch(0.18 0.02 60);

  /* Muted: desaturated warm tone */
  --muted: oklch(0.93 0.015 80);
  --muted-foreground: oklch(0.45 0.03 60);

  /* Primary: amber, slightly deeper for contrast on light bg */
  --primary: oklch(0.6 0.18 55);
  --primary-foreground: oklch(0.98 0.01 85);

  /* Secondary: light amber wash */
  --secondary: oklch(0.92 0.03 75);
  --secondary-foreground: oklch(0.25 0.04 60);

  /* Borders: warm gray, visible but not harsh */
  --border: oklch(0.88 0.015 75);
  --input: oklch(0.88 0.015 75);
  --ring: oklch(0.6 0.18 55);

  /* Destructive: warm red */
  --destructive: oklch(0.55 0.22 25);

  /* Accent */
  --accent: oklch(0.93 0.03 75);
  --accent-foreground: oklch(0.25 0.04 60);

  /* Popover */
  --popover: oklch(0.98 0.008 85);
  --popover-foreground: oklch(0.18 0.02 60);

  /* Sidebar tokens — warm tinted */
  --sidebar: oklch(0.95 0.015 80);
  --sidebar-foreground: oklch(0.25 0.04 60);
  --sidebar-primary: oklch(0.6 0.18 55);
  --sidebar-primary-foreground: oklch(0.98 0.01 85);
  --sidebar-accent: oklch(0.91 0.025 75);
  --sidebar-accent-foreground: oklch(0.25 0.04 60);
  --sidebar-border: oklch(0.88 0.015 75);
  --sidebar-ring: oklch(0.6 0.18 55);

  /* Chart colors — amber spectrum, warm */
  --chart-1: oklch(0.6 0.18 55);
  --chart-2: oklch(0.65 0.15 65);
  --chart-3: oklch(0.55 0.2 45);
  --chart-4: oklch(0.7 0.12 75);
  --chart-5: oklch(0.5 0.22 35);

  --radius: 0;
}
```

**Design rationale:**

- Off-white backgrounds (`oklch ~0.97`) avoid harsh pure white, feel like warm paper
- All neutral tones carry a slight amber/warm hue (hue ~75-85) for cohesion
- Primary amber deepened slightly (`0.60` vs `0.67`) for WCAG AA contrast on light backgrounds
- Borders are visible but subtle — important with `--radius: 0` (sharp edges need clear borders)
- Dark foreground uses warm brown, not pure black — easier on the eyes

### Phase 3: Theme Toggle Component

**New file:** `src/components/theme-toggle.tsx`

A dropdown menu triggered from the user menu with three options: Light, Dark, System.

```tsx
// src/components/theme-toggle.tsx
"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Sun className="size-4" />
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4" /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4" /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="size-4" /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
```

**Integration in user menu:** `src/components/app-shell/user-menu.tsx` — add `<ThemeToggle />` inside the dropdown menu.

### Phase 4: Visual QA Pass

After wiring everything up, do a visual pass across key pages:

- [ ] Dashboard layout (sidebar + content)
- [ ] Dataset list and detail pages
- [ ] Auth pages (login/signup)
- [ ] Setup wizard
- [ ] Dialog/modal overlays
- [ ] Toasts (Sonner)
- [ ] Tables and cards

Check for:

- Contrast issues (text on backgrounds)
- Borders disappearing or becoming too harsh
- Chart readability
- Focus ring visibility
- Sidebar visual hierarchy

## Acceptance Criteria

- [ ] Theme toggle in user menu with Light / Dark / System options
- [ ] Light theme uses warm off-white + amber palette (not pure white)
- [ ] Dark theme unchanged from current
- [ ] System mode respects OS `prefers-color-scheme` and reacts to changes in real-time
- [ ] Preference persists in localStorage across page reloads
- [ ] No FOUC (flash of unstyled content) on page load
- [ ] `suppressHydrationWarning` on `<html>` — no console warnings
- [ ] All pages visually reviewed in both themes
- [ ] WCAG AA contrast ratios met for text on all background colors
- [ ] Toggle is keyboard accessible

## Dependencies & Risks

**Dependencies:**

- `next-themes` package (well-maintained, ~2M weekly downloads, works with Next.js App Router)

**Risks:**

- **FOUC on very first visit:** `next-themes` blocking script handles most cases, but a brief flash is possible on slow connections. Acceptable tradeoff vs. cookie/middleware complexity.
- **Component hardcoded colors:** If any shadcn/ui components or custom components use hardcoded colors (e.g., `bg-zinc-900` instead of `bg-background`), they won't respond to theme changes. The QA pass in Phase 4 will catch these.
- **Tailwind v4 compatibility:** `next-themes` uses `class` attribute strategy which matches the existing `@custom-variant dark` setup. No config conflicts expected.

## References

- `app/globals.css` — all CSS tokens (`:root` and `.dark` blocks)
- `app/layout.tsx` — root layout, currently hardcodes `className="dark"`
- `src/components/app-shell/user-menu.tsx` — where toggle will be placed
- `src/components/app-shell/top-bar.tsx` — adjacent UI for reference
- `app/(dashboard)/layout.tsx` — dashboard shell layout
- [next-themes docs](https://github.com/pacocoursey/next-themes)
