# How To Use Websites

The execution contract for operating websites through browser automation. One doc per recurring or sensitive site; agents read this file, then the site's doc, then act.

### Read Order
1. Read this file.
2. Read the relevant website-specific doc when one exists.
3. Only then operate the website.

### Rules
- If a site doc exists, follow it. If not, operate carefully from live page evidence — and create a doc afterward if the workflow will recur.
- Never mutate accounts, billing, production data, or public content unless explicitly asked.
- For admin, finance, or publishing sites: confirm the plan in chat first, prefer read-only inspection, and gather evidence before clicking destructive or submit controls.
- After edits, verify from page state (URL, visible text, screenshot) and report what changed.
- Never save secrets in these docs.

### Website Docs
<!-- One line per site doc as you add them:
- `website-<slug>.md` — what it covers
-->

### Website Doc Shape
```markdown
# <Website Name>

### Purpose
### URL And Auth
### Common Workflows
### Write Guardrails
### Verification
### Gotchas
```
