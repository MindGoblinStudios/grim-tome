# Recipes

The recipe index. One file per recipe in this folder; track status here.

## Status System

- `To Try`: saved, not cooked yet.
- `Testing`: cooked, but still needs adjustment.
- `Favorite`: proven enjoyable and worth repeating.
- `Archive`: tried and not worth keeping in active rotation.

Do not promote a recipe to `Favorite` until it has been cooked and the user wants it back.

## Recipe Index

| Recipe | Status | Active Time | Total Time | Protein Anchor | Last Cooked | Rating |
| --- | --- | ---: | ---: | --- | --- | --- |

## Favorites
<!-- Confirmed keepers -->

## Tested
<!-- Made it, has notes -->

## To Try
<!-- Queued -->

## Recipe File Shape

Each recipe file should include:
- status and source
- servings
- required ingredients and equipment
- active prep time, appliance/cook time, and total elapsed time
- exact method
- useful substitutions
- rough macros when helpful
- dated cooking notes: result, rating, and what to change next time

Before scheduling or cooking a recipe, check:
- `docs/personal/food-inventory/kitchen-equipment.md`
- `docs/personal/food-inventory/spice-rack.md`
- the pantry, fridge, and freezer

## Cooking Mode

- Start with mise en place and name anything that must thaw, preheat, rest, or cook first.
- Give one clear action at a time.
- Use fresh durations for each timer; include a finish clock time only when the user gives a start time.
- If the real cooking order changes, give rescue instructions from the current state.
- After the meal, append the useful result and next adjustment to the recipe.

## Rotation Rule

- Try at most one genuinely new recipe per week unless the user asks for an experiment.
- Keep ordinary low-capacity meals simpler than a dedicated cooking night.
- Improve an existing recipe's cooking notes instead of creating duplicate versions.
