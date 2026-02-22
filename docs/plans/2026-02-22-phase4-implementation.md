# Phase 4: UI Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the Octo design system (dark navy/teal/orange) across SOP Studio and Docusaurus website with shadcn/ui components and an animated landing page.

**Architecture:** Shared CSS design tokens in `packages/ui/` consumed by both surfaces. shadcn/ui primitives installed into SOP Studio. Docusaurus landing page rebuilt as custom React components with dark ocean theme. SMIL animations for GitHub-compatible Octo SVGs.

**Tech Stack:** Tailwind CSS v4 + shadcn/ui + Radix UI + Lucide icons + class-variance-authority + Vite + Docusaurus 3

---

### Task 1: Create Shared Design Tokens Package (`packages/ui/`)

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/octo-tokens.css`

**Context:** This package holds the Octo design tokens as CSS custom properties. Both SOP Studio (`@import`) and Docusaurus (copy/paste into custom.css) consume these tokens. The tokens come from `/home/ubuntu/knowledgepulse/kp-octo-v2.html`.

**Step 1: Create package.json**

```json
{
  "name": "@knowledgepulse/ui",
  "version": "0.1.0",
  "private": true,
  "exports": {
    "./octo-tokens.css": "./octo-tokens.css"
  }
}
```

**Step 2: Create octo-tokens.css**

This defines all Octo design tokens as CSS custom properties. The `@theme` block registers them with Tailwind v4 (ignored by non-Tailwind consumers).

```css
/* Octo Design System — Color Tokens
 * Source: kp-octo-v2.html
 * Used by: SOP Studio (Tailwind v4), Docusaurus (CSS vars)
 */

@theme {
  /* ── Brand Colors ── */
  --color-kp-blue:    #1E7EC8;
  --color-kp-green:   #18A06A;
  --color-kp-teal:    #12B5A8;
  --color-kp-orange:  #E07A20;
  --color-kp-cyan:    #4ADEFF;

  /* ── Backgrounds ── */
  --color-kp-dark:    #050D16;
  --color-kp-navy:    #081828;
  --color-kp-panel:   #0C1A28;

  /* ── Borders & Text ── */
  --color-kp-border:  #163248;
  --color-kp-text:    #C8DDF0;
  --color-kp-muted:   #4A7FA5;
  --color-kp-heading: #EEF6FF;

  /* ── Body gradients (for reference, not Tailwind) ── */
  --color-kp-body-hi:  #1A3C58;
  --color-kp-body-mid: #0D2438;
  --color-kp-body-lo:  #060E18;

  /* ── Semantic ── */
  --color-kp-success: #18A06A;
  --color-kp-warning: #E07A20;
  --color-kp-error:   #DC2626;
  --color-kp-info:    #1E7EC8;

  /* ── Fonts ── */
  --font-display: 'Outfit', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* ── Radius ── */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 22px;
}
```

**Step 3: Add packages/ui to workspace**

In root `package.json`, add `"packages/ui"` to workspaces array.

**Step 4: Verify**

Run: `bun install`
Expected: resolves workspace dependency

**Step 5: Commit**

```bash
git add packages/ui/ package.json bun.lock*
git commit -m "feat(ui): create shared Octo design tokens package"
```

---

### Task 2: Set Up shadcn/ui in SOP Studio

**Files:**
- Modify: `packages/sop-studio/tsconfig.json` (add path aliases)
- Modify: `packages/sop-studio/vite.config.ts` (add resolve alias)
- Modify: `packages/sop-studio/package.json` (add deps)
- Modify: `packages/sop-studio/src/index.css` (import tokens + base styles)
- Create: `packages/sop-studio/src/lib/utils.ts` (cn utility)

**Context:** shadcn/ui requires path aliases (`@/`), the `cn()` utility (clsx + tailwind-merge), and base CSS variables. Tailwind v4 uses CSS-based config, not tailwind.config.ts.

**Step 1: Install dependencies**

```bash
cd packages/sop-studio
bun add class-variance-authority clsx tailwind-merge lucide-react sonner
bun add -d @types/node
```

**Step 2: Add path alias to tsconfig.json**

Add to `compilerOptions`:
```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

