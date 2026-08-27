# Nightly Sync

Roger Roger's repo sync routine. Safely reconcile a shared Git repository across agents by syncing the remote, committing and pushing low-risk work, and escalating ambiguous or high-risk changes. Use only when the user or a scheduled automation explicitly requests a repo sync.

Keep a shared agent repository current without treating a dirty tree as blanket permission to commit everything.

## Runtime

- Run on any persistent computer with the repository, Git credentials, and required agent tools.
- A locally scheduled task needs that machine awake with its harness running.
- A remote runner (a cloud agent or hosted computer) runs independently and does not require your machine to be on.

## Sync Routine

1. Read the repository instructions and commit-hygiene rules.
2. Inspect the branch, staged and unstaged changes, active Git operations, and remote relationship.
3. Fetch the remote. Fast-forward when safe; do not silently rebase, stash, reset, resolve conflicts, or rewrite history.
4. Classify every change:
   - `auto-sync`: coherent, low-risk, understood, and validated;
   - `approval`: large, sensitive, mixed, destructive, or uncertain;
   - `local-only`: generated output, caches, review media, and scratch files;
   - `blocked`: conflicts, active Git operations, staged user work, or failed validation.
5. Group `auto-sync` changes into focused commits, validate each group, and push normally.
6. Leave every other bucket untouched and return a compact approval or blocker packet.

## Decision Rules

AutoDocs surfaces are the default auto-sync lane:
- `AGENTS.md`
- canonical docs and memory
- skill instructions, references, registry entries, and skill metadata

Small code or configuration changes may auto-sync only when their intent is clear, they are reversible, and relevant checks pass.

Require approval for:
- secrets, auth, security, payments, production data, deploys, releases, migrations, dependencies, or CI;
- large or mixed code changes;
- deletions, renames, or unapproved binaries and media;
- changes with unclear ownership or intent;
- changes that lack meaningful validation.

Never commit `output/`, `tmp/`, generated workbench media, or unrelated staged work. Do not hide those files to make the tree look clean.

## Git Safety

- Work only on the intended branch and remote.
- Use focused commits; do not create a single miscellaneous nightly dump.
- Push only commits created or explicitly approved by this sync run.
- Never force-push.
- On divergence, overlap, or push rejection, stop and report the smallest next action.

## Report

Return:
- remote sync result;
- commits pushed;
- approval items;
- local-only items;
- blockers and next action.

Keep it short. If nothing needs attention: `Queue cleaned.`
