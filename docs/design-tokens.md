# Design tokens

All colors, fonts, radii and shadows live in `app/theme.css`. Every page loads it before its own styles:

```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="theme.css?v=100">
```

Themes: light on `:root`; dark under `@media (prefers-color-scheme: dark)` (skipped when `<html data-theme="light">`) and under `:root[data-theme="dark"]`. To force a theme, set `document.documentElement.dataset.theme = 'dark' | 'light'`.

## Rationale

- Calm, data-dense UI for people who read tables all day: low-chroma surfaces, color reserved for meaning.
- Neutrals carry a cool harbor-water bias (hue about 195) so grey reads as one family instead of default UI grey.
- One accent, deep harbor teal `#0A7684`. Used for current selection, primary action, links and focus. Never for status.
- Status colors are muted (forest green, ochre, brick) so they sit next to the accent without fighting it, and each has `-soft`, `-ink` and `-line` variants for chips and banners.
- Levels L0–L4 read as a material ladder (unset grey, bronze, silver, gold, sea-glass green) and stay separate from status colors.
- Game layer gets its own buoy orange so it is always recognisable as optional.
- Type: Source Sans 3 (humanist, compact, Cyrillic and Latin) for UI; JetBrains Mono for code and numeric table columns.
- Dark theme is a re-tint of the same roles, not a separate palette: same token names, lighter accents, deeper soft fills.

## Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#EEF2F3` | `#0D1418` | app ground |
| `--bg2` | `#F4F7F8` | `#111B20` | sunken areas, quiet fills |
| `--surface` | `#FFFFFF` | `#151F25` | cards, panels, inputs |
| `--surface-2` | `#F7F9FA` | `#1A262D` | row hover |
| `--chip` | `#E8EEF0` | `#22303A` | chips, segmented controls |
| `--track` | `#E3E9EC` | `#26343D` | empty part of bars |
| `--line` | `#DCE3E6` | `#2A3842` | borders, dividers |
| `--line-strong` | `#C3CDD2` | `#3C4D57` | input borders, hover borders |
| `--ink` | `#13212A` | `#E2EAEE` | primary text, strong fills |
| `--ink2` | `#4D5F69` | `#A2B1B9` | secondary text |
| `--ink3` | `#7F909A` | `#71838D` | muted text, axis ticks |
| `--on-ink` | `#FFFFFF` | `#0D1418` | text on `--ink` fills |
| `--accent` | `#0A7684` | `#3BB0BC` | selection, primary action, links, focus |
| `--accent-hover` | `#075F6B` | `#5CC3CD` | hover on accent |
| `--accent-soft` | `#DDEFF1` | `#123238` | selected row, active filter |
| `--accent-line` | `#A9D3D8` | `#1F5961` | accent borders |
| `--on-accent` | `#FFFFFF` | `#04171A` | text on accent (and other saturated) fills |
| `--ok` / `-soft` / `-ink` / `-line` | `#2E8A57` / `#E1F1E7` / `#1E6A41` / `#B8DDC6` | `#4DB57C` / `#13301F` / `#7CD3A2` / `#22543A` | healthy |
| `--warn` / `-soft` / `-ink` / `-line` | `#C88A12` / `#FAEFD6` / `#8C5F07` / `#EED39C` | `#DDA640` / `#352910` / `#EBC170` / `#5E4718` | at risk |
| `--bad` / `-soft` / `-ink` / `-line` | `#C4453A` / `#F8E2DF` / `#9C3027` / `#EDC4BE` | `#E4695D` / `#3A1B19` / `#F09A90` / `#6A2E29` | broken, missing role |
| `--bad-track` | `#EBC7C1` | `#5A2E2A` | unhealthy share in meters |
| `--grey` | `#A7B3B9` | `#5F6F78` | no data |
| `--info` / `-soft` / `-line` | `#34689A` / `#E5EDF5` / `#B9CDE1` | `#6FA0D2` / `#15253A` / `#2C4766` | "example" / demo badges |
| `--wip` / `-soft` / `-soft2` / `-line` | `#6A55B0` / `#EEEAF7` / `#F7F5FC` / `#CDC3EC` | `#9C8BE0` / `#231E3A` / `#1C1930` / `#463D74` | not built yet, logic TBD |
| `--key` / `-soft` / `-line` | `#7A4E9C` / `#F2EAF6` / `#DCC6E6` | `#C08AD9` / `#2E1D36` / `#573A66` | key / certified objects |
| `--game` / `-soft` / `-line` | `#CB5A17` / `#FBECE1` / `#EFC6A8` | `#EE8443` / `#3A2213` / `#6E3D1E` | game layer |
| `--lv0` … `--lv4` | `#B6C0C5` `#AD6E38` `#8796A0` `#BF9629` `#3C8C7A` | `#4D5B63` `#C98650` `#9AA8B2` `#D9B044` `#55AE98` | AI-Ready level L0–L4 fill |
| `--lvN-ink` | `#5C6C75` `#7F4F22` `#4C5B65` `#7A600F` `#276656` | `#A2B1B9` `#E0A574` `#BAC6CE` `#E8C766` `#7FCCB7` | level text |
| `--lvN-soft` | `#ECF0F2` `#F4E8DC` `#E7ECEF` `#F5EDCF` `#DFF0EA` | `#22303A` `#3A2818` `#27313A` `#3A3112` `#15352D` | level chip background |
| `--s1` … `--s8` | `#0A7684` `#D08A1E` `#8C5BA8` `#4E9A68` `#C0563F` `#4F79A6` `#8B8737` `#6E808A` | `#3BB0BC` `#E3A03E` `#B48ACF` `#6DBA86` `#E07A62` `#7FA6D1` `#B8B25A` `#93A5AF` | categorical chart series, in order |
| `--rel-self` / `--rel-sup` / `--rel-con` / `--rel-both` | accent / `#4F79A6` / `#B04E8C` / `#6A55B0` | accent / `#7FA6D1` / `#D47AB3` / `#9C8BE0` | domain relations: selected, supplier, consumer, both |
| `--glass` / `--glass-strong` | `rgba(255,255,255,.9)` / `.96` | `rgba(21,31,37,.9)` / `.96` | floating panels over canvas |
| `--scrim` | `rgba(19,33,42,.2)` | `rgba(0,0,0,.45)` | modal backdrop |
| `--halo` | `#FFFFFF` | `#151F25` | text halo / stroke around chart and 3D labels |
| `--scene-bg` | `#DCE6EA` | `#0F1A20` | 3D scene clear color / sky |
| `--shadow-rgb` | `19,33,42` | `0,0,0` | build custom shadows: `rgba(var(--shadow-rgb),.12)` |
| `--sh-1` `--sh-2` `--sh-3` `--sh-side` | small / card / popover / drawer | stronger alphas | shadows |
| `--font-ui` | `"Source Sans 3", "Segoe UI", system-ui, …` | same | all UI text |
| `--font-mono` | `"JetBrains Mono", ui-monospace, …` | same | code, numeric table columns |
| `--r-xs` `--r-sm` `--r-md` `--r-lg` `--r-xl` `--r-pill` | 4 / 6 / 8 / 12 / 14 / 999 px | same | radii |