**Step 3: Add resolve alias to vite.config.ts**

Add import and resolve config:
```typescript
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/v1": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
```

**Step 4: Create cn utility**

```typescript
// packages/sop-studio/src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 5: Update index.css with Octo theme**

Replace contents of `packages/sop-studio/src/index.css`:

```css
@import "tailwindcss";

/* ── Octo Design Tokens ── */
@theme {
  --color-kp-blue:    #1E7EC8;
  --color-kp-green:   #18A06A;
  --color-kp-teal:    #12B5A8;
  --color-kp-orange:  #E07A20;
  --color-kp-cyan:    #4ADEFF;
  --color-kp-dark:    #050D16;
  --color-kp-navy:    #081828;
  --color-kp-panel:   #0C1A28;
  --color-kp-border:  #163248;
  --color-kp-text:    #C8DDF0;
  --color-kp-muted:   #4A7FA5;
  --color-kp-heading: #EEF6FF;
  --color-kp-body-hi: #1A3C58;
  --color-kp-body-mid:#0D2438;
  --color-kp-body-lo: #060E18;
  --color-kp-success: #18A06A;
  --color-kp-warning: #E07A20;
  --color-kp-error:   #DC2626;
  --color-kp-info:    #1E7EC8;
  --font-display: 'Outfit', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 22px;
}

/* ── Google Fonts ── */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Base styles ── */
body {
  background-color: var(--color-kp-dark);
  color: var(--color-kp-text);
  font-family: var(--font-display);
}

/* ── React Flow overrides for dark theme ── */
.react-flow__background {
  background-color: var(--color-kp-dark) !important;
}
.react-flow__minimap {
  background-color: var(--color-kp-navy) !important;
}
.react-flow__controls button {
  background-color: var(--color-kp-panel) !important;
  border-color: var(--color-kp-border) !important;
  color: var(--color-kp-text) !important;
  fill: var(--color-kp-text) !important;
}
.react-flow__edge-path {
  stroke: var(--color-kp-muted) !important;
}
```

**Step 6: Verify Vite build**

Run: `cd packages/sop-studio && npx vite build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add packages/sop-studio/
git commit -m "feat(sop-studio): set up shadcn/ui foundation with Octo theme tokens"
```

---

### Task 3: Install Core shadcn/ui Components

**Files:**
- Create: `packages/sop-studio/src/components/ui/button.tsx`
- Create: `packages/sop-studio/src/components/ui/card.tsx`
- Create: `packages/sop-studio/src/components/ui/input.tsx`
- Create: `packages/sop-studio/src/components/ui/textarea.tsx`
- Create: `packages/sop-studio/src/components/ui/badge.tsx`
- Create: `packages/sop-studio/src/components/ui/select.tsx`
- Create: `packages/sop-studio/src/components/ui/dialog.tsx`
- Create: `packages/sop-studio/src/components/ui/tabs.tsx`
- Create: `packages/sop-studio/src/components/ui/tooltip.tsx`
- Create: `packages/sop-studio/src/components/ui/separator.tsx`
- Create: `packages/sop-studio/src/components/ui/skeleton.tsx`

**Context:** shadcn/ui components are copy-pasted source files (not a library dependency). Each uses Radix UI primitives + CVA for variants + the `cn()` utility. All styled with Octo dark theme colors.

**Step 1: Install Radix UI dependencies**

```bash
cd packages/sop-studio
bun add @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-select \
  @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-separator \
  @radix-ui/react-dropdown-menu @radix-ui/react-popover @radix-ui/react-toggle \
  @radix-ui/react-scroll-area @radix-ui/react-avatar @radix-ui/react-progress \
  @radix-ui/react-alert-dialog
