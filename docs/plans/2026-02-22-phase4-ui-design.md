# Phase 4: UI Overhaul with Octo Design System

## Goal

Apply the Octo mascot design system (deep navy/teal/orange palette, Outfit + JetBrains Mono typography) across both the SOP Studio React SPA and the Docusaurus documentation website. Full UI overhaul of SOP Studio with shadcn/ui components. Dark ocean-themed landing page with animated Octo hero. GitHub README.md with SMIL-animated Octo banner and shields.io badges.

## Scope

| Surface | Work |
|---------|------|
| `packages/ui/` | **New** — Shared Tailwind preset + shadcn/ui component library |
| `packages/sop-studio/` | **Full overhaul** — Dark theme, new components, animations, UX fixes |
| `website/` | **Landing page redesign** — Dark ocean hero, Octo mascot, 12 sections |
| `docs/badges/` | **Done** — SVG badge files (octo-banner.svg, octo-powered.svg) |
| `README.md` | **Done** — Animated Octo banner, shields.io badges, full project docs |

## Design Decisions

- **Top navbar** for SOP Studio (not sidebar) — 5 pages don't justify sidebar nav
- **Dark ocean theme** for both surfaces — matches Octo design system
- **shadcn/ui** component library — copy-paste, fully customizable, industry standard
- **SMIL animations** for GitHub — CSS animations stripped by GitHub's Camo proxy

---

## 1. Octo Design System (`packages/ui/`)

### Design Tokens

```
Colors:
  --kp-blue:    #1E7EC8    arm blue, links, primary actions, Step nodes
  --kp-green:   #18A06A    arm green, success states, Tool nodes
  --kp-teal:    #12B5A8    arm teal, secondary actions, accents
  --kp-orange:  #E07A20    arm orange, KP badge, warnings, Condition nodes
  --kp-navy:    #081828    backgrounds
  --kp-dark:    #050D16    deepest background
  --kp-panel:   #0C1A28    cards, panels
  --kp-border:  #163248    borders
  --kp-text:    #C8DDF0    body text
  --kp-muted:   #4A7FA5    secondary text, labels
  --kp-cyan:    #4ADEFF    eye cyan, highlights

Typography:
  Display: Outfit (400/600/700/800/900)
  Code/Labels: JetBrains Mono (400/500)
```

### Tailwind Preset (`packages/ui/tailwind-preset.ts`)

Extends Tailwind v4 with Octo color tokens, font families, and custom utilities. Both SOP Studio and Docusaurus CSS consume these tokens.

### shadcn/ui Components (21 total)

| Component | Used in | Purpose |
|-----------|---------|---------|
| Button | Both | Primary, secondary, ghost, destructive variants |
| Card | Both | SOPCard, feature cards, settings sections |
| Input | SOP Studio | Text fields, search bar |
| Textarea | SOP Studio | Instructions, descriptions |
| Select | SOP Studio | Domain picker, LLM provider |
| Badge | Both | Status, node types, tags |
| Dialog | SOP Studio | Confirmation modals, export options |
| Sheet/Drawer | SOP Studio | Mobile PropertyPanel, filters |
| Tabs | SOP Studio | Status filters, settings sections |
| Tooltip | Both | Icon button labels, help text |
| Alert | SOP Studio | Important notices |
| Skeleton | SOP Studio | Loading states |
| Dropdown Menu | SOP Studio | Export menu, node context menu |
| Progress | SOP Studio | Test coverage, import progress |
| Toggle | SOP Studio | Auto-save, collaboration |
| Separator | Both | Section dividers |
| Avatar | SOP Studio | Collaborator presence |
| Command | SOP Studio | Keyboard shortcut palette (Ctrl+K) |
| Popover | SOP Studio | Inline editing |
| Toast | SOP Studio | Non-blocking notifications |
| Scroll Area | SOP Studio | PropertyPanel, long lists |

---

## 2. SOP Studio Full UI Overhaul

### Layout

```
+-------------------------------------------------------------------+
| Octo [KP] | Dashboard | Editor | Import | Test | Settings  | [?]  |
+-------------------------------------------------------------------+
|                                                                    |
|  Main Content Area (full width)                                    |
|  Dark navy background (#050D16)                                    |
|  Content cards in --kp-panel (#0C1A28)                            |
|                                                                    |
+-------------------------------------------------------------------+
```

- Top navbar: Dark navy, Octo mini logo left, nav links center, help icon right
- Active link: Teal underline + bright text
- Hover: Subtle teal text color transition
- Mobile: Hamburger menu dropdown

### Page Redesigns

**Dashboard:**
- Dark card grid with --kp-panel background, --kp-border borders
- SOPCard with subtle glow on hover (blue/teal depending on status)
- Quality score as circular progress indicator (teal arc)
- Status badges: draft=muted, pending=orange, approved=green, rejected=red
- Search bar: Dark input, teal focus ring
- Empty state: Octo illustration + "Create your first SOP" CTA

**Editor:**
- Dark canvas background with subtle grid pattern
- Nodes restyled: Step=blue glow, Condition=orange glow, Tool=green glow
- Node cards: Dark panel backgrounds, colored left borders
- PropertyPanel: Sheet/Drawer (slides from right, collapsible)
- Toolbar: Icon buttons with Octo colors, tooltips on hover
- Keyboard shortcut palette: Command component (Ctrl+K)
- Unsaved changes indicator in top bar

