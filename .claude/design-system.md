# Σ-Motion Design System — App Theme Export
Version 1.0 · 2026-06-25 · Source of truth: `colors_and_type.css`, `tailwind.config.js`

## 1. Brand foundation

Σ-Motion is FRC Team 2658, the 100% student-run robotics team at Rancho Bernardo High School, San Diego — founded 2007, 18 consecutive seasons. The name fuses Σ (math) with "e-motion" (heart): a serious engineering organization run entirely by teenagers.

Core principles the visual system expresses:
- Two surfaces only — black and team-yellow. No gradients, no patterns, no third hue.
- The archive is the brand: the system accumulates across seasons, it does not reset.
- Student-run, period — neither polished-corporate nor clubhouse-chaotic.
- One motion contract: 300ms ease-in-out; interactive feedback is opacity, not color.

Note on light/dark: the brand defines **absolute** color values, not mode-adjusted ramps, so each ramp's light and dark hex are identical. Mode difference is expressed only through *which stop* fills each role — see section 3 (the "Stage" = dark and "Daylight" = light modes).

## 2. Color ramps

NativeWind stops required: 0, 50, 100–900 (by 100), 950. Stops not defined in the source are `TBD`.

### Primary — team yellow (the hero ramp)

| Stop | Light hex | Dark hex | Intended use |
|------|-----------|----------|--------------|
| 0 | TBD | TBD | TBD |
| 50 | TBD | TBD | TBD |
| 100 | #fcfaca | #fcfaca | Text/headings set over photography (`teamYellow-100`) |
| 200 | #fcf797 | #fcf797 | Tint |
| 300 | #fcf465 | #fcf465 | Tint |
| 400 | #fcf232 | #fcf232 | Card surface on yellow; yellow text on black (Stage fg) |
| 500 | #fcf000 | #fcf000 | Hero / primary brand surface (Daylight bg) |
| 600 | #bfb600 | #bfb600 | Dividers, accent rule (`stage-divider`) |
| 700 | #8c8500 | #8c8500 | Deep accent |
| 800 | #595500 | #595500 | Deep accent |
| 900 | #262400 | #262400 | Darkest yellow |
| 950 | TBD | TBD | TBD |

Defined off-stop: **550 = #d9ce00** (no NativeWind equivalent stop).

### Secondary — midnight

| Stop | Light hex | Dark hex | Intended use |
|------|-----------|----------|--------------|
| 0 | TBD | TBD | TBD |
| 50 | TBD | TBD | TBD |
| 100 | TBD | TBD | TBD |
| 200 | TBD | TBD | TBD |
| 300 | TBD | TBD | TBD |
| 400 | TBD | TBD | TBD |
| 500 | TBD | TBD | TBD |
| 600 | TBD | TBD | TBD |
| 700 | TBD | TBD | TBD |
| 800 | TBD | TBD | TBD |
| 900 | TBD | TBD | TBD |
| 950 | #050226 | #050226 | "Midnight" — defined token, single value; reserved, not used on current public site |

### Tertiary

| Stop | Light hex | Dark hex | Intended use |
|------|-----------|----------|--------------|
| 0–950 (all) | TBD | TBD | Not defined in source |

### Neutrals

| Stop | Light hex | Dark hex | Intended use |
|------|-----------|----------|--------------|
| 0 | #ffffff | #ffffff | White (defined token) |
| 50 | TBD | TBD | TBD |
| 100 | #f5f5f5 | #f5f5f5 | Lightest neutral |
| 200 | #e5e5e5 | #e5e5e5 | Hairline / faint fill |
| 300 | #d4d4d4 | #d4d4d4 | Neutral |
| 400 | #a3a3a3 | #a3a3a3 | Muted text on dark |
| 500 | #737373 | #737373 | Mid neutral |
| 600 | #525252 | #525252 | Neutral |
| 700 | #404040 | #404040 | Surface box on dark (Socials section bg) |
| 800 | #262626 | #262626 | Deep neutral |
| 900 | #171717 | #171717 | Darkest neutral |
| 950 | #000000 | #000000 | Black — the "stage" (defined token) |