```

**Step 2: Create each component**

Write each component file using the standard shadcn/ui patterns but with Octo dark theme colors. The button component should have variants: default (kp-teal bg), secondary (kp-panel bg), destructive (kp-error bg), ghost (transparent), outline (kp-border). Card should use kp-panel bg with kp-border. Input/Textarea should have kp-navy bg with kp-border and kp-teal focus ring.

Reference the shadcn/ui source code for exact component patterns, but customize all colors to use the `kp-*` Tailwind tokens defined in Task 2.

**Step 3: Verify Vite build**

Run: `cd packages/sop-studio && npx vite build`
Expected: Build succeeds (components are importable but not yet used)

**Step 4: Commit**

```bash
git add packages/sop-studio/src/components/ui/
git commit -m "feat(sop-studio): add shadcn/ui components with Octo dark theme"
```

---

### Task 4: Install Extended shadcn/ui Components

**Files:**
- Create: `packages/sop-studio/src/components/ui/dropdown-menu.tsx`
- Create: `packages/sop-studio/src/components/ui/sheet.tsx`
- Create: `packages/sop-studio/src/components/ui/scroll-area.tsx`
- Create: `packages/sop-studio/src/components/ui/avatar.tsx`
- Create: `packages/sop-studio/src/components/ui/progress.tsx`
- Create: `packages/sop-studio/src/components/ui/toggle.tsx`
- Create: `packages/sop-studio/src/components/ui/popover.tsx`
- Create: `packages/sop-studio/src/components/ui/command.tsx`
- Create: `packages/sop-studio/src/components/ui/alert.tsx`
- Create: `packages/sop-studio/src/components/ui/toast.tsx` (using sonner)

**Context:** Extended set of components for advanced interactions. Command component (Ctrl+K palette) needs `cmdk` package. Toast uses `sonner` (already installed in Task 2).

**Step 1: Install cmdk dependency**

```bash
cd packages/sop-studio
bun add cmdk@^1.0
```

**Step 2: Create each component**

Same pattern as Task 3. All components use Octo dark theme colors. The Sheet component is crucial for mobile PropertyPanel. Command component will power the keyboard shortcut palette.

**Step 3: Verify Vite build**

Run: `cd packages/sop-studio && npx vite build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/sop-studio/src/components/ui/ packages/sop-studio/package.json
git commit -m "feat(sop-studio): add extended shadcn/ui components (sheet, command, toast, etc.)"
```

---

### Task 5: Restyle App Layout and Navbar

**Files:**
- Modify: `packages/sop-studio/src/App.tsx`

**Context:** Replace the current light `bg-gray-50` layout and white navbar with dark Octo theme. Navbar: dark navy with Octo mini logo, teal active link underlines. Import Google Fonts (Outfit + JetBrains Mono).

**Step 1: Redesign App.tsx**

Replace the current navbar and layout with:
- Navbar: `bg-kp-navy border-b border-kp-border`
- Logo area: Octo mini SVG inline + "KnowledgePulse" in `font-mono text-kp-heading`
- Nav links: `text-kp-muted hover:text-kp-teal` with active state using `text-kp-teal border-b-2 border-kp-teal`
- Main content: `bg-kp-dark min-h-screen`
- Use `NavLink` from react-router-dom for active state detection
- Add Toaster component from sonner at root level

**Step 2: Verify Vite dev**

Run: `cd packages/sop-studio && npx vite build`
Expected: Build succeeds, app renders with dark theme

**Step 3: Commit**

```bash
git add packages/sop-studio/src/App.tsx
git commit -m "feat(sop-studio): restyle app layout with Octo dark theme navbar"
```

---

### Task 6: Restyle Dashboard Page

**Files:**
- Modify: `packages/sop-studio/src/pages/Dashboard.tsx`
- Modify: `packages/sop-studio/src/components/SearchBar.tsx`
- Modify: `packages/sop-studio/src/components/SOPCard.tsx`

**Context:** Replace all light theme classes. Dashboard should have dark card grid, teal-accented search, quality score circles, status badges with Octo colors.

**Step 1: Restyle SearchBar.tsx**

- Input: `bg-kp-navy border-kp-border text-kp-text placeholder:text-kp-muted focus:ring-kp-teal`
- Select: Same dark styling
- Status tabs: `bg-kp-panel text-kp-muted` inactive, `bg-kp-teal text-kp-heading` active

**Step 2: Restyle SOPCard.tsx**

- Card: `bg-kp-panel border border-kp-border rounded-lg hover:border-kp-teal/50 hover:-translate-y-0.5 transition-all`
- Status badge: Use shadcn Badge with variants (draft=muted, pending=orange, approved=green, rejected=red)
- Quality score: Display as a small teal-colored bar or percentage
- Domain tag: `bg-kp-navy text-kp-teal text-xs px-2 py-0.5 rounded font-mono`

**Step 3: Restyle Dashboard.tsx**

- Page title: `text-kp-heading font-display`
- "New SOP" button: Use shadcn Button with `bg-kp-teal hover:bg-kp-teal/90`
- Card grid: Keep responsive 3-column layout
- Empty state: Dark panel with Octo illustration text and teal CTA button

**Step 4: Verify Vite build**

Run: `cd packages/sop-studio && npx vite build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/sop-studio/src/pages/Dashboard.tsx packages/sop-studio/src/components/
git commit -m "feat(sop-studio): restyle Dashboard with Octo dark theme"
```

---

### Task 7: Restyle Editor Page and Nodes

**Files:**
- Modify: `packages/sop-studio/src/pages/Editor.tsx`
- Modify: `packages/sop-studio/src/components/PropertyPanel.tsx`
- Modify: `packages/sop-studio/src/components/nodes/StepNode.tsx`
- Modify: `packages/sop-studio/src/components/nodes/ConditionNode.tsx`
- Modify: `packages/sop-studio/src/components/nodes/ToolNode.tsx`

**Context:** Editor is the most complex page. Dark canvas, colored glow nodes, dark PropertyPanel as a Sheet on mobile.

**Step 1: Restyle StepNode.tsx**

- Card: `bg-kp-panel border-l-4 border-l-kp-blue border border-kp-border rounded-md shadow-lg shadow-kp-blue/10`
- Header: `text-kp-heading font-mono text-sm`
- Body: `text-kp-text text-xs`
- Selected state: `ring-2 ring-kp-blue ring-offset-2 ring-offset-kp-dark`

**Step 2: Restyle ConditionNode.tsx**

- Same pattern but with `kp-orange` instead of `kp-blue`
- Branch labels in `text-kp-muted font-mono text-xs`

**Step 3: Restyle ToolNode.tsx**

- Same pattern but with `kp-green`
- Tool name in `font-mono text-kp-green`

**Step 4: Restyle PropertyPanel.tsx**

- Container: `bg-kp-navy border-l border-kp-border`
- Section headers: `text-kp-muted font-mono text-xs uppercase tracking-wider`
- Inputs: Use shadcn Input/Textarea components
- Save button: shadcn Button with kp-teal

**Step 5: Restyle Editor.tsx toolbar**

- Toolbar: `bg-kp-navy border-b border-kp-border`
- Back button: `text-kp-muted hover:text-kp-text`
- SOP title: `text-kp-heading font-display`
- Status badge: shadcn Badge
- Action buttons: shadcn Button variants
- "Add Step/Condition/Tool" buttons: colored with corresponding node colors
- Canvas: Dark background (handled by CSS in index.css)

**Step 6: Verify Vite build**

Run: `cd packages/sop-studio && npx vite build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add packages/sop-studio/src/pages/Editor.tsx packages/sop-studio/src/components/
git commit -m "feat(sop-studio): restyle Editor and nodes with Octo dark theme"
```

---

### Task 8: Restyle Import, TestSandbox, and Settings Pages

**Files:**
- Modify: `packages/sop-studio/src/pages/Import.tsx`
- Modify: `packages/sop-studio/src/pages/TestSandbox.tsx`
- Modify: `packages/sop-studio/src/pages/Settings.tsx`

**Context:** Apply same dark Octo theme to remaining pages. Use shadcn components (Card, Input, Select, Button, Progress, Badge).

**Step 1: Restyle Import.tsx**

- File drop zone: `border-2 border-dashed border-kp-teal/40 bg-kp-navy/50 hover:border-kp-teal rounded-lg`
- LLM config form: shadcn Select for provider/model, shadcn Input for API key
- Extract button: `bg-kp-orange hover:bg-kp-orange/90`
- Progress: shadcn Progress with kp-teal fill
- Preview area: `bg-kp-panel border border-kp-border rounded-lg`

**Step 2: Restyle TestSandbox.tsx**

- Step list sidebar: `bg-kp-navy border-r border-kp-border`
- Current step: `border-l-4 border-l-kp-blue bg-kp-panel`
- Completed step: `border-l-4 border-l-kp-green/50 opacity-75`
- Coverage bar: shadcn Progress with kp-teal
- Decision history: Timeline with colored dots (kp-blue for decisions)

**Step 3: Restyle Settings.tsx**

- Section cards: shadcn Card with kp-panel bg
- Section titles: `text-kp-heading font-mono text-sm uppercase tracking-wider border-l-2 border-kp-teal pl-3`
- Inputs: shadcn Input/Select
- Test connection button: `bg-kp-blue hover:bg-kp-blue/90`
- Danger zone card: `border-kp-error/50 bg-kp-error/5`

**Step 4: Verify Vite build**

Run: `cd packages/sop-studio && npx vite build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/sop-studio/src/pages/
git commit -m "feat(sop-studio): restyle Import, TestSandbox, and Settings with Octo dark theme"
```

---

### Task 9: Add SOP Studio UX Improvements

**Files:**
- Modify: `packages/sop-studio/src/pages/Editor.tsx` (unsaved changes, keyboard shortcuts)
- Modify: `packages/sop-studio/src/App.tsx` (add Toaster)

**Context:** Add Toast notifications (replace alert-style messages), Command palette (Ctrl+K), unsaved changes warning, and keyboard shortcuts.

**Step 1: Add Toast notifications**

Replace all `setMessage()` / alert-style notifications with `toast()` from sonner. Import `Toaster` in App.tsx root.

**Step 2: Add unsaved changes tracking**

In Editor.tsx, track dirty state when nodes/edges change. Use `beforeunload` event and react-router's `useBlocker` to warn on navigation.

**Step 3: Add keyboard shortcuts**

In Editor.tsx, add `useEffect` with `keydown` listener:
- `Ctrl+S`: Save SOP
- `Delete/Backspace`: Delete selected node
- `Ctrl+K`: Open Command palette (if implemented)

**Step 4: Verify Vite build**

Run: `cd packages/sop-studio && npx vite build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/sop-studio/src/
git commit -m "feat(sop-studio): add Toast notifications, keyboard shortcuts, unsaved changes warning"
```

---

### Task 10: Create Octo SVG Assets for Website

**Files:**
- Create: `website/static/img/octo-hero.svg`
- Modify: `website/static/img/logo.svg` (replace KP circle with Octo mini)
- Create: `website/static/img/octo-favicon.svg`

**Context:** Extract SVGs from `/home/ubuntu/knowledgepulse/kp-octo-v2.html`. Hero uses the 320px full character SVG. Logo uses the mini Octo from the badge system. Favicon is a tiny Octo face. All use SMIL animations where applicable.

**Step 1: Create octo-hero.svg**

Extract the 320x330 hero SVG from kp-octo-v2.html (Section 01, full character with CSS animations converted to SMIL for GitHub compatibility). Include the floating animation, arm pulses, and eye blink.

**Step 2: Replace logo.svg**

Replace the current gradient circle "KP" logo with a compact Octo face (32x32 viewBox). Body ellipse + eyes + small arms, no animations (too small).

**Step 3: Create octo-favicon.svg**

16x16 simplified Octo face. Just body + eyes, no arms or details.

**Step 4: Update docusaurus.config.ts favicon**

Change favicon to `img/octo-favicon.svg`.

**Step 5: Commit**

```bash
git add website/static/img/ website/docusaurus.config.ts
git commit -m "feat(website): add Octo SVG assets (hero, logo, favicon)"
```

---

### Task 11: Apply Dark Ocean Theme to Docusaurus

**Files:**
- Modify: `website/src/css/custom.css`
- Modify: `website/docusaurus.config.ts`

**Context:** Override Docusaurus theme variables with Octo design tokens. Dark navy background, teal primary, Outfit/JetBrains Mono fonts. This affects all docs pages and the landing page.

**Step 1: Rewrite custom.css**

Replace the current green/teal theme with full Octo dark ocean:

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --ifm-color-primary: #12B5A8;
  --ifm-color-primary-dark: #0FA89C;
  --ifm-color-primary-darker: #0E9E93;
  --ifm-color-primary-darkest: #0B8279;
  --ifm-color-primary-light: #15C2B4;
  --ifm-color-primary-lighter: #16C8BA;
  --ifm-color-primary-lightest: #1ADACE;
  --ifm-font-family-base: 'Outfit', system-ui, sans-serif;
  --ifm-font-family-monospace: 'JetBrains Mono', ui-monospace, monospace;
  --ifm-heading-font-family: 'Outfit', system-ui, sans-serif;
  --ifm-code-font-size: 95%;
}

[data-theme='dark'] {
  --ifm-color-primary: #12B5A8;
  --ifm-color-primary-dark: #0FA89C;
  --ifm-color-primary-darker: #0E9E93;
  --ifm-color-primary-darkest: #0B8279;
  --ifm-color-primary-light: #15C2B4;
  --ifm-color-primary-lighter: #16C8BA;
  --ifm-color-primary-lightest: #1ADACE;
  --ifm-background-color: #050D16;
  --ifm-background-surface-color: #0C1A28;
  --ifm-navbar-background-color: #081828;
  --ifm-footer-background-color: #050D16;
  --ifm-card-background-color: #0C1A28;
  --ifm-toc-border-color: #163248;
  --ifm-color-emphasis-300: #163248;
  --ifm-hr-border-color: #163248;
}

/* ── KP brand colors ── */
:root {
  --kp-blue: #1E7EC8;
  --kp-green: #18A06A;
  --kp-teal: #12B5A8;
  --kp-orange: #E07A20;
  --kp-cyan: #4ADEFF;
  --kp-dark: #050D16;
  --kp-navy: #081828;
  --kp-panel: #0C1A28;
  --kp-border: #163248;
  --kp-text: #C8DDF0;
  --kp-muted: #4A7FA5;
  --kp-heading: #EEF6FF;
}
```

