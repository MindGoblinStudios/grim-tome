# Council & Council-of-Six Icons: Zoom + Edge Frame Rework

Both council icons were regenerated to be more readable at small sizes and to push the gold frame to the outer edge.

Edit prompt (applied to each prior icon as reference):

Rework this dark-fantasy game-inventory app icon. Two changes: 1) Remove the black padding around the outside; the thin gold hairline rounded-square frame must sit at the very outer edge of the image, artwork filling everything inside it. 2) Zoom the camera in noticeably closer on the ancient round table and its hooded robed council members, so the figures are much larger, clearer, and easier to read at small sizes. Crop away most of the ceiling and edges of the room; keep a hint of candle-lit stone walls and arched windows behind them. Keep the same scene, hand-painted style, palette, cinematic ominous mood. No text, no watermark.

For the six-member variant the prompt specified EXACTLY SIX hooded figures evenly spaced around the glowing six-pointed sigil.

The model kept some outer black padding, so a post-pass detected the gold frame bounding box and cropped to it (2px pad), then exported 1024/256/128 PNGs.

Reference images: the prior council-icon-large.png and council-six-icon-large.png (2026-08-24 generations).

Model: google/gemini-3.1-flash-image via OpenRouter, 1:1.