**Import:**
- Dark drag-drop zone with dashed teal border
- LLM extraction with animated Progress bar
- Decision tree preview in mini canvas (read-only React Flow)
- Step-by-step wizard: upload -> configure -> extract -> review -> save

**TestSandbox:**
- Dark step cards with colored left accents (blue=current, muted=completed)
- Coverage progress bar: teal gradient
- Decision history: vertical timeline with colored dots

**Settings:**
- Dark card sections with Octo-colored section headers
- Connection test with animated status indicator
- Danger Zone: red-bordered card

### Animations & Micro-interactions

- Card hover: translateY(-2px) + shadow glow
- Button press: scale(0.98) + 100ms
- Page transitions: fade-in (200ms)
- Toast notifications: slide-in from top-right
- Skeleton loading: pulse --kp-panel to --kp-navy gradient
- Node selection: pulsing border ring

### UX Improvements

- Unsaved changes warning when navigating away from editor
- Keyboard shortcuts (Ctrl+S save, Ctrl+K command palette, Delete nodes)
- Mobile responsiveness (PropertyPanel as bottom Sheet on mobile)
- Toast notifications instead of alert banners

---

## 3. Docusaurus Website (Dark Ocean Theme)

### Landing Page Sections (12 total)

```
1.  HERO — Animated Octo (320px, SMIL) + title + badges + dual CTA
2.  STATS COUNTERS — 639 tests | 6 MCP tools | 200K+ skills | 5-layer protocol
3.  PROTOCOL STACK — Colored 5-layer architecture diagram
4.  FEATURE GRID — 6 cards: Registry, Capture, Retrieval, SOP, Market, KP-REP
5.  CODE EXAMPLE — Quick start install + 3-line capture snippet
6.  COMPARISON TABLE — KP vs SkillsMP vs LangChain Hub vs Mem0
7.  USE CASES — 3 cards: Financial Analysis, Customer Support, Engineering SOP
8.  FRAMEWORK INTEGRATIONS — Logo row with hover tooltips
9.  TESTIMONIALS — 3 placeholder quotes with avatar circles
10. ECOSYSTEM — "OpenClaw acts. Octo learns." panel
11. CTA — "Get Started" + "Star on GitHub" final call-to-action
12. FOOTER — 3-column links
```

### Theme Overrides

- `--ifm-color-primary`: #12B5A8 (teal)
- `--ifm-background-color`: #050D16 (dark)
- `--ifm-navbar-background-color`: #081828 (navy)
- Code blocks: #0C1A28 background with teal/orange highlights
- Font: Outfit for headings, JetBrains Mono for code
- Cards: `.feature-card { background: #0C1A28; border: 1px solid #163248 }`

### Custom React Components

| Component | Purpose |
|-----------|---------|
| HeroSection | Animated Octo SVG + title + badges + CTA buttons |
| StatsCounter | Animated number counters with labels |
| ProtocolStack | Styled 5-layer diagram with colored accents |
| FeatureGrid | 6 feature cards with colored left borders |
| CodeExample | Syntax-highlighted quick start snippet |
| ComparisonTable | Checkmark table vs competitors |
| UseCaseCards | 3 use-case cards with domain icons |
| FrameworkLogos | Integration logo row with tooltips |
| TestimonialCards | 3 placeholder quotes |
| EcosystemNote | Teal-bordered OpenClaw/Octo pairing panel |
| CTASection | Final call-to-action with dual buttons |

### Chinese Landing Page

Mirror of English with Chinese translations. Same Octo hero, same layout. Existing i18n infrastructure handles this.

### Static Assets

| Asset | Location | Purpose |
|-------|----------|---------|
| `octo-hero.svg` | `website/static/img/` | 320px animated Octo for hero section |
| `octo-favicon.svg` | `website/static/img/` | 32px Octo face for browser favicon |
| `logo.svg` (replace) | `website/static/img/` | Navbar logo with Octo mini |
| `social-card.png` | `website/static/img/` | Open Graph social preview |

---

## 4. Already Completed

- [x] `README.md` — Animated Octo SMIL banner + shields.io badges + full docs
- [x] `docs/badges/octo-banner.svg` — SMIL animated banner SVG
- [x] `docs/badges/octo-powered.svg` — Static "Powered by" badge SVG

---

## Tech Stack Additions

| Package | Version | Purpose |
|---------|---------|---------|
| `class-variance-authority` | ^0.7 | Component variant management (shadcn/ui dep) |
| `clsx` | ^2.0 | Conditional class merging |
| `tailwind-merge` | ^2.0 | Tailwind class deduplication |
| `lucide-react` | ^0.400 | Icon library (shadcn/ui default) |
| `@radix-ui/react-*` | various | Headless UI primitives (shadcn/ui deps) |
| `sonner` | ^1.0 | Toast notification library |

---

## Success Criteria

1. Both surfaces use consistent Octo color tokens and typography
2. SOP Studio dark theme with all 21 shadcn/ui components integrated
3. Landing page renders all 12 sections with animated Octo hero
4. Chinese landing page mirrors English with full translations
5. Mobile responsive (SOP Studio navbar + website sections)
6. All existing tests still pass (639)
7. Vite build passes for SOP Studio
8. Docusaurus build passes for both locales