Plus additional overrides for code blocks, sidebar, navbar, and markdown content.

**Step 2: Set colorMode default to dark in docusaurus.config.ts**

In `themeConfig.colorMode`:
```typescript
colorMode: {
  defaultMode: 'dark',
  disableSwitch: false,
  respectPrefersColorScheme: true,
},
```

**Step 3: Verify docs build**

Run: `cd website && npm run build`
Expected: Build succeeds for both locales

**Step 4: Commit**

```bash
git add website/src/css/custom.css website/docusaurus.config.ts
git commit -m "feat(website): apply Octo dark ocean theme to Docusaurus"
```

---

### Task 12: Rebuild Landing Page — Hero + Stats + Protocol

**Files:**
- Modify: `website/src/pages/index.tsx`
- Create: `website/src/components/HeroSection.tsx`
- Create: `website/src/components/StatsCounter.tsx`
- Create: `website/src/components/ProtocolStack.tsx`

**Context:** Replace the generic Docusaurus landing page with a custom dark ocean design. This task covers the top 3 sections: Hero (animated Octo), Stats counters, and Protocol stack diagram.

**Step 1: Create HeroSection.tsx**

- Full-width dark navy section
- Centered animated Octo SVG (320px, inline SVG with SMIL animations from kp-octo-v2.html)
- "KNOWLEDGEPULSE" title in Outfit 900 weight
- Subtitle: "Open AI Knowledge Sharing Protocol"
- Two CTA buttons: "Get Started" (teal bg) + "View on GitHub" (outline)
- Badge row: shields.io badges for License, Runtime, MCP, SKILL.md, Tests

