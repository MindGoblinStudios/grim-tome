---
name: grim:dev:design:layout-previews
description: "Show compact visual alternatives for spatial design choices, using aligned text mockups in the current host's supported preview surface or inline. Use for layouts, UI placement, diagrams, and code structure where arrangement matters."
---
# Layout Previews

Turn a spatial design decision into a **side-by-side visual choice** with aligned ASCII or box-drawing mockups.

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

- If the current question tool exposes a preview field, use that field according to its actual schema.
- Otherwise show labeled mockups inline in fenced text blocks, then use the available question mechanism to collect the choice.
- Use only tool fields and rendering features exposed by the current host. The visual comparison must still work without a preview-capable question tool.
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

Three alternatives for an in-match HUD. Show the frames inline or in supported option previews.

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
- The host supports the chosen presentation and question format. ✅
- Every option has a visible mockup. ✅
- Columns and box edges are aligned across all options. ✅
- Each mockup is compact, labeled, and legible in monospace. ✅

---

## References

- Box-drawing characters: https://en.wikipedia.org/wiki/Box-drawing_characters