## 3. Semantic + surface mapping

Light = "Daylight" mode (yellow page, black ink). Dark = "Stage" mode (black page, yellow ink).

| Role | Light → ramp/stop | Light hex | Dark → ramp/stop | Dark hex |
|------|-------------------|-----------|------------------|----------|
| background | primary/500 | #fcf000 | neutral/950 | #000000 |
| surface | primary/400 | #fcf232 | neutral/700 | #404040 |
| text / typography (primary) | neutral/950 | #000000 | primary/400 | #fcf232 |
| text / typography (soft) | neutral/950 @ 70% | rgba(0,0,0,0.7) | primary/100 | #fcfaca |
| border / outline | neutral/950 @ 10% | rgba(0,0,0,0.1) | primary/600 | #bfb600 |
| error | (danger token) | #dc2626 | (danger token) | #dc2626 |
| success | (success token) | #16a34a | (success token) | #16a34a |
| warning | TBD | TBD | TBD | TBD |
| info | TBD | TBD | TBD | TBD |
| FRC alliance red | TBD | TBD | TBD | TBD |
| FRC alliance blue | TBD | TBD | TBD | TBD |

Defined social-accent hues (used on hover only, not theme roles): Instagram #dd2a7b · Facebook #1877f2 · Twitter/X #1DA1F2 · YouTube #FF0000.

## 4. Typography

### Families (with fallbacks)

| Token | Stack |
|-------|-------|
| display | "Orbitron", "Helvetica Neue", Arial, sans-serif |
| banner | "Bebas Neue", "Orbitron", "Helvetica Neue", sans-serif |
| body | "Inter", "Helvetica Neue", Arial, sans-serif |
| mono | "JetBrains Mono", ui-monospace, Menlo, monospace |

Weights: regular 400 · medium 500 · semibold 600 · bold 700 · black 900.

### Type scale

Source sizes are fluid `clamp(min, vw-expr, max)`. "Size" below is the defined **max** (canonical fixed value for native); min is given where a non-native target needs it.

| Role | Size (max) | Min | Weight | Line-height | Letter-spacing |
|------|-----------|-----|--------|-------------|----------------|
| hero (r12xl) | 12rem / 192px | 2.5rem | 600 | 1.05 | -0.01em |
| h1 (r5xl) | 3.75rem / 60px | 2rem | 600 | 1.2 | 0 |
| h2 (r4xl) | 3rem / 48px | 1.5rem | 700 | 1.2 | 0 |
| h3 (r3xl) | 2.25rem / 36px | 1.5rem | 700 | 1.2 | 0 |
| eyebrow | 0.8125rem / 13px | — | 700 | TBD | 0.2em (uppercase) |
| body (rmd) | 1.125rem / 18px | 1rem | 400 | 1.65 | 0 |
| caption (rsm) | 1rem / 16px | 0.75rem | 400 | 1.5 | 0 |
| code (mono) | 0.95em | — | 400 | TBD | 0 |

Full fluid scale tokens (min → max): rxs 0.75→0.875rem · rsm 0.75→1rem · rmd 1→1.125rem · rlg 1→1.25rem · rxl 1→1.5rem · r2xl 1.5→1.875rem · r3xl 1.5→2.25rem · r4xl 1.5→3rem · r5xl 2→3.75rem · r6xl 2→4.5rem · r7xl 2.6→6rem · r8xl 2.6→8rem · r9xl 2.6→9rem · r10xl 2.5→10rem · r11xl 2.5→11rem · r12xl 2.5→12rem.

Line-height tokens: tight 1.05 · snug 1.2 · normal 1.5 · relaxed 1.65.
Letter-spacing tokens: tight -0.01em · normal 0 · wide 0.05em · widest 0.2em.

## 5. Spacing + layout

### Spacing scale

