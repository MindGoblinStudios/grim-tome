# Town Notice Board (Sponsorships) — 2026-08-26

Sponsorship notice-board image for the Pay Tribute section of the README, paired with an ASCII twin of the board so agents can read the posters too.

- Model: `google/gemini-3.1-flash-image` (Nano Banana) via OpenRouter (`skills/dev/minion/scripts/openrouter_media.py`)
- Aspect ratio: 3:2 landscape
- Output: `images/tribute/notice-board.jpg` (JPEG q90)

## Prompt

A medieval town notice board, hand-painted fantasy illustration in a warm painterly style. A weathered dark-wood post-and-plank message board standing outdoors, the kind where townsfolk nail up wanted posters and guild notices. The board is MOSTLY EMPTY, with plenty of open cork-and-wood space. Pinned in the center is one large aged parchment poster with hand-lettered text reading 'YOUR AD HERE' in bold medieval lettering. Around the edges just a few small thematic scraps: one tiny torn wanted-style poster stub, a small notice with an illegible wax seal, a couple of rusty nails and empty pin holes, a torn corner of an old poster left under a nail. A sprig of ivy on one post, a small lantern hanging from the top beam, dusk light. Cozy fantasy village atmosphere, muted parchment and umber palette with warm lantern glow. The only readable text anywhere is 'YOUR AD HERE'. No people. 3:2 landscape.

## Night zoom edit (2026-08-27)

Edit pass on the image above, same model and pipeline, using the previous render as the reference image:

Edit this image. Zoom in on the notice board so it fills most of the frame: crop away the empty sky and street edges on the left and right, keeping the full board, its two support posts, the hanging lantern, and the ivy sprig visible. Change the time of day to night: dark blue-black night sky, the scene lit mainly by the warm glow of the hanging lantern, deep shadows, moonlit rim light on the board edges. Keep the exact same painterly hand-painted fantasy style, the same posters and parchment scraps, and the same readable text 'YOUR AD HERE' on the central poster. No people. No other readable text. 3:2 landscape.

## Sample posters (2026-08-27)

Three sample sponsor posters at increasing sizes, same model and pipeline, each using the night notice board as the reference image. Outputs: `images/tribute/poster-small.jpg`, `poster-medium.jpg`, `poster-large.jpg`. (After a size recalibration, the bakery handbill is the small tier, the potion-shop poster is medium, and the blacksmith poster is large; a full-board airship poster was generated and retired as too large.)

Small (Ovensong Bakery): Using this nighttime medieval notice board scene as the style and setting reference: a wide view of the dark wooden notice board at night, lit by warm lantern glow, the board mostly EMPTY dark wood. Pinned in one corner is one TINY parchment notice, very small, like a modest calling card or handbill, almost lost on the big empty board. The tiny poster is a simple hand-painted advertisement for a fictional bakery: a little painted loaf of bread and the small hand-lettered words 'OVENSONG BAKERY'. One iron nail, slightly crooked, humble and charming. A couple of empty nail holes elsewhere on the board. Same painterly hand-painted fantasy style. The only readable text is 'OVENSONG BAKERY'. No people. 3:2 landscape.

Medium (Moonbrew Potions): Using this nighttime medieval notice board scene as the style and setting reference: a close-up of one section of the dark wooden notice board at night, lit by warm lantern glow. Pinned to the board is a SMALL modest parchment poster, roughly the size of a hand, surrounded by lots of empty dark wood. The poster is a charming hand-painted advertisement for a fictional potion shop: a little painted potion bottle and the hand-lettered words 'MOONBREW POTIONS'. The poster looks humble but lovingly made, slightly curled corner, one iron nail. Same painterly hand-painted fantasy style. The only readable text is 'MOONBREW POTIONS'. No people. 3:2 landscape.

Large (Emberforge Smithy): Using this nighttime medieval notice board scene as the style and setting reference: a close-up of the dark wooden notice board at night, lit by warm lantern glow. Pinned to the board is a MEDIUM parchment poster taking up about a third of the visible board, a handsome hand-painted advertisement for a fictional blacksmith: a painted anvil and hammer with sparks, and the hand-lettered words 'EMBERFORGE SMITHY'. Decorative painted border on the poster, four iron nails, nicely made. A couple of small scraps pinned nearby for scale. Same painterly hand-painted fantasy style. The only readable text is 'EMBERFORGE SMITHY'. No people. 3:2 landscape.

## Build-a-Wizard Workshop (2026-08-27)

Grimoire animating a Frankenstein-style construct, for the Build-a-Wizard Workshop sponsorship tier. Reference image: the Grimoire icon (`skills/council/members/grimoire-code-wizard/assets/grimoire-code-wizard-icon-large.png`). Output: `images/tribute/build-a-wizard.jpg`.

First pass (retired, patchwork golem): Using this wizard's appearance as the character reference: a hand-painted fantasy illustration of the wizard in his cluttered arcane workshop at night, building a Frankenstein-style construct. The wizard stands at a heavy wooden workbench, sleeves rolled, wand raised, arcs of blue-white lightning crackling from his hand down into a large patchwork golem lying on a stone slab: a stitched-together creature with mismatched limbs, bolts at the neck, one boot on, chest glowing with runes as it comes to life. Around them: bubbling potion flasks, tangled copper coils, floating spellbooks, scattered tools, candles. Dramatic lightning and warm candlelight, painterly storybook style matching the reference. The creature looks goofy and endearing, not scary. No readable text. 3:2 landscape.

Final (futuristic android, gothic workshop): Using this wizard's appearance as the character reference: a hand-painted gothic fantasy illustration of the wizard in his dark arcane workshop at night, bringing a robot to life Frankenstein-style. The wizard stands over a heavy stone slab, sleeves rolled, wand raised, arcs of blue-white lightning crackling from his wand down into a sleek FUTURISTIC humanoid robot lying on the slab: smooth white-and-dark-graphite android body panels, minimal elegant design, glowing chest core and eyes flickering on as it awakens, faint glowing runes etched along its plating where magic meets machine. The workshop is spooky, gothic and macabre: stone arches, cobwebs, guttering candles, bubbling green potion flasks, copper coils, chained spellbooks, a raven perched on a shelf, moonlight through a tall arched window. Dramatic chiaroscuro lighting, storm outside. Painterly storybook style matching the reference. No readable text. 3:2 landscape.

## Tip jar refresh (2026-08-27)

Edit pass on `images/tribute/tip-jar.jpg`, same model and pipeline, using the previous tip jar icon as the reference image:

Edit this image. Keep the exact same glass tip jar with coins inside, same painterly style, same dark background, and same framing. Remove the cork lid entirely, leaving the jar open at the top. Add a small white rectangular paper label attached to the front of the jar with the word 'TIPS' hand-written in black text. The label is clean white with slightly torn or taped edges, charming and handmade. No other readable text. Keep everything else identical.
