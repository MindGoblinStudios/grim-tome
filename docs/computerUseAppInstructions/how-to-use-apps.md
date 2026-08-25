# How To Use Apps

The execution contract for operating local apps through computer use. One doc per app; agents read this file, then the app's doc, then act.

### Read Order
1. Read this file.
2. Read the relevant app-specific doc.
3. Only then operate the app.

### Rules
- Plan in chat before writing into an app; don't write speculative tasks or schedules.
- After edits, verify by inspecting the updated app state — never assume.
- Close apps after read/lookup tasks; leave them open if the user is working in them.
- Keep edits minimal and scoped to the request. Don't touch unrelated or sensitive content.

### App Docs
<!-- One line per app doc as you add them:
- `app-<name>.md` — what it covers
-->

### App Doc Shape
```markdown
# <App Name>

### Purpose
### Default Surface
### Read And Write Rules
### Common Workflows
### Guardrails
### Verification
```
