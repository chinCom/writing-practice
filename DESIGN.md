# DESIGN.md — {APP_NAME}

> Visual and UI spec for humans and coding agents. **Read this before touching any UI code.**
> Reference mockups (save the approved images here): `docs/design/reference-studio-feedback.png` (Writing Studio, Feedback, Mobile feedback) and `docs/design/reference-board.png` (Today, Learning path, Practice, Progress, Settings).
> Authority: where this file differs from the design summary in PROJECT.md §17, **DESIGN.md wins**.
> Hex values and sizes below were read from the mockups by eye. Verify with an eyedropper and adjust in `src/theme/tokens.ts` only (§4, §5).

---

## 1. The MUI rule (non-negotiable)

**Every visible UI element is a MUI component, or a composition of MUI components.** No exceptions except the approved list in §1.3.

### 1.1 Always

1. Build UI with `@mui/material`. Charts with `@mui/x-charts`. Icons with `@mui/icons-material`, imported **by path** (`import CheckCircle from '@mui/icons-material/CheckCircle'`), never from the package barrel.
2. Layout with `Box`, `Stack`, `Container`, and MUI's current `Grid` (check the installed version's docs; don't use a legacy Grid). Text with `Typography`. Semantic tags via the `component` prop (`<Typography component="h1" variant="h1">`, `<Box component="main">`).
3. Style only with `sx`, `styled()` (imported from `@mui/material/styles`), and **theme overrides** (`components.*.styleOverrides` / `variants`). Repeating the same `sx` in three places means it belongs in the theme or a wrapper component.
4. Take every color, spacing, radius, font, and breakpoint **from the theme** (`primary.main`, `theme.spacing(2)`, `theme.shape.borderRadius`, `typography` variants, `theme.breakpoints`). In `styled`/`sx` callbacks use `theme.vars.*` so light/dark switching works with CSS variables.
5. Animate with MUI transitions first (`Fade`, `Grow`, `Collapse`, `Slide`, `Zoom`) and `keyframes` from `@mui/material/styles`. Reach for the `motion` library only when MUI cannot do it, and wrap MUI components rather than replacing them.
6. Reusable pieces go in `src/components/` as **thin wrappers** over MUI (forward `ref`, accept `sx`, extend the MUI props type, e.g. `ChipProps`). Never re-implement a button, input, chip, dialog, tooltip, or tab.
7. If a needed component isn't in the §6 table, look in MUI core, then MUI X, then compose from MUI primitives. Only if that is truly impossible, add a row to §1.3 **before** writing the code.

### 1.2 Never

- Raw HTML for UI: `<button>`, `<input>`, `<textarea>`, `<select>`, `<a>`, `<form>`, `<label>`, `<ul>/<ol>/<li>`, `<table>`, `<h1>`–`<h6>`, `<p>`, `<div>`, `<span>`. (Use `Button`, `TextField`, `Link`, `List`, `Typography`, `Box`, ...)
- Other UI kits or styling systems: Tailwind, shadcn/ui, Radix, Headless UI, Chakra, Mantine, Ant Design, Bootstrap, styled-components, CSS Modules, plain `.css` files, Sass.
- Other icon sets (`lucide-react`, `react-icons`, Heroicons, Font Awesome) and other chart libraries (`recharts`, `chart.js`, ...).
- Importing from `@emotion/*` directly (use `styled` / `keyframes` from `@mui/material/styles`).
- `style={{ ... }}` and `className` for styling.
- Hex/rgb/hsl color literals, or magic numbers for spacing and radius, anywhere outside `src/theme/`.
- `!important`, global CSS selectors, or overriding MUI internals by class name (`.MuiButton-root`) outside the theme file.

### 1.3 Approved exceptions (keep this table short)

| Need | What is allowed | Only in |
|---|---|---|
| `<html>`, `<body>`, `next/font` class names | Raw tags and `className` | `src/app/layout.tsx` |
| Connector lines between marks and cards | `Box component="svg"` containing `<path>` / `<circle>`; `style` for computed geometry | `src/components/feedback/ConnectorLayer.tsx` |
| Highlighter sweep (per-line bands from measured text rects) | `Box` bands; `style` for computed geometry | `src/components/studio/ReadSweep.tsx` |
| Learning-path connecting line (soft curve between nodes) | `Box component="svg"` containing `<path>` | `src/components/path/PathLine.tsx` |
| Custom icons (wavy underline swatches, logo mark) | `SvgIcon` with `<path>` children | `src/components/ui/icons/` |
| Level-up confetti | `canvas-confetti` (decorative, non-UI library; skipped under reduced motion) | `src/components/ui/Celebrate.tsx` |

---

## 2. Enforcement

Rules that aren't enforced get broken by coding agents. Add both of these in Phase 1, and run them in CI and pre-commit.

### 2.1 ESLint (flat config excerpt, `eslint.config.mjs`)

