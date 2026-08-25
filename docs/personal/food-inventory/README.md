# Food Inventory

What's in the kitchen. Agents check here before writing grocery lists or meal plans.

- `grocery-list.md` — the ongoing list for the next shop
- `pantry.md` · `fridge.md` · `freezer.md` — stored food
- `spice-rack.md` — seasonings, oils, sauces
- `kitchen-equipment.md` — appliances & cookware

Keep entries honest: update after shopping and after cooking.

## Source of Truth

- `grocery-list.md` owns requested items until they are received or removed.
- `pantry.md`, `fridge.md`, `freezer.md`, and `spice-rack.md` own what is currently on hand.
- `active-meal-plan.md` owns intended meals, not inventory quantities.
- `docs/personal/recipes/` owns recipes and their cooking notes.
- `kitchen-equipment.md` owns the tools and capacities recipes may assume.

## Update Workflow

When groceries are received:
1. Remove each received item from `grocery-list.md`.
2. Add it to the correct inventory file.
3. Record quantity, acquired/opened date, and printed date when known.
4. Give perishable or easily forgotten food a practical review date.

When food is used:
1. Reduce the quantity or portions.
2. When the last portion is eaten, record it under `Recently Finished or Discarded`.
3. If it was discarded, record why so the next grocery quantity or meal timing improves.

## Shelf-Life Rules

- Printed package dates and storage instructions win.
- Shelf-life ranges are planning estimates, not food-safety guarantees.
- Record whether food is unopened, opened, cooked, or frozen.
- If storage history is uncertain, choose safety over reducing waste.

## Priority Labels

- `Use now`: eat or cook next.
- `Use this week`: give it a named meal or snack slot.
- `Stable`: no immediate action.
- `Unknown`: confirm the important detail during the next relevant check.

## Review Rhythm

- Before groceries: scan fridge, then freezer, then pantry.
- After groceries arrive: move received items into inventory.
- Before a new recipe: check ingredients, spices, and equipment.
- Keep only a short recent history of finished/discarded items.
