---
name: grim:dev:model-quirks
description: "(grim:dev:model-quirks): (Model Quirks): Apply model-specific prompt mitigations inline (unlabeled) into AGENTS.md, skills, and prompts, and record every applied change in the reverse-index ledger at docs/model-quirks-ledger.yaml so it can be verified, pruned, or undone when models rotate."
disable-model-invocation: true
---
# Model Quirks

Use this skill when a task is about model-specific instructions, prompt quirks, undoing or pruning old model mitigations, or keeping prompts aligned with the currently used model roster.

## The System

Every new model does something weird. Mitigations for those quirks are real prompt text — but they should not outlive the model that needed them.

- **Applied text lives inline.** Mitigations are written directly into `AGENTS.md`, skill files, or whatever prompt they belong in, phrased as normal house rules. No model names, no marker comments, no labeled section. The prompt surface reads as one coherent voice.
- **The ledger is the reverse index.** `docs/model-quirks-ledger.yaml` records, per model, the exact text of every applied change and its target file. The exact recorded text is the undo key — never rely on line numbers, which rot.
- **Applying and recording are one atomic change.** Never add quirk text to a prompt without its ledger entry, and never add a ledger entry without applying the text. Same commit, always.

## Ledger Format

One entry per applied change, under a top-level `entries:` list. Single model id per entry, no aliases. Active and retired entries live in the same file.

```yaml
entries:
  - id: mq-2026-08-22-01
    model: gpt-5.4
    status: active            # active | retired
    applied: 2026-08-22
    target: AGENTS.md
    kind: insert              # insert | edit
    anchor: "## Conventions"  # nearest heading, for locating it
    text: |                   # the exact text as it appears in the file
      Keep progress updates compact and factual.
    before: null              # for kind: edit, the original text
    reason: "5.4 narrates every tool call"
```

Entry rules:
- `text` holds the exact applied text, verbatim — this is the undo key.
- For `kind: edit`, `before` holds the original text; undo restores it.
- `anchor` is a courtesy hint (nearest heading), never the undo key.
- Retired entries keep all fields, flip `status: retired`, and add `retired: YYYY-MM-DD`.
- Keep `reason` short; it's the symptom you were mitigating.

## Workflow

### Applying a mitigation
1. Confirm the quirk is a real recurring default worth overriding, not a one-off.
2. Write the mitigation inline in the smallest right prompt surface, phrased as a normal unlabeled rule in the file's own voice.
3. Add the ledger entry (id, model, target, kind, anchor, exact text, reason) in the same change.

### Retiring a model
1. For each of the model's active entries, find the entry's `text` in its target file and remove it (or restore `before` for edits).
2. If another active model needs the same rule, reassign the entry's `model` instead of deleting the text.
3. Flip each entry to `status: retired` and add `retired: YYYY-MM-DD`. Retired entries are the archive — future models often revive old quirks, so shop them by `reason` before writing new mitigations.

### Verifying (drift check)
Periodically, or before retiring: confirm each active entry's `text` still exists verbatim in its target file. If a mitigation was edited in place, update the entry to match or convert it to `kind: edit` with the right `before`.

## Required Behavior

- No model names or quirk labels in the applied prompt text — the ledger is the only place model attribution lives.
- Exact quoted text is the undo key. Update the ledger whenever applied text is reworded.
- Keep mitigations short, specific, and focused on real default behaviors worth overriding.
- Prefer concrete model quirks over generic writing advice.