```js
const rawElements = {
  selector: "JSXOpeningElement[name.name=/^[a-z]/]",
  message: "Raw HTML element. Use a MUI component (Box, Stack, Typography, Button...). Use <Box component=\"section\"> for semantic tags.",
};
const noStyleProp = {
  selector: "JSXAttribute[name.name='style']",
  message: "No inline style. Use sx / styled / theme overrides.",
};
const noClassName = {
  selector: "JSXAttribute[name.name='className']",
  message: "No className styling. Use sx / styled / theme overrides.",
};
const noHex = {
  selector: "Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
  message: "No hex colors outside src/theme. Use theme palette tokens.",
};
const noRgb = {
  selector: "Literal[value=/^(rgb|rgba|hsl|hsla)\\(/]",
  message: "No raw color functions outside src/theme. Use theme palette tokens.",
};
const base = [noClassName, noHex, noRgb];

export default [
  // ...next + typescript configs...
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", rawElements, noStyleProp, ...base],
      "no-restricted-imports": ["error", {
        paths: [
          { name: "@mui/icons-material", message: "Import icons by path: @mui/icons-material/Name" },
          { name: "@emotion/react", message: "Use keyframes from @mui/material/styles." },
          { name: "@emotion/styled", message: "Use styled from @mui/material/styles." },
        ],
        patterns: [{
          group: [
            "tailwindcss*", "@radix-ui/*", "@headlessui/*", "@chakra-ui/*", "@mantine/*",
            "antd", "@ant-design/*", "react-bootstrap", "bootstrap", "styled-components",
            "lucide-react", "react-icons*", "@heroicons/*", "@fortawesome/*",
            "recharts", "chart.js", "react-chartjs-2", "class-variance-authority",
            "tailwind-merge", "sonner", "react-hot-toast",
          ],
          message: "UI must be MUI-only (DESIGN.md §1).",
        }],
      }],
    },
  },
  // Approved exceptions (DESIGN.md §1.3)
  { files: ["src/theme/**", "src/app/layout.tsx"], rules: { "no-restricted-syntax": "off" } },
  { files: ["src/components/feedback/ConnectorLayer.tsx", "src/components/studio/ReadSweep.tsx",
            "src/components/path/PathLine.tsx"],
    rules: { "no-restricted-syntax": ["error", ...base] } },
  { files: ["src/components/ui/icons/**"],
    rules: { "no-restricted-syntax": ["error", noStyleProp, ...base] } },
];
```

Tune the selectors after the first run; if one produces false positives, fix the selector, don't delete the rule.

### 2.2 Dependency and stylesheet check (`scripts/check-design.mjs`)

```js
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN = [
  /^tailwindcss$/, /^@tailwindcss\//, /^@radix-ui\//, /^@headlessui\//, /^@chakra-ui\//,
  /^@mantine\//, /^antd$/, /^@ant-design\//, /^react-bootstrap$/, /^bootstrap$/,
  /^styled-components$/, /^lucide-react$/, /^react-icons$/, /^@heroicons\//, /^@fortawesome\//,
  /^recharts$/, /^chart\.js$/, /^react-chartjs-2$/, /^class-variance-authority$/,
  /^tailwind-merge$/, /^sonner$/, /^react-hot-toast$/,
];

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
const problems = deps.filter((d) => FORBIDDEN.some((r) => r.test(d))).map((d) => `Forbidden dependency: ${d}`);

const walk = (dir, out = []) => {
  for (const f of readdirSync(dir)) {
    if (f === "node_modules" || f === ".next") continue;
    const p = join(dir, f);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};
for (const f of walk("src")) {
  if (/\.(css|scss|sass|less)$/.test(f)) problems.push(`Stylesheet not allowed: ${f} (use the MUI theme)`);
}
for (const c of ["tailwind.config.js", "tailwind.config.ts", "tailwind.config.mjs"]) {
  if (existsSync(c)) problems.push(`Remove ${c}`);
}

if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log("Design rules: OK");
```

`package.json`: `"check:design": "node scripts/check-design.mjs"`. Delete the scaffolded `globals.css` and any Tailwind setup right after `create-next-app`.

### 2.3 PR checklist (also for agent self-review)

- [ ] `npm run lint` and `npm run check:design` pass
- [ ] Every new UI element maps to a row in §6 (or a new, approved row)
- [ ] No hex/px literals outside `src/theme/`; no `style`/`className`
- [ ] Works in light and dark, at `xs`, `md`, `lg`, and with `dir="rtl"`
- [ ] Keyboard: every control reachable, focus visible
- [ ] Reduced motion: animations have a static fallback
- [ ] Strings come from the message files

---

## 3. Design concept

**"The marked page."** A calm, paper-like writing surface with an editor's markup layer. The product is quiet and focused; the one memorable thing is the **feedback view**: the learner's own text with colored marks, and correction cards in a margin connected to each mark by thin lines.

Principles:
1. **The text is the hero.** Serif canvas, generous leading, nothing competing with it.
2. **Markup, not alarm.** Corrections are underlines and small cards, never red walls or modal interruptions.
3. **Color never works alone.** Every mark type has its own underline *style*; scores always show numbers.
4. **One signature moment** (the highlighter read, §9). Everything else is quiet.
5. **Calm density.** Whitespace around the canvas; compact, scannable cards in the margin.

---

## 4. Tokens

All values live in `src/theme/tokens.ts` and are consumed through the MUI theme. Components never see a hex.

### 4.1 Color

| Role | MUI path | Light | Dark |
|---|---|---|---|
| Ink (text, primary actions) | `primary.main` / `text.primary` | `#23214F` | `#E4E1FF` (primary), `#ECEBFF` (text) |
| On primary | `primary.contrastText` | `#FFFFFF` | `#23214F` |
| Violet (focus ring, active card border, grammar marks) | `secondary.main` | `#6D4AFF` | `#9B85FF` |
| Paper (app background) | `background.default` | `#F5F6FB` | `#14132E` |
| Surface (canvas, cards) | `background.paper` | `#FFFFFF` | `#1D1B40` |
| Muted text | `text.secondary` | `#5B5B7A` | `#A9A8CC` |
| Hairline border | `divider` | `#E4E5F0` | `#34325F` |
| Mint (strengths, success, high score) | `success.main` | `#0F8F6B` | `#3DD6A8` |
| Mint, text-safe (text, and fills behind white numerals) | `success.dark` | `#0B7A5C` | `#3DD6A8` |
| Blue (vocabulary marks, mid score) | `info.main` | `#1F7AE0` | `#5AA2FF` |
| Amber (punctuation marks, priority icon) | `warning.main` | `#C77700` | `#F0A63A` |
| Rose (spelling marks, low score) | `error.main` | `#E0356B` | `#FF6E9A` |
| Highlighter (active nav, sweep, key moments) | `highlighter.main` (custom) | `#FFD23F` | `#FFD23F` |
| On highlighter | `highlighter.contrastText` | `#23214F` | `#23214F` |
| Soft highlight (strength sentence, priority chip bg) | `highlighter.light` (custom) | `#FFF0B3` | `#4A3F12` |
| Lavender tonal (level chip bg) | `tonal.primary` (custom) | `#ECEAFB` | `#2B2860` |
| Mint tonal (strength chip bg) | `tonal.success` (custom) | `#DDF3EA` | `#164A3D` |
| Teal (style/discourse marks) | `marks.style` (custom) | `#0E8C99` | `#3CC4D1` |

