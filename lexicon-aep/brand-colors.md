# lexicon-aep brand colors

Reference for matching third-party UI (Cookiebot banner, embeds, screenshots, presentations) to the live site. Hex values are the source of truth; RGB and HSL are provided for tools that want them.

## Primary brand

The blue is the single most recognizable color. Use it for primary CTAs, links, focus rings, and the Cookiebot accept button.

| Role | Hex | RGB | HSL | Notes |
|---|---|---|---|---|
| **Primary** (brand blue) | `#2563eb` | `37, 99, 235` | `221, 83%, 53%` | Tailwind `blue-600`. CTAs, links, ring focus, primary buttons. **Use this for the Cookiebot "Allow all" button.** |
| Primary hover | `#1d4ed8` | `29, 78, 216` | `224, 76%, 48%` | Tailwind `blue-700`. Hover state of primary button. |
| Primary tint (10%) | `#eef4fe` | `238, 244, 254` | `217, 89%, 96%` | Subtle blue washes (badge backgrounds at 10% primary). |

## Accent

A complementary teal for secondary highlights, the "vibe" pop. Use sparingly.

| Role | Hex | RGB | HSL | Notes |
|---|---|---|---|---|
| **Accent** (teal) | `#14b8a6` | `20, 184, 166` | `173, 80%, 40%` | Tailwind `teal-500`. Secondary callouts, warning-tinted badges. |

## Neutrals (text + surfaces)

The slate scale carries everything else. Text never goes pure black — `#1e293b` is the darkest foreground.

| Role | Hex | RGB | HSL | Notes |
|---|---|---|---|---|
| Background | `#ffffff` | `255, 255, 255` | `0, 0%, 100%` | Site background, card surface. |
| Text — primary | `#1e293b` | `30, 41, 59` | `217, 33%, 17%` | Tailwind `slate-800`. Body copy, headings. |
| Text — secondary | `#64748b` | `100, 116, 139` | `215, 16%, 47%` | Tailwind `slate-500`. Muted body, captions, footer text. |
| Text — tertiary | `#94a3b8` | `148, 163, 184` | `215, 20%, 65%` | Tailwind `slate-400`. Disabled, lowest emphasis. |
| Surface — muted | `#f1f5f9` | `241, 245, 249` | `210, 40%, 96%` | Tailwind `slate-100`. Search input bg, card hover. |
| Border | `#e2e8f0` | `226, 232, 240` | `214, 32%, 91%` | Tailwind `slate-200`. Dividers, card borders, inputs. |

## Status colors

| Role | Hex | RGB | HSL | Notes |
|---|---|---|---|---|
| Destructive (red) | `#dc2626` | `220, 38, 38` | `0, 72%, 51%` | Tailwind `red-600`. Delete buttons, errors. |
| Legacy term accent (orange) | `#f97316` | `249, 115, 22` | `21, 91%, 53%` | Tailwind `orange-500`. Left border + indicator for legacy/deprecated terms. |

## Social platform brand colors

These are fixed by each platform — match the platform brand guide, not the lexicon palette.

| Platform | Hex | Notes |
|---|---|---|
| LinkedIn | `#0A66C2` | Used in share buttons. |
| Facebook | `#1877F2` | Used in share buttons. |
| Twitter / X | `#1D9BF0` | Used in share buttons. |

## Quick recipe — Cookiebot banner

Recommended palette mapping for the Cookiebot dashboard appearance settings:

- **Banner background:** `#ffffff` (or `#f1f5f9` for subtle distinction)
- **Banner text:** `#1e293b`
- **"Accept all" / primary button:** background `#2563eb`, text `#ffffff`, hover `#1d4ed8`
- **"Customize" / secondary button:** background `#ffffff`, text `#1e293b`, border `#e2e8f0`
- **Link color:** `#2563eb`
- **Border:** `#e2e8f0`

This keeps the banner visually consistent with the site without any jarring color shifts.