**Step 2: Create StatsCounter.tsx**

- 4 stat boxes in a row: "639 Tests", "6 MCP Tools", "200K+ Skills", "5 Layers"
- Dark panel background with colored top accent (teal, blue, orange, green)
- Numbers in large Outfit font, labels in JetBrains Mono uppercase
- Simple CSS counter animation on scroll (optional, can be static)

**Step 3: Create ProtocolStack.tsx**

- Styled 5-layer diagram matching the architecture section in README
- Each layer has a colored left border matching its purpose
- Layer 5 (orange), Layer 4 (blue), Layer 3 (teal), Layer 2 (orange, highlighted), Layer 1 (green)
- Dark panel background, monospace labels

**Step 4: Update index.tsx**

Replace the current hero/features with the new components:

```tsx
export default function Home(): JSX.Element {
  return (
    <Layout title="Home" description="Open AI Knowledge-Sharing Protocol">
      <HeroSection />
      <StatsCounter />
      <ProtocolStack />
      {/* More sections in Task 13 */}
    </Layout>
  );
}
```

**Step 5: Verify docs build**

Run: `cd website && npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add website/src/
git commit -m "feat(website): add dark ocean hero, stats, and protocol stack sections"
```

---

### Task 13: Landing Page — Features + Code + Comparison