Rules:
- **Highlighter yellow is always paired with ink text.** It marks attention, not judgment: *where you are* (active nav, level switcher, current path node), the *sweep*, a *strength sentence* in feedback, and the *target word* in a drill (which also keeps its mark underline). It never replaces an underline as the signal for an error.
- **Mint as text** (for example the suggested fix "I went") and mint fills behind white numerals use `success.dark`. `success.main` on white is only about 4:1, which fails AA for small text; use `success.main` for icons, rings, and bars.
- **Tonal chips** use `text.primary` for the label; only the icon carries the hue. This keeps AA contrast on the pale backgrounds.

### 4.2 Mark styles (the underline system)

| Group | Tags (from PROJECT.md §8) | Color | Style |
|---|---|---|---|
| Grammar | verb-tense, verb-form, articles, prepositions, ... | `marks.grammar` (= `secondary`) | `wavy` |
| Mechanics | spelling, capitalization, apostrophe, run-on, fragment | `marks.spelling` (= `error`) | `dotted` |
| Vocabulary | word-choice, collocation, false-friend, word-form, register, repetition | `marks.vocabulary` (= `info`) | `solid` |
| Punctuation | punctuation | `marks.punctuation` (= `warning`) | `dashed` |
| Style | connectors, cohesion, paragraphing, tone-formality, ... | `marks.style` | `double` |

CSS: `textDecorationLine: underline; textDecorationStyle: <style>; textDecorationColor: <color>; textDecorationThickness: 2px; textUnderlineOffset: 4px`. The same swatch (a short sample of the underline, as an icon) appears in the correction card header. These five group names (Grammar, Vocabulary, Mechanics, Punctuation, Style) are the **display names** used everywhere, including the Errors by category chart.

### 4.3 Typography

| Variant | Family | Size / line height | Weight | Use |
|---|---|---|---|---|
| `h1` | **Literata** | 2rem / 1.2 (1.625rem on `xs`) | 600 | Page titles ("Make room for a little writing", "See your writing grow") |
| `h2` | **Literata** | 1.625rem / 1.25 | 600 | Hero titles inside a page (the task title on the Today card) |
| `h3` | Schibsted Grotesk | 1.125rem / 1.3 | 600 | Section and card titles ("Your week", "Errors by category", "A message to a friend") |
| `subtitle2` | Schibsted Grotesk | 0.8125rem / 1.3 | 600 | Correction card tag ("Verb tense") |
| `body1` | Schibsted Grotesk | 0.9375rem / 1.5 | 400 | UI text |
| `body2` | Schibsted Grotesk | 0.8125rem / 1.45 | 400 | Secondary text, explanations |
| `caption` | Schibsted Grotesk | 0.75rem / 1.4 | 400 | "Saved just now", "61 words" |
| `button` | Schibsted Grotesk | 0.9375rem / 1 | 600, no uppercase | Buttons |
| **`stat`** (custom) | **Literata** | 1.75rem / 1.1 | 600 | Big numbers ("1,240", "8", "5 days") with a `body2` label beneath. Format with `Intl.NumberFormat`. |
| **`canvas`** (custom) | **Literata** | 1.375rem / 1.65 (1.1875rem / 1.6 on `xs`) | 400 | Learner text, model text, rewrites. Max width 70ch. |

Fonts load with `next/font` (CSS variables `--font-ui`, `--font-canvas`) and are referenced from the theme. The canvas is always English, so Literata is enough there. But `h1`, `h2`, and `stat` now also appear in translated UI, and Literata has no Arabic or Indic glyphs, so their font stacks need per-script serif fallbacks (Noto Serif family, e.g. Noto Naskh Arabic, Noto Serif Devanagari), and the UI stack needs Noto Sans fallbacks.

The first mockup (Studio, Feedback) uses a sans bold page title; the newer board uses Literata. This file standardizes on Literata for `h1` (see §13).

### 4.4 Shape, spacing, depth

| Token | Value | Applies to |
|---|---|---|
| `shape.borderRadius` | 12 | default |
| Radius sm | 8 | nav items, small buttons, tags |
| Radius md | 10 | buttons, inputs |
| Radius lg | 14 | cards, paper canvas, panels |
| Radius sheet | 24 top corners | bottom sheet |
| Radius pill | 999 | chips, progress bars, switches |
| Spacing unit | 8px (`theme.spacing`) | everything |
| Panel padding | 2 (card) / 4 (canvas) | |
| Page gutter | 3 (`md+`), 2 (`xs`) | |
| Touch target | ≥ 44px | buttons, nav items, checkboxes, switch rows |
| Static surfaces | 1px `divider` border, **no shadow** | cards, canvas, panels |
| Floating layers | shadow allowed | bottom sheet, menus, dialogs |

The mockup's radii are rounder than the first spec in PROJECT.md (canvas 4px, cards 20px). The mockup wins.

### 4.5 Breakpoints

Use MUI defaults: `xs` 0, `sm` 600, `md` 900, `lg` 1200, `xl` 1536. Structural switches use `useMediaQuery(theme.breakpoints.up(...))`; visual tweaks use `sx` responsive objects.

---

## 5. Theme implementation (skeleton)

Illustrative; check the installed MUI version's docs for exact option names.

