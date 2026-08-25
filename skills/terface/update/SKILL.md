---
name: grim:terface:update
description: "Check whether the local Grimoire's Tome checkout is behind upstream, summarize what's new from patchNotes.md, and update safely with non-destructive git. Manual invocation only."
disable-model-invocation: true
---
# Grimterface: Update

Check whether the local copy of Grimoire's Tome is current, show the user what's new, and update safely.

## Workflow

1. From the Tome checkout, inspect state without changing anything:
   - `git remote -v` and `git fetch` to see upstream.
   - `git status` and `git log HEAD..@{u} --oneline` to see how far behind the checkout is and whether there are local changes.
2. Read `patchNotes.md` (upstream version if behind) and summarize what's new since the user's version in a few lines.
3. Ask whether the user wants to update. If yes:
   - Clean checkout, no local changes → `git pull --ff-only`.
   - Local changes present → explain them first; offer to stash or branch. Never discard user edits.
4. After updating, call out anything that needs a follow-up: new skills to expose, changed `AGENTS.md` conventions, new council members, or migration notes in `patchNotes.md`.
5. If skills are symlinked into a harness folder, new skills are picked up by adding new symlinks — offer to add them for skills the user wants.

## Rules

- Non-destructive git only: no `reset --hard`, no `checkout --force`, no deleting local branches or edits.
- If fast-forward is impossible, explain why and present options; do not resolve conflicts unprompted.
- Respect local mutations: users are encouraged to customize skills, so treat their diffs as intentional.