**Files:**
- Create: `website/src/components/FeatureGrid.tsx`
- Create: `website/src/components/CodeExample.tsx`
- Create: `website/src/components/ComparisonTable.tsx`
- Modify: `website/src/pages/index.tsx` (add sections)

**Context:** Middle sections of the landing page. Feature grid shows 6 modules with colored accents. Code example shows a quick start snippet. Comparison table shows KP vs competitors.

**Step 1: Create FeatureGrid.tsx**

6 feature cards in a responsive 3-column grid:
1. Skill Registry (blue accent) — Semantic + BM25 search, one-click install
2. Knowledge Capture (teal accent) — Auto-extract reasoning traces
3. Knowledge Retrieval (green accent) — Semantic search + few-shot injection
4. Expert SOP Studio (orange accent) — Visual decision tree editor
5. Knowledge Marketplace (blue accent) — Free/org/subscription exchange
6. KP-REP Reputation (teal accent) — Soulbound verifiable credentials

Each card: dark panel bg, colored left border, Lucide icon (or simple SVG), title in heading color, description in text color.

**Step 2: Create CodeExample.tsx**

Dark code block showing quick start:
```bash
# Install
bun add @knowledgepulse/sdk

# Capture knowledge in 3 lines
```
```typescript
import { KPCapture } from "@knowledgepulse/sdk";
const capture = new KPCapture({ domain: "analysis" });
const agent = capture.wrap(yourAgent);
```