```ts
// src/theme/tokens.ts: the ONLY file where hex values may live
export const tokens = {
  light: { ink: "#23214F", paper: "#F5F6FB", surface: "#FFFFFF", border: "#E4E5F0",
    muted: "#5B5B7A", violet: "#6D4AFF", mint: "#0F8F6B", mintText: "#0B7A5C", blue: "#1F7AE0",
    amber: "#C77700", rose: "#E0356B", teal: "#0E8C99",
    highlighter: "#FFD23F", highlightSoft: "#FFF0B3",
    tonalPrimary: "#ECEAFB", tonalSuccess: "#DDF3EA" },
  dark: { /* values from §4.1 dark column */ },
} as const;
```

```ts
// src/theme/theme.ts
"use client";
import type { CSSProperties } from "react";
import { createTheme } from "@mui/material/styles";
import { tokens as t } from "./tokens";

declare module "@mui/material/styles" {
  interface Palette {
    highlighter: Palette["primary"];
    tonal: { primary: string; success: string };
    marks: { grammar: string; spelling: string; vocabulary: string; punctuation: string; style: string };
  }
  interface PaletteOptions {
    highlighter?: PaletteOptions["primary"];
    tonal?: Palette["tonal"];
    marks?: Palette["marks"];
  }
  interface TypographyVariants { canvas: CSSProperties; stat: CSSProperties }
  interface TypographyVariantsOptions { canvas?: CSSProperties; stat?: CSSProperties }
}
declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides { canvas: true; stat: true }
}
declare module "@mui/material/Chip" {
  interface ChipPropsVariantOverrides { tonal: true }
}

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "data-mui-color-scheme" },
  colorSchemes: {
    light: { palette: {
      primary: { main: t.light.ink, contrastText: "#FFFFFF" },
      secondary: { main: t.light.violet },
      success: { main: t.light.mint, dark: t.light.mintText }, info: { main: t.light.blue },
      warning: { main: t.light.amber }, error: { main: t.light.rose },
      highlighter: { main: t.light.highlighter, light: t.light.highlightSoft, contrastText: t.light.ink },
      tonal: { primary: t.light.tonalPrimary, success: t.light.tonalSuccess },
      marks: { grammar: t.light.violet, spelling: t.light.rose, vocabulary: t.light.blue,
               punctuation: t.light.amber, style: t.light.teal },
      background: { default: t.light.paper, paper: t.light.surface },
      text: { primary: t.light.ink, secondary: t.light.muted },
      divider: t.light.border,
    } },
    dark: { palette: { /* mirror with dark tokens */ } },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'var(--font-ui), system-ui, "Noto Sans", sans-serif',
    h1: { fontFamily: "var(--font-canvas), \"Noto Serif\", Georgia, serif", fontSize: "2rem", fontWeight: 600, lineHeight: 1.2 },
    // h2, h3, subtitle2, body1, body2, caption per §4.3
    button: { textTransform: "none", fontWeight: 600 },
    canvas: { fontFamily: 'var(--font-canvas), Georgia, serif', fontSize: "1.375rem", lineHeight: 1.65 },
    stat: { fontFamily: 'var(--font-canvas), "Noto Serif", Georgia, serif', fontSize: "1.75rem", fontWeight: 600, lineHeight: 1.1 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 10, minHeight: 44 } } },
    MuiCard: { defaultProps: { variant: "outlined" }, styleOverrides: { root: { borderRadius: 14 } } },
    MuiPaper: { styleOverrides: { outlined: { borderRadius: 14 } } },
    MuiChip: {
      variants: [
        { props: { variant: "tonal", color: "primary" },
          style: ({ theme }) => ({ backgroundColor: theme.vars.palette.tonal.primary, color: theme.vars.palette.text.primary }) },
        { props: { variant: "tonal", color: "success" },
          style: ({ theme }) => ({ backgroundColor: theme.vars.palette.tonal.success, color: theme.vars.palette.text.primary }) },
        { props: { variant: "tonal", color: "warning" },
          style: ({ theme }) => ({ backgroundColor: theme.vars.palette.highlighter.light, color: theme.vars.palette.text.primary }) },
      ],
    },
    MuiLinearProgress: { styleOverrides: { root: { height: 8, borderRadius: 999 }, bar: { borderRadius: 999 } } },
    // Switch, Checkbox (44px targets), ListItemButton (selected = highlighter pill), BottomNavigationAction, Drawer...
  },
});
```

Mount with MUI's Next.js App Router cache provider, `ThemeProvider`, `CssBaseline`, and MUI's init-color-scheme script (prevents a dark-mode flash). Follow the current MUI docs for that setup.

---

## 6. Component map (design element → MUI)

Use exactly these. Props are starting points.

### App shell

| Design element | MUI | Notes |
|---|---|---|
| Desktop sidebar | `Drawer variant="permanent"` + `List` | `md+`. Width ≈ 200px. |
| Nav item | `ListItemButton` + `ListItemIcon` + `ListItemText` | Active (`selected`): `highlighter.main` bg, `highlighter.contrastText`, weight 600, radius 8. Inactive: outlined icon, `text.primary` at reduced emphasis. |
| Logo | `Stack` + `SvgIcon` (doc glyph with a short highlighter underline) + `Typography` | Working name "Writing coach" in the mockup |
| Mobile top bar | `AppBar elevation={0}` + `Toolbar` + `IconButton` (menu) | Transparent on `background.default` |
| Mobile menu | `Drawer` (temporary) | Holds Learning path, Settings, language |
| Mobile bottom nav | `BottomNavigation` + `BottomNavigationAction` | 4 items: Today, Write, Practice, Progress. Selected item shows a short highlighter bar. |
| Page container | `Container`, `Box component="main"` | |

### Writing Studio