Compatibility aliases kept in `portal.css` for existing class rules and JS templates: `--card` (= `--surface`), `--okL`, `--warnL`, `--badL`, `--accentL`, `--chipbg`, `--purple`, `--purpleL`, `--gameL`. New code should use the token names above.

## How to use in JS

Read tokens at runtime; do not hard-code hex values:

```js
const css = getComputedStyle(document.documentElement);
const tok = name => css.getPropertyValue(name).trim();
const COL = { ok: tok('--ok'), warn: tok('--warn'), bad: tok('--bad'), grey: tok('--grey') };
scene.background = new THREE.Color(tok('--scene-bg'));
// re-read on theme change
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rebuildColors);
```

In HTML strings built by JS, prefer `style="color:var(--bad)"` over a computed hex, so the theme switches without re-render.

Variables JS should read, by purpose:

- Health / status: `--ok`, `--warn`, `--bad`, `--grey`, `--bad-track` (unhealthy share in meters), soft fills `--ok-soft`, `--warn-soft`, `--bad-soft`.
- Text and lines on canvas or SVG: `--ink`, `--ink2`, `--ink3`, `--line`, `--line-strong`, `--halo` (label stroke / text-shadow), `--surface` (label background), `--glass`.
- Selection and focus: `--accent`, `--accent-hover`, `--accent-soft`, `--accent-line`, `--on-accent`.
- AI-Ready levels (roofs, ladders, chips): `--lv0` … `--lv4`, `--lv1-ink` … `--lv4-ink`, `--lv1-soft` … `--lv4-soft`.
- Chart series (categorical): `--s1` … `--s8`.
- Domain relations (world, graph): `--rel-self`, `--rel-sup`, `--rel-con`, `--rel-both`.
- Badges: `--info*` (example / demo), `--wip*` (not built yet), `--key*` (key / certified), `--game*` (game layer).
- 3D scenes: `--scene-bg` (clear color, sky, fog base), `--bg` (flat page-colored scenes), `--shadow-rgb`.
- Fonts in injected CSS: `--font-ui`, `--font-mono`.
