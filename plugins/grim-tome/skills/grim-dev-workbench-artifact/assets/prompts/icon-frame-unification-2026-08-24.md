# Icon Frame Unification (workbench chapter consistency pass)

Goal: all four workbench-chapter icons (artifacts, workbench-artifact, image-review-flow-workbench, text-editor-workbench) share the artifacts icon's exact hairline gold rounded-corner frame with identical spacing.

Step 1 (Nano Banana, gemini-3.1-flash-image-preview, 1:1 2K): Remove the thin rounded-square gold frame and the black background behind it entirely. Extend the existing artwork (the ornate box with the glowing card and circular arrows, and its dark cathedral background) outward so it fills the ENTIRE square canvas edge-to-edge with no border, no frame, no black margin, no rounded corners. Keep the artwork's style, subject, colors, and composition otherwise identical.

Step 2 (programmatic): resize the full-bleed artwork into the artifacts icon's measured interior box (pixels 31-992 of the 1024 canvas) and composite it through an antialiased rounded-rectangle mask (boundary at pixel 31, corner radius 130) onto a copy of the artifacts icon, so the full frame -- straight gold hairline at pixels 26-30, corner arcs of radius 133, and the four corner star ornaments -- is pixel-identical across all four icons. Exported to 1024/256/128 PNG.