| Design element | MUI | Notes |
|---|---|---|
| Task header + level chip | `Typography variant="h3"` + `Chip variant="tonal" color="primary" size="small"` | "A2" |
| Task description, word range | `Typography body1` / `body2` (muted) | "40–100 words" |
| Checklist | `FormGroup` + `FormControlLabel` + `Checkbox` | Live-checked from the text |
| Section divider | `Divider` | |
| Word bank | `Stack direction="row" flexWrap="wrap" useFlexGap` of `Chip variant="outlined" clickable` | Click inserts at the cursor |
| Writing canvas | `Paper variant="outlined"` (radius 14) + `TextField multiline` (`variant="standard"`, no underline, `slotProps` for input) using `Typography variant="canvas"` styles | **Must carry the §10 field attributes** |
| Canvas footer | `Stack direction="row"` with `Typography variant="caption"` ×2 + `Button variant="contained"` | "Saved just now", "61 words", "Check my writing" |
| Coach panel ("A little help") | `Paper variant="outlined"` + `Typography` + `Button variant="outlined" fullWidth` | "Ask for a hint". Hint replies stream into `Typography`. |
| Hint on mobile | `SwipeableDrawer anchor="bottom"` | |
| Timer (optional) | `Chip` with `TimerOutlined` icon | |
| Autosave state | `Typography caption` | "Saving..." / "Saved just now" |

### Feedback

| Design element | MUI | Notes |
|---|---|---|
| Title | `Typography variant="h1"` | "Your message, marked" |
| Level estimate | `Chip variant="tonal" color="primary"` | "Estimated A2" |
| Strength chips | `Chip variant="tonal" color="success" icon={<CheckCircle/>}` | "Clear sequence", "Friendly tone" |
| Priority chip | `Chip variant="tonal" color="warning" icon={<Help/>}` | "Focus on past-tense verbs" |
| Score bars | `LinearProgress variant="determinate"` + `Typography` | See `ScoreBar` (§7). 2×2 grid ≥ `sm`, one column below. |
| Marked page | `Paper variant="outlined"` + `MarkedText` (§7) | |
| Strength highlight | `Box component="span"` with `highlighter.light` bg | Sentence-level, no underline |
| Correction card | `Card` + `CardContent` + `CardActions` | See `CorrectionCard` (§7) |
| Tag header | `Stack` + `SvgIcon` (underline swatch) + `Typography variant="subtitle2"` | "Verb tense" |
| Dismiss / Report | `Button size="small" variant="text" color="inherit"` + `Divider orientation="vertical" flexItem` | Muted, top-right of the card |
| Original → suggestion | `Typography component="del"` + `ArrowForward` icon + `Typography` (`success.dark`, weight 600) | "I go → I went" |
| Explanation | `Typography variant="body2"` | |
| Language toggle | `FormControlLabel` + `Switch size="small"` | "Explain in Español" |
| Try it yourself | `Button variant="outlined"`; reveals `Collapse` + `TextField size="small"` + `Button` | |
| Apply fix | `Button variant="contained"` | |
| Rewrite | `Button variant="contained"` | |
| See it one level up | `Button variant="outlined" endIcon={<ChevronRight/>}` → `Collapse` with `Typography variant="canvas"` | |
| Mobile correction sheet | `SwipeableDrawer anchor="bottom"` + drag handle `Box` (puller) | Radius 24 top; shadow allowed |
| Connector lines | `ConnectorLayer` (§1.3) | Hidden below `md` |
| v1 vs v2 diff | `Stack` of two `Paper` + `Typography` with `ins`/`del` styling via `Box component` | |
| Toasts | `Snackbar` + `Alert` | |
| Report reasons | `Menu` or `Dialog` | |

### Today

| Design element | MUI | Notes |
|---|---|---|
| Page title and date | `Typography variant="h1"` + muted `Typography` | Date from `Intl.DateTimeFormat` ("Tuesday, October 13") |
| Next-task card (the one bordered card on the page) | `NextTaskCard` (§7): `Card` + `CardContent` | Level chip, title (`h2`), description, word range |
| Start writing | `Button variant="contained"` | Opens the Writing Studio |
| Focus line | `Typography variant="caption"` under a `Divider` | "Your focus: past-tense verbs" |
| Your week | `WeekTicks` (§7) | Mon–Sun |
| Weekly goal | `GoalRing` (§7) | "3 of 5 sessions" |
| Review prompt | `Stack` + `Typography` + `Button variant="outlined"` | "Past tense needs another look", "Review now" opens Practice |
| Section separators | `Divider` | The other blocks are open sections, not cards |

### Learning path

| Design element | MUI | Notes |
|---|---|---|
| Page title and subtitle | `Typography variant="h1"` + muted `Typography` | |
| Level switcher | `LevelSwitcher` (§7): `Tabs variant="scrollable"` inside `Paper variant="outlined"` | Zero, A1–C2. Selected = highlighter pill. |
| Level and unit heading | `Typography` (level label weight 700) + `Typography` (unit title) | "A2  Messages that connect" |
| Path | `List component="ol"` of `PathNode`s (§7) | Semantic ordered list |
| Done node | `CheckCircle` icon (`success.main`) | |
| Current node | Ink circle with a highlighter ring; row has `highlighter.light` bg (radius 14) and a `Button variant="contained"` "Continue" | One current node at a time |
| Locked node | `Lock` icon in a muted circle (`action.hover`) | Not clickable; `aria-disabled` |
| Checkpoint node | `Diamond` icon in a tonal circle | The unit's timed writing check |
| Node text | `ListItemText` (title `subtitle1`, description `body2` muted) | |
| Line between nodes | `PathLine` (§1.3) | |

### Practice

| Design element | MUI | Notes |
|---|---|---|
| Page title | `Typography variant="h1"` | "Give past tense another try" |
| Progress | "Question 1 of 3" `Typography` + `Stepper` (labels hidden, custom `StepIcon`) | Active/completed = `secondary` (violet); upcoming = outlined |
| Drill card | `DrillCard` (§7): `Card` | |
| Tag header | Underline swatch `SvgIcon` + `Typography variant="subtitle2"` | "Verb form" |
| Instruction | `Typography variant="body2"` | "Fix the highlighted word." |
| Sentence | `Typography variant="canvas"` with `DrillTarget` (§7) | Target word: `highlighter.light` bg + mark underline |
| Answer field | `WritingField` (`TextField`, outlined, full width) | **§10 attributes apply** |
| Check answer | `Button variant="contained"` | Enter also submits |
| Result | `Alert` (tonal) + `AlertTitle` | Correct: success. First miss: warning tonal with a hint. Second miss: reveals the answer. |
| Next question | `Button variant="outlined"` | Last question: "Finish" |
| Why this is back | `Typography variant="subtitle1"` + `body2` + `CalendarMonthOutlined` icon + `caption` | "Review again in 3 days" (the Leitner schedule) |

