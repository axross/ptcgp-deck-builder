---
name: ui-design-principles
description: Apply this skill when deciding how a surface should look in this project — color-token roles, control selection for a decision shape, spacing/typography/radius tokens, dark-mode behavior, responsive layout, copy tone, and accessibility intent. Use even when the user only mentions a color, a button vs link choice, spacing, dark mode, "make it look nice", or theming.
---

# UI Design Principles

This skill owns **appearance** — the decision vocabulary for how surfaces look. Implementation mechanics (CSS Modules, props, test ids) are owned by the project's component guidelines; file placement by the project's project-structure skill.

## Color Roles

All colors come from the CSS variables in `src/app/globals.css`, which flip automatically for dark mode via `prefers-color-scheme`.

| Role | Token | Used for |
| ---- | ----- | -------- |
| Background | `--color-background` | The page canvas |
| Surface | `--color-surface` | Cards, panels, and raised containers on the canvas |
| Border | `--color-border` | Hairline separation between surfaces and around inputs |
| Text | `--color-text` | Primary copy and headings |
| Muted text | `--color-text-muted` | Secondary copy, captions, empty-state hints |
| Accent | `--color-accent` | The primary action and active/selected states |
| Accent contrast | `--color-accent-contrast` | Text/icons rendered on top of the accent color |

**Guidelines:**

- MUST use the tokens above — never a literal color value — in component CSS: `grep -rn "#[0-9a-fA-F]\{3,8\}" src --include="*.module.css"` is expected to return nothing (literals live only in `globals.css`).
- MUST keep at most **one** accent-colored primary action per surface; every other action uses a neutral treatment.
- MUST NOT encode meaning in color alone — pair state colors with an icon, wording, or shape cue (e.g. a deck-validation error shows a message, not just a red border).
- SHOULD add new roles as tokens in `globals.css` (with light and dark values) rather than one-off values in a component.

## Spacing, Radius, and Type

| Kind | Tokens | Rule |
| ---- | ------ | ---- |
| Spacing | `--space-1` … `--space-5` (0.25–2.5 rem) | All padding/gap/margin values pick from this scale |
| Radius | `--radius-1` (controls), `--radius-2` (cards/panels) | Rounded corners come in exactly these two sizes |
| Type | `--font-sans`; sizes in `rem` | System font stack; a page has one `h1`, heading levels never skip |

## Control Selection

| Decision shape | Control |
| -------------- | ------- |
| Navigate somewhere | Link (`<a>`/`next/link`), never a button |
| Perform an action | Button; accent style only for the surface's primary action |
| Pick one of 2–5 visible options | Segmented control / radio group |
| Pick one of many options | Select or searchable combobox |
| Toggle an independent setting | Checkbox or switch |
| Enter free text / numbers | Text input with a visible label |

## Layout and Responsiveness

- MUST design mobile-first: the deck builder's core flows (browse cards, edit a deck) work on a narrow viewport, with wider layouts adding columns rather than new behavior.
- MUST use `rem`-based sizing and the spacing scale; content containers cap at a readable max-width and center on wide screens.
- SHOULD keep card imagery on a consistent aspect ratio so grids stay stable while loading (pair with the image rules in the project's performance-and-reliability requirements (image-optimization rules)).

## Copy

- MUST write UI copy in sentence case ("Save deck", not "Save Deck"), concise and action-first.
- MUST keep game proper nouns in their official casing (Pokémon, Trainer, PTCGP expansion names).
- SHOULD give empty states a one-line hint about the next action (e.g. "No decks yet — build your first one"), in muted text.

## Accessibility Intent

- MUST keep text/background combinations at WCAG AA contrast in both light and dark themes when introducing or changing tokens.
- MUST keep a visible focus indicator on every interactive element; never remove outlines without an equivalent replacement.
- MUST honor reduced-motion preferences for any non-trivial animation (`prefers-reduced-motion`).
