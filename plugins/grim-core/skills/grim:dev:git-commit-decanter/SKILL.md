---
name: grim:dev:git-commit-decanter
description: "(grim:dev:git-commit-decanter): (Git Commit Decanter): Use this for most commit planning, hunk staging, cleanup, and history-shaping git workflows. Do not auto-route simple read-only status/log/diff checks unless commit chunking or history surgery is actually in scope."
---
# Git Commit Decanter

Decant one monster diff into clean, settled chunks.

Grim workflow layer on top of [git-surgeon](https://github.com/raine/git-surgeon): non-interactive hunk-level git operations for precise staging, splitting, and history shaping.

Upstream CLI: `git-surgeon` (currently tested against `0.1.17+`).

## Invocation Scope

Use this skill for most git workflows that involve:
- planning commits
- staging or splitting hunks
- cleaning up a dirty tree
- amending, folding, squashing, reordering, or otherwise shaping history
- preparing a reviewable commit stack

Do not invoke it for simple read-only `git status`, `git log`, `git show`, or `git diff` checks unless the user is asking about commit structure, cleanup, or history work.

## Default Workflow (Plan First, Then Commit After Approval)

Default behavior when the user invokes this skill:
- inspect the current branch's uncommitted changes
- split them into a proposed stack of small, easily reviewable commits
- present a numbered commit list for user approval
- only execute the plan after the user approves it

Do not silently commit immediately after creating the plan unless the user explicitly pre-approves that behavior in the request.

Target commit count: default to between 3 and 20 commits.

- If the first pass produces fewer than 3 commits, look again for valid separations such as setup, behavior, refactor, tests, docs, tooling, or follow-up cleanup.
- Do not create fake or noisy commits just to hit the floor; if the diff is genuinely too small to support 3 meaningful commits, say so explicitly and use the smallest sensible number.
- If the first pass produces more than 20 commits, recombine adjacent micro-commits until each remaining commit still tells one clear story.

Workflow:

1. Identify branch + working state:
   - `git rev-parse --abbrev-ref HEAD`
   - `git status --porcelain`
2. List change hunks (IDs + previews):
   - `git-surgeon hunks` (unstaged)
   - `git-surgeon hunks --staged` (staged, if any)
   - use `git-surgeon hunks --blame` when deciding which earlier commit new lines belong with
3. Create a numbered commit plan:
   - Group hunks into small commits by intent (feature, fix, refactor, docs, tooling).
   - Keep commits tight and reviewable. If one hunk mixes concerns, split it with `--lines`.
   - Aim for 3 to 20 commits overall unless the change set is truly smaller.
   - Present the plan as a numbered list before committing.
   - For each planned commit, include:
     - proposed commit subject
     - relevant files or hunk IDs
     - brief reason this commit is separate
4. Ask for approval:
   - Ask the user to approve the numbered list before executing it.
   - If the user requests changes, revise the numbered list and ask again.
   - Ask for approval before merging, squashing, recombining, or otherwise changing planned commits into a different stack.
5. Execute the approved plan:
   - Use `git-surgeon commit <id...> -m "message"` for each chunk.
   - Repeat until `git-surgeon hunks` is empty.
6. If you need to adjust after the fact:
   - Add missed hunks to an earlier commit: stage them and use `git-surgeon amend <commit>`.
   - Fold a finished commit into an earlier one: `git-surgeon fold <target>` or `git-surgeon fold <target> --from <commit>`.
   - If a commit is too large or mixed, use `git-surgeon split <sha> ...` (see Split Workflow below).
   - Reorder commits after splitting: `git-surgeon move <sha> --after <target>`.

### Chunking Rules (Make Review Easy)
- One concept per commit (avoid mixing refactor + behavior + docs unless the change is inseparable).
- Separate mechanical changes (renames/formatting) from behavioral changes.
- Keep tests with the code they validate, and use test-first sequencing when the user explicitly asks for it.
- Prefer smaller commits: if a diff hunk is a “bundle,” split it by line ranges.
- Default target is 3-20 commits for a meaningful working set; push upward when a larger diff contains multiple separable ideas.
- Build a narrative across commit messages: each commit should advance a clear story (`setup -> core behavior -> UX polish -> tests/docs`) and the body should briefly explain why this step exists before the next one.
- Across all projects, never commit files under `output/` or `tmp/` unless the user explicitly promotes them into the actual project. Do not hide those paths with `.gitignore` or `.git/info/exclude`; the visible `git status` signal is intentional.

### Safety Rules
- Never push without explicit user request.
- Do not create the default commit stack until the user approves the numbered commit plan.
- Ask for approval before merging, squashing, recombining, or otherwise changing planned commits.
- Confirm before rewriting history on shared branches (especially `split`, `fold`, `amend`, `squash`, `move`, or anything that implies force-push).

## Commands

```bash
# List hunks
git-surgeon hunks                          # unstaged (ID, file, +/- counts, preview)
git-surgeon hunks --staged                 # staged
git-surgeon hunks --file=src/main.rs       # filter by file
git-surgeon hunks --commit <HEAD/sha>      # from specific commit
git-surgeon hunks --commit <sha> --full    # with line numbers (for line-range splits)
git-surgeon hunks --blame                  # show introducing commit per line

# Show full diff for hunk (lines numbered for --lines)
git-surgeon show <id>
git-surgeon show <id> --commit HEAD

# Stage
git-surgeon stage <id1> <id2> ...
git-surgeon stage <id> --lines 5-30

# Stage + commit in one step
git-surgeon commit <id1> <id2> ... -m "message"
git-surgeon commit <id>:1-11 <id2> -m "message"   # inline line ranges

# Commit hunks directly to another branch (no checkout)
git-surgeon commit-to <branch> <id1> <id2> ... -m "message"

# Unstage
git-surgeon unstage <id1> <id2> ...
git-surgeon unstage <id> --lines 5-30

# Discard working tree changes
git-surgeon discard <id1> <id2> ...
git-surgeon discard <id> --lines 5-30

# Fold staged changes into an earlier commit
git-surgeon amend <commit>

# Fold existing commit(s) into an earlier commit
git-surgeon fold <target>
git-surgeon fold <target> --from <commit>
git-surgeon fold <target> --from <commit1> <commit2>

# Reword commit message
git-surgeon reword HEAD -m "new message"
git-surgeon reword <commit> -m "new message"
git-surgeon reword HEAD -m "subject" -m "body"

# Squash commits from target through HEAD into one
git-surgeon squash HEAD~2 -m "combined feature"
git-surgeon squash <commit> --force -m "squash with merges"

# Undo hunks from commit (reverse-apply → working tree)
git-surgeon undo <id1> <id2> ... --from <commit>
git-surgeon undo <id> --from <commit> --lines 2-10

# Undo entire files from commit
git-surgeon undo-file <file1> <file2> ... --from <commit>

# Reorder commits
git-surgeon move <sha> --after <target-sha>
git-surgeon move <sha> --before <target-sha>
git-surgeon move <sha> --to-end

# Split commit by hunk selection
git-surgeon split HEAD \
  --pick <id1> <id2> -m "first commit" \
  --rest-message "remaining changes"

# Split with subject + body
git-surgeon split HEAD \
  --pick <id1> -m "Add feature" -m "Detailed description." \
  --rest-message "Other changes" --rest-message "Body for rest."

# Split with line ranges (comma for non-contiguous)
git-surgeon split <commit> \
  --pick <id>:1-11,20-30 <id2> -m "partial split"

# Split into 3+ commits
git-surgeon split HEAD \
  --pick <id1> -m "first" \
  --pick <id2> -m "second" \
  --rest-message "rest"

# Upgrade git-surgeon itself
git-surgeon update
```

## Picking the Right Folding Command

| You have... | Use |
| --- | --- |
| Staged changes | `git-surgeon amend <commit>` |
| One existing commit, defaulting to HEAD | `git-surgeon fold <target>` |
| One or more named commits | `git-surgeon fold <target> --from <commit...>` |

## Typical Workflow

1. `git-surgeon hunks` → list hunks with IDs
2. `git-surgeon show <id>` → inspect (lines numbered)
3. `git-surgeon commit <id1> <id2> -m "message"` (or stage separately → `git commit`)
4. Partial hunk: `git-surgeon commit <id>:5-30 -m "message"`

## Amend Workflow

1. `git-surgeon stage <id1> <id2>`
2. `git-surgeon amend <commit-sha>` (HEAD → amend; older → autosquash rebase)
3. Unstaged changes preserved

## Undo Workflow

1. `git-surgeon hunks --commit <sha>`
2. `git-surgeon undo <id> --from <sha>` or `git-surgeon undo-file src/main.rs --from <sha>`
3. Changes appear as unstaged modifications

## Split Workflow

1. `git-surgeon hunks --commit <sha>` (use `--full` for line numbers)
2. `git-surgeon split <sha> --pick <id1> -m "first" --rest-message "second"`
3. Multiple `-m` flags → subject + body
4. `id:range` for partial hunks; commas for non-contiguous: `--pick <id>:2-6,34-37`
5. HEAD → direct reset; older → rebase. Requires clean working tree.

## Hunk IDs

- 7-char hex from file path + hunk content
- Stable while diff unchanged; duplicates get `-2`, `-3` suffixes
- ID not found → re-run `hunks` for fresh IDs

## Install

If `git-surgeon` is not installed, install from [raine/git-surgeon](https://github.com/raine/git-surgeon):

```bash
brew install raine/git-surgeon/git-surgeon
```

Upgrade:

```bash
brew upgrade git-surgeon
# or
git-surgeon update
```

## Safety

- Commands like `discard`, `amend`, `fold`, `split`, `squash`, and `move` can rewrite history or delete changes. Confirm with the user before rewriting history on shared branches or before force-pushing.