Other drill types (PROJECT.md §7.2) reuse the same card: gap-fill (`WritingField` inline), choose (`RadioGroup` or `ToggleButtonGroup`), reorder (clickable `Chip`s).

### Progress

| Design element | MUI | Notes |
|---|---|---|
| Page title | `Typography variant="h1"` | |
| Stat row | `StatRow` (§7): `Stack` with `Divider orientation="vertical"` | `Typography variant="stat"` + `body2` label |
| Writing level over time | `LineChart` from `@mui/x-charts` (area fill, markers, `success` color) in `Paper variant="outlined"` | Y ticks show CEFR labels (A1, A2, B1), X shows months. **Always show the caption "Practice estimates, not a certified assessment."** |
| Errors by category | `ErrorBars` (§7): rows of label + `LinearProgress` + count | Colors from §4.2 |
| Calendar | `StreakCalendar` (§7) | Month grid, writing days, today, legend |
| Panel layout | `Grid` of three `Paper variant="outlined"` | See §8.6 |

### Settings

| Design element | MUI | Notes |
|---|---|---|
| Page title | `Typography variant="h1"` | "Make this space yours" |
| Section row | `Box` row: section name (`Typography variant="subtitle1"`, weight 700) + controls; `Divider` between rows | |
| Select with inline label | `FormControl size="small"` + `FormLabel` + `Select` | UI language, Explanation language, Daily writing target, Weekly goal |
| Segmented choice | `ToggleButtonGroup exclusive` + `ToggleButton` | Selected = ink fill, white text. Theme (Light / Dark / System) and Text direction (LTR / RTL). |
| Theme mode | MUI's `useColorScheme` (`light` / `dark` / `system`) | |
| Theme preview | Two decorative `Box` swatches (`aria-hidden`) | |
| Plan | `Typography` ("Free", weight 700) + muted `body2` + `Button variant="outlined"` "View plans" | |
| Developer options | `Accordion disableGutters elevation={0}` | Holds the RTL preview toggle |
| Saved confirmation | `Alert` (tonal success) inside `Collapse`, `role="status"` | Appears after any change autosaves |

### Not yet designed

Landing, Login, Onboarding, Pricing, Portfolio, Unit page, empty and error states. Build them from §4 tokens and the patterns above, and show a screenshot for review before moving on.

Icons (closest MUI match; swap freely): Today `HomeOutlined`, Learning path `MapOutlined`, Writing Studio `EditOutlined`, Practice `FitnessCenterOutlined`, Progress `BarChartOutlined`, Settings `SettingsOutlined`, review date `CalendarMonthOutlined`.

---

## 7. Composed components (build these once, reuse everywhere)

All live in `src/components/`, are Client Components, and consist only of MUI parts (plus the §1.3 exceptions).

**`MarkedText`**
- Props: `text`, `corrections: LocatedCorrection[]` (with `start`/`end`), `strengths?: {start,end}[]`, `activeId?`, `onSelect(id)`.
- Splits `text` at the offsets and renders segments as `Box component="span"`; `whiteSpace: pre-wrap`. **Never** `dangerouslySetInnerHTML`.
- Each mark: `role="button"`, `tabIndex={0}`, Enter/Space selects, `aria-label="Verb tense: I go, suggested: I went"`, underline per §4.2. Hover/active: tinted bg (~12% / ~18% of the mark color). `:focus-visible`: 2px `secondary` outline.
- Fixed corrections render the replacement text without a mark. Dismissed corrections render plain text.

**`CorrectionCard`**
- Props: `correction`, `active`, `l1Enabled`, `onApply`, `onDismiss`, `onReport`, `onTry`.
- States: `open` (default), `active` (border `secondary` at 1.5px), `trying` (input revealed), `fixed` (collapses to one row: "Fixed" success chip + "Undo"), `dismissed` (hidden).
- Header: swatch + tag name; actions "Dismiss | Report" top-right.
- "Try it yourself": learner types the fix; correct → success state then auto-apply; wrong twice → show the suggestion.

**`ScoreBar`**
- Props: `label`, `value` (0–5). Layout: label, bar, `n/5`.
- Fill color by value: 4–5 `success`, 3 `info`, 0–2 `error`. Always show the number. `LinearProgress` gets `aria-label="Grammar: 2 out of 5"`.

**`ConnectorLayer`**
- Absolutely positioned SVG over the feedback layout. Draws a thin curved path (1px, mark color, 1.5px when active) from each mark's right edge to its card's left edge, with a 6px dot at each end.
- Measures DOM rects; recomputes on resize (`ResizeObserver`), font load, card height change, and selection. Hidden below `md`. The lines are static, so they stay under reduced motion; only any draw-in animation is disabled.

**Margin layout (desktop)**
- Cards sit in the right column, ordered by their mark's position in the text. Each card's top aligns to its mark's line; if two would overlap, push the lower one down with a 12px gap.

**`LevelChip`, `StrengthChip`, `PriorityChip`**: wrappers over `Chip variant="tonal"` (§6).

**`AppShell`**: `SideNav` (≥ `md`) or `TopBar` + `BottomNav` (< `md`), plus a `main` region.

**`FeedbackSheet`**: `SwipeableDrawer` (bottom) hosting one `CorrectionCard`; opens when a mark is tapped on < `md`.

**`ReadSweep`**: see §9.

**`NextTaskCard`**: props `task`, `focusTag`. Level chip, title (`h2`), description, word range, "Start writing", then a hairline and the focus line. It is the visual anchor of Today; nothing else on the page is a bordered card.