Use Docusaurus's `CodeBlock` component or styled `<pre>` with syntax highlighting.

**Step 3: Create ComparisonTable.tsx**

| Feature | KnowledgePulse | SkillsMP | LangChain Hub | Mem0 |
|---------|:---:|:---:|:---:|:---:|
| SKILL.md Compatible | check | check | x | x |
| Dynamic Knowledge | check | x | x | x |
| MCP Server | check | x | x | x |
| Cross-Framework | check | limited | limited | check |
| Quality Scoring | check | x | x | x |
| Reputation System | check | x | x | x |
| Expert SOP | check | x | x | x |
| Self-Hostable | check | x | x | check |

Styled with dark theme. Checkmarks in kp-teal, X in kp-muted.

**Step 4: Add to index.tsx**

**Step 5: Verify docs build and commit**

```bash
git add website/src/
git commit -m "feat(website): add feature grid, code example, and comparison table"
```

---

### Task 14: Landing Page — Use Cases + Integrations + Testimonials + CTA

**Files:**
- Create: `website/src/components/UseCaseCards.tsx`
- Create: `website/src/components/FrameworkLogos.tsx`
- Create: `website/src/components/TestimonialCards.tsx`
- Create: `website/src/components/EcosystemNote.tsx`
- Create: `website/src/components/CTASection.tsx`
- Modify: `website/src/pages/index.tsx` (add remaining sections)

**Context:** Bottom sections of landing page. Use cases show real-world applications. Framework logos show integrations. Testimonials are placeholders. Ecosystem note shows OpenClaw pairing. CTA is final call-to-action.

**Step 1: Create UseCaseCards.tsx**

