# Dot interaction notes

- One character only: the original particle-face Dot is used for the intro, autonomous exploration and persistent assistant dock. The assistant panel does not mount a separate avatar.
- Dot and its floating UI render through a portal into `document.body`, outside `.site-root` overflow and section stacking contexts. The fixed guide has the highest authored application z-index; the tour pause prompt sits above it.
- The persistent renderer uses a single canvas and a single managed requestAnimationFrame loop. It pauses when the tab is hidden or the character leaves the viewport, idles at a lower frame rate, and cleans up observers/listeners on unmount.
- The particle shell is a seeded 3D orbital field with per-particle angular velocity, gentle axis precession and wobble. The face remains toward the visitor; pupil tracking uses normalized whole-viewport coordinates with damped spring movement.
- Tour uses a curiosity-led randomized route beginning from the active section. Stops are deliberately long, include scroll settling and movement anticipation, and interact with the portfolio's real controls/elements. There is no slideshow progression control.
- Pointer, wheel, touch and keyboard input pause Tour and present Continue/Exit. Exit and natural completion share the same side approach into the assistant dock.
- Sound is a small opt-in Web Audio cue system. Browser speech synthesis is intentionally not used because a natural human-like voice cannot be guaranteed.
- The LinkedIn `START SOMETHING` stamp and portfolio content are left intact.