**`WeekTicks`**
- Props: `days: { date, status: "done" | "missed" | "today" | "future" }[]`, `weekStartsOn`.
- Each day: weekday caption (from `Intl`) above a 24px icon: `CheckCircle` (`success.main`) for done, `RadioButtonUnchecked` (muted) otherwise. Today gets an ink ring.
- **Future days are never shown as done.** `aria-label="Monday: written"` per day.

**`GoalRing`**
- Props: `done`, `goal`. Two `CircularProgress` stacked (a faint full track and the value), about 96px, thickness 4, `success`.
- Centered label: "3 of 5" (`subtitle1`, 700) over "sessions" (`caption`). Container has `role="img"` and `aria-label="3 of 5 sessions this week"`.

**`LevelSwitcher`**: `Tabs` styled as a pill row; selected tab = `highlighter.main` with ink text. Starts on the learner's current level; selecting one scrolls the path to that level (smooth, or instant under reduced motion). Locked levels can be previewed, not started.

**`PathNode`**
- States: `done | current | locked | checkpoint`. Renders the node icon, title, description, and (for `current`) the "Continue" button.
- Locked nodes are not interactive: `aria-disabled="true"`, plus visually hidden text "Locked. Finish {previous unit} first." (use `visuallyHidden` from `@mui/utils`; check the installed version).
- `PathLine` draws the connecting curve between consecutive nodes.

**`DrillCard` / `DrillTarget`**
- States: `answering`, `correct`, `incorrect` (first miss shows a hint, second reveals the answer), `complete`.
- `DrillTarget` renders the target word with `highlighter.light` background plus the mark underline for its tag.
- After "Check answer", focus moves to the result `Alert` (`role="status"`); "Next question" receives focus after the learner reads it. Enter submits.

**`StatRow`**: three centered stats separated by vertical dividers; stacks to one column below `sm`.

**`ErrorBars`**
- Props: `items: { group, count }[]`, sorted by count, bars scaled to the largest count.
- Row = fixed-width label, `LinearProgress` (bar color from §4.2, faint track), count at the end. Rendered as a `List`; each row has `aria-label="Grammar: 12 errors"`.