3 use-case cards:
1. Financial Analysis (blue) — "Agents share earning analysis techniques across your org"
2. Customer Support (teal) — "SOPs become machine-executable decision trees"
3. Engineering (orange) — "Bug triage knowledge auto-captured from agent sessions"

Each card: dark panel, colored top border, domain label in monospace, description, "Learn more" link.

**Step 2: Create FrameworkLogos.tsx**

Horizontal row of framework names/logos with tooltips:
Claude Code | Codex CLI | OpenClaw | LangGraph | CrewAI | AutoGen | Flowise

Use text-only logos (no image files needed): framework name in monospace with priority label (P0/P1/P2) on hover.

**Step 3: Create TestimonialCards.tsx**

3 placeholder testimonial cards:
- Avatar circles with initials (colored)
- Quote text in italic
- Name + role below
- Placeholder text like "KnowledgePulse transformed how our agents share knowledge..."

**Step 4: Create EcosystemNote.tsx**

Teal-bordered panel matching kp-octo-v2.html's ecosystem note:
- "OpenClaw — Lobster. Strong claws, executes tasks. Built for action."
- "KnowledgePulse — Octo. 8 distributed arms, shares intelligence. Built for learning."
- "Lobster acts. Octo learns. The perfect pair."

**Step 5: Create CTASection.tsx**

Full-width section with:
- "Ready to share what you learn?" heading
- Two buttons: "Get Started" (teal) + "Star on GitHub" (outline)
- Octo mini icon next to tagline

**Step 6: Complete index.tsx with all sections**

**Step 7: Verify docs build and commit**

```bash
git add website/src/
git commit -m "feat(website): add use cases, integrations, testimonials, ecosystem, and CTA sections"
```

---

### Task 15: Update Chinese Landing Page

**Files:**
- Modify: `website/i18n/zh-Hans/docusaurus-plugin-content-pages/index.tsx`

**Context:** Mirror the English landing page with Chinese translations. The Chinese page currently has the old 3-feature layout. It needs all 12 sections translated.

**Step 1: Import all new components**

The Chinese landing page should import the same components (HeroSection, StatsCounter, etc.) but pass Chinese text as props or use a translations object.

**Step 2: Create Chinese translations**

Translate all text content:
- Hero: "开放式 AI 知识共享协议"
- Stats: "639 测试", "6 个 MCP 工具", "200K+ 技能", "5 层协议"
- Features: Registry=技能注册中心, Capture=知识捕获引擎, etc.
- Use cases, testimonials, ecosystem note — all in Chinese
- CTA: "准备好分享你的知识了吗？"

**Step 3: Verify docs build**

Run: `cd website && npm run build`
Expected: Both locales build successfully

**Step 4: Commit**

```bash
git add website/i18n/ website/src/
git commit -m "feat(website): update Chinese landing page with all 12 sections"
```

---

### Task 16: Final Verification

**Files:** None (verification only)

**Step 1: Run all tests**

```bash
bun test --recursive
```
Expected: 639 pass, 0 fail

**Step 2: Lint check**

```bash
npx biome check .
```
Expected: No errors (packages/sop-studio excluded from biome)

**Step 3: Build SDK**

```bash
cd packages/sdk && bun run build
```
Expected: ESM + CJS + DTS all pass

**Step 4: Build SOP Studio**

```bash
cd packages/sop-studio && npx vite build
```
Expected: Build succeeds

**Step 5: Build Docs**

```bash
cd website && npm run build
```
Expected: Both locales build successfully

**Step 6: Visual review checklist**

- [ ] SOP Studio: Dark navbar with Octo logo
- [ ] SOP Studio: Dashboard dark cards with teal accents
- [ ] SOP Studio: Editor dark canvas with colored nodes
- [ ] SOP Studio: All pages use Octo color palette
- [ ] Website: Dark hero with animated Octo
- [ ] Website: All 12 landing page sections render
- [ ] Website: Chinese landing page mirrors English
- [ ] Website: Docs pages use dark theme
- [ ] README: Octo banner renders on GitHub

**Step 7: Commit cleanup (if any)**

```bash
git add -A
git commit -m "chore: Phase 4 UI cleanup and verification"
```