| Token | Value |
|-------|-------|
| space-1 | 4px |
| space-2 | 8px |
| space-3 | 12px |
| space-4 | 16px |
| space-5 | 24px |
| space-6 | 32px |
| space-8 | 48px |
| space-10 | 64px |
| space-12 | 96px |

### Border radii

| Token | Value |
|-------|-------|
| sm | 6px |
| md | 8px |
| lg | 12px |
| xl | 24px |
| pill | 9999px |

### Border widths

Not tokenized in source. Observed in use: 1px (hairline divider), 2px (`hr` rule), 4px (left-accent eyebrow bar).

### Container / padding

| Item | Value |
|------|-------|
| Page horizontal padding | 5vw–10vw (viewport-relative) |
| Max content width | 80rem / 1280px (`max-w-7xl`, nav) |
| Section break (hr) margin | 64px vertical / 128px horizontal |

## 6. Elevation + motion

### Shadows

| Token | Value |
|-------|-------|
| sm | 0 1px 2px rgba(0,0,0,0.08) |
| md | 0 4px 10px rgba(0,0,0,0.15) |
| lg | 0 10px 25px rgba(0,0,0,0.25) |
| xl | 0 20px 45px rgba(0,0,0,0.35) |

### Motion

| Token | Value |
|-------|-------|
| easing | cubic-bezier(0.4, 0, 0.2, 1) |
| duration-fast | 150ms |
| duration-base | 300ms |
| duration-slow | 600ms |
| hover affordance | opacity → 0.5 |

## 7. Component conventions

The source defines interactive behavior primarily through links, not discrete buttons. Undefined states are `TBD`.

### Link / button (the canonical interactive element)

| State | Styling |
|-------|---------|
| default | color: inherit (currentColor); underline; underline-offset 3px; weight 600; opacity 1 |
| hover | opacity 0.5; transition opacity 300ms ease-in-out |
| pressed | TBD |
| disabled | TBD |

### Card

| State | Styling |
|-------|---------|
| default | background = surface stop (primary/400 light, neutral/700 dark); radius lg (12px); padding ~16–32px; no border; no shadow |
| hero-image variant | shadow xl (0 20px 45px rgba(0,0,0,0.35)); hover → larger shadow (value TBD) |
| hover | TBD (non-hero cards define no hover) |
| pressed / disabled | TBD |

### Input

| State | Styling |
|-------|---------|
| all states | TBD (contact form exists in source; field styling not defined as tokens) |

### Badge

| Variant | Styling |
|---------|---------|
| Σ divider chip | background primary/500 (#fcf000); color primary/600 (#bfb600); radius xl (24px); font display 800; content "Σ" |
| other badges | TBD |

## 8. Usage rules

Do:
- Use only black and team-yellow as surfaces; keep everything two-color.
- Set body text in black on yellow (Daylight) or yellow-400 on black (Stage); use yellow-100 for text laid over photography.
- Apply a brightness-0.5 + blur darkening layer under any text placed on a photo.
- Present sponsor logos in a gallery: `object-contain`, on a yellow card, evenly gridded.
- Animate with the single 300ms ease-in-out contract; use opacity (→0.5) for hover feedback.

Don't:
- Introduce a third/fourth color, gradients, or textures.
- Set yellow text on white or near-white (fails contrast) — yellow type belongs on black or photography.
- NASCAR-hood sponsor logos (crammed, recolored, or stretched); never recolor a sponsor mark.
- Repurpose brand yellow as an FRC alliance color — alliance red/blue are `TBD` and must not be substituted with brand hues.
- Carry the merch sub-brand's seasonal motifs into sponsor/website/institutional surfaces.

Accessibility / contrast:
- Black (#000000) on primary/500 (#fcf000): high contrast, passes.
- primary/400 (#fcf232) on black: high contrast, passes.
- primary/100 (#fcfaca) requires the brightness-0.5 photo overlay to remain legible.
- Formal WCAG ratio targets: TBD (not specified in source).