---
name: grim:dev:design:layout-previews
description: "Compare spatial and visual design choices with aligned ASCII or box-drawing layout mockups in AskUserQuestion option preview fields, so the user can pick from rendered options instead of abstract labels. Use for UI and HUD layouts, screen arrangements, component placement, diagram variants, or config and code snippets where shape matters; do not use for simple preference questions."
---
# Layout Previews

Turn a spatial design decision into a **side-by-side visual choice** by drawing each option as an aligned ASCII / box-drawing mockup inside the `AskUserQuestion` option `preview` field.

A label like "Info-rich HUD" tells the user almost nothing. A tiny rendered frame tells them everything. When the choice is about *where things go*, show it.

---

## When To Use

Use it when the decision involves a concrete **spatial or visual artifact** the user benefits from seeing:
- UI / HUD layouts, screen arrangements, panel or component placement
- Navigation / information hierarchy variants
- Diagram or architecture-shape variations
- Config or code-snippet structure choices where shape matters

Do NOT use it for:
- Simple preference questions where the label already says it all ("Dark or light mode?", "Ship now or after tests?")
- Non-visual tradeoffs (naming, yes/no, scope) — plain options are clearer there.

---

## How It Works

- Put the mockup in each option's `preview` field.
- **Single-select only.** With previews on a single-select question, the UI switches to a side-by-side layout: option list on one side, the highlighted option's `preview` on the other. Multi-select does not render previews this way.
- Multi-line text is supported. Use it.
- Keep each mockup compact and legible inside a monospace box — a few rows, not a full screen.

---

## Mockup Craft

- **Align every column.** Misaligned box edges read as broken, not as a layout. Count characters; pad with spaces.
- Use box-drawing + glyph chars to imply real UI:
  - frames / panels: `┌ ┐ └ ┘ │ ─ ├ ┤ ┬ ┴ ┼`
  - heavy / emphasis frames: `╔ ╗ ╚ ╝ ║ ═ ╟ ╢ ╠ ╣`
  - brackets / chips / slots: `⟦ ⟧ [ ] ◈ ▰ ▱`
  - bars / fills / accents: `█ ▓ ▒ ░ ▮ ▯ ★ ☆ ◆ ●`
- Label regions with short text so the structure is unambiguous (`HP`, `MENU`, `MAP`, `★3`).
- One clear idea per mockup. The differences between options should be visible at a glance.
- Make the same elements appear in roughly the same place across options so the user is comparing *arrangement*, not hunting for what moved.

---

## Canonical Example — In-Match HUD

Three single-select options for an in-match HUD, each with an ASCII frame in its `preview`. Copy this shape.

**Option A — Minimal**
```
┌──────────────────────────────┐
│                              │
│                              │
│           [ARENA]            │
│                              │
│                              │
│ ❤30                    ⏱1:24 │
└──────────────────────────────┘
```

**Option B — Info-rich**
```
┌────────────┬───────────────┐
│ UNITS      │    [ARENA]     │
│ ▰ Knight   │                │
│ ▰ Archer   │                │
│ ▱ Mage     │                │
├────────────┤  ❤30   ⚔12     │
│ ⛁ Gold 8   │  ⏱1:24  ★3     │
└────────────┴───────────────┘
```

**Option C — Thematic frame**
```
╔══════════════════════════════╗
║   ◈  ~ THE WARFRONT ~  ◈      ║
╟──────────────────────────────╢
║                              ║
║           [ARENA]            ║
║                              ║
╟───────────❤30────⏱1:24───────╢
╚══════════════════════════════╝
```

Each frame is the same width, columns line up, and the three layout philosophies (sparse / dense-sidebar / framed-thematic) are obvious side by side.

---

## Checklist

- Choice is spatial/visual, not a plain preference. ✅
- Question is **single-select**. ✅
- Every option has a `preview` mockup. ✅
- Columns and box edges are aligned across all options. ✅
- Each mockup is compact, labeled, and legible in monospace. ✅

---

## References

- AskUserQuestion previews (Codex): https://developers.openai.com/codex/skills
- Box-drawing characters: https://en.wikipedia.org/wiki/Box-drawing_characters