**`StreakCalendar`**
- Props: `month`, `writingDays: Set<string>`, `today`. A 7-column grid built with `Box`; weekday header row; each day is a 32px circle (use `ButtonBase` if days open that day's writing).
- Writing day: `success.dark` fill, white numeral. Today: ink fill, white numeral (with a mint ring if it is also a writing day). No writing and future days: plain numeral.
- Legend below ("Writing day", "No writing"). Optional previous/next month `IconButton`s. `aria-label="October 14, writing day"`.

---

## 8. Screen layouts

### 8.1 Writing Studio (`/write/[taskId]`)

| Breakpoint | Layout |
|---|---|
| `lg+` | `[SideNav ~200] [Task rail ~280] [Canvas, flexible, text ≤ 70ch] [Coach panel ~280]` |
| `md` to `lg` | SideNav + canvas. Task rail becomes a collapsible `Accordion` above the canvas. Coach panel opens as a bottom sheet. |
| `< md` | Top bar + bottom nav. Task `Accordion`, canvas full width, coach in a bottom sheet. |

- "Check my writing" is disabled until the minimum word count is met; the helper text says how many words remain.
- The canvas fills the available height; the footer (autosave, count, button) stays pinned inside the paper.

### 8.2 Feedback (`/feedback/[submissionId]`)

| Breakpoint | Layout |
|---|---|
| `md+` | Header (title, chips, score grid) over two columns: marked page (flexible) + margin cards (~360px), connectors visible. Actions "Rewrite" and "See it one level up" sit under the page. |
| `< md` | Title, level chip, summary, then the marked page full width. Tapping a mark opens the correction in a bottom sheet. Score bars in one column. |

Revise mode: the paper becomes editable (same canvas component and field attributes); unresolved marks stay visible as reference until the learner edits that span; "Check my rewrite" shows the v1/v2 diff, score deltas, XP gained, and `Celebrate` if everything is resolved.

### 8.3 Today (`/today`)

- `Container maxWidth="sm"`, single column, left-aligned in the main area.
- Order: title and date; `NextTaskCard`; hairline; row of **Your week** (flexible) and **Weekly goal** (fixed width) separated by a vertical divider; hairline; review prompt row.
- `xs`: week and goal stack vertically (divider becomes horizontal); "Review now" goes full width.

### 8.4 Learning path (`/path`)

- `Container maxWidth="md"`. Title, subtitle, `LevelSwitcher` (sticky under the top bar on `xs`), then the path.
- Each level group: a left gutter (about 48px) with the level label ("A1"), the unit title beside it, and the nodes below, indented. On `xs` the level label sits above the unit title.
- The current node's row is highlighted and carries the "Continue" button; on `xs` the button drops under the text.

### 8.5 Practice (`/practice`)

- `Container maxWidth="md"`. Title, then the stepper row, then `DrillCard` (about 720px max), then "Why this is back".
- `xs`: card full width; "Check answer" and "Next question" are full width.

### 8.6 Progress (`/progress`)

- Title, `StatRow` across the full width, then three panels: level chart, errors by category, calendar.
- `lg+`: three columns (about 5 / 3 / 4 of 12). `md`: chart full width, the other two side by side. `< md`: stacked. Chart height at least 240px.

### 8.7 Settings (`/settings`)

- `Container maxWidth="md"`. Rows: Language, Goals, Appearance, Plan, then Developer options. Label column about 160px; controls wrap.
- `xs`: label above controls; selects go full width.

### 8.8 Not yet designed

See §6 "Not yet designed".

---

## 9. Interaction and motion

1. **Highlighter read (the one signature moment).** On submit: `ReadSweep` measures each line of the learner's text (Range client rects) and draws one band per line in `highlighter.main` at ~40% opacity. Bands wipe left→right in sequence (total about 1.2–2s depending on length) while the Check button shows loading. Then the bands fade out, marks settle in (`Fade`, 150ms) and margin cards appear. If the API is still working when the sweep ends, loop it softly until the response arrives.
2. **Apply fix.** The old text gets a strike-through that draws across, then the replacement fades in (`Fade`/`Grow`, ≤ 250ms) and the card collapses to the "Fixed" row.
3. **Select mark ↔ card.** Selecting either one highlights both and scrolls the card into view (smooth, instant under reduced motion).
4. **Level up.** A brief `Celebrate` confetti plus a `Snackbar`.
5. **Transitions elsewhere:** `Collapse` for reveals, `Slide` for sheets. No entrance animation on every section, no hover animation on every card.
6. **Reduced motion** (`prefers-reduced-motion: reduce`): no sweep, no confetti, no draw-in; marks and cards simply appear (instant or ≤ 100ms fade).

---

## 10. Writing field requirements

Every learner-writing input (Studio canvas, revise mode, placement, Try it yourself, drills) must set:

`spellCheck={false}` `autoCorrect="off"` `autoCapitalize="off"` `autoComplete="off"` `data-gramm="false"` `data-gramm_editor="false"` `data-enable-grammarly="false"`

Pass them through the MUI `TextField` `slotProps.htmlInput` (check the installed version's slot API). Build one `WritingField` wrapper and use it everywhere so this can't be forgotten.

---

## 11. Copy

- Sentence case. Active voice. Buttons say exactly what happens. The same action keeps the same name everywhere.
- Warm, specific, never childish. Errors say what happened and how to fix it. Empty states offer an action.
- No ALL-CAPS labels, no "A · B · C" meta strings, no arrows added to button text, no single-word accents in headlines.
- All strings live in `messages/*.json` (next-intl).

Canonical strings from the mockup: "Check my writing", "Saved just now", "{n} words", "A little help", "Ask for a hint", "Include these points:", "Useful phrases (word bank)", "Your message, marked", "Estimated {level}", "Rewrite", "See it one level up", "Try it yourself", "Apply fix", "Dismiss", "Report", "Explain in Español", "Focus on {topic}".

Canonical strings (board): "Make room for a little writing", "Start writing", "Your focus: {topic}", "Your week", "Weekly goal", "{n} of {m} sessions", "{Topic} needs another look", "{n} questions", "Based on your last message", "Review now", "Your writing path", "From first words to confident writing", "Continue", "Give {topic} another try", "Question {n} of {m}", "Fix the highlighted word.", "Check answer", "That's right.", "Next question", "Why this is back", "Review again in {n} days", "See your writing grow", "Words written", "Writing sessions", "Current streak", "Writing level over time", "Errors by category", "Practice estimates, not a certified assessment.", "Writing day", "No writing", "Make this space yours", "UI language", "Explanation language", "Daily writing target", "Weekly goal", "View plans", "Developer options", "Text direction".

Dates, numbers, and weekday names come from `Intl` for the active locale, never hardcoded. The "not a certified assessment" caption must stay on any chart that shows CEFR levels.

Explanation style (example): for `swimmed → swam`, write "Swim is an irregular verb. Its past tense is *swam*." (The mockup's placeholder text for this card is not accurate; don't copy it.) For `I eat → I ate`: "Use the past tense for a finished event."

---

## 12. Accessibility

- WCAG AA contrast in both schemes. Check text on `highlighter.light`, tonal chips, and mark colors against `background.paper`.
- Marks are keyboard-focusable buttons; the order of cards matches the reading order; Esc closes sheets and returns focus to the mark.
- Score and mark meaning never rely on color alone (underline style, `n/5`).
- Visible `:focus-visible` ring (2px `secondary`) on everything interactive.
- Touch targets ≥ 44px (theme sets `Button`, `IconButton`, `Checkbox`, `ListItemButton`).
- Respect `prefers-reduced-motion` and user font scaling (rem units).
- RTL: use logical props (`marginInlineStart`, `paddingInline`, `insetInlineEnd`), set `dir` on the document and the theme direction, and mirror directional icons (arrows, chevrons). Test with an Arabic UI locale; the English canvas stays LTR (`dir="ltr"` on the writing field and marked text).
- The learning path is an ordered list; locked nodes announce why they are locked. The stepper and the calendar expose text labels, not just color or position.
- Charts need a text alternative: a short summary line, and the data available as a table or list (the `ErrorBars` list already is one).
- Result alerts (`role="status"`) announce correct and incorrect answers and "saved" confirmations politely; don't steal focus except to move it to the result after "Check answer".

---

## 13. Open items to verify

- [ ] Hex values and radii: confirm against the source design file (they were read from a screenshot).
- [ ] The pale yellow highlight appears on a strength sentence (Feedback) and on the target word (Practice). I generalized it to "attention, not judgment" (§4.1). Confirm.
- [ ] Dark mode is not in the mockup; the dark tokens are proposals. Review once built.
- [ ] Final nav icons and the logo glyph.
- [ ] **Mock data on the board is inconsistent.** Today says Tuesday, October 13 but shows Mon–Fri as done; the calendar marks the 14th and 15th as writing days; the weekly goal says 3 of 5 sessions while 5 days are ticked. Real data must drive these; future days are never done.
- [ ] **Titles:** the first board used a bold sans page title; this board uses a serif. I standardized on Literata for `h1` (§4.3). Say if the Feedback and Studio titles should stay sans.
- [ ] **Settings is missing rows** that PROJECT.md requires: account (email, sign out) and data export and deletion. Add a "Data and privacy" row.
- [ ] Copy "Preferences saved on this device" is only true if settings are stored locally. If they save to the account, use "Preferences saved."
- [ ] Developer options (RTL preview): show in dev and staging only, or in production too?
- [ ] The path line is a soft curve in the board (needs the `PathLine` SVG exception). A straight line would avoid the exception; pick one.
- [ ] Landing, Login, Onboarding, Pricing, Portfolio, Unit page, and empty/error states still need designs.
