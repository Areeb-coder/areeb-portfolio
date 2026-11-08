# Areeb Khalid — Portfolio Studio

A personal portfolio built with Next.js, React, TypeScript and a small canvas-rendered particle character named **Dot**.

## Dot experience

Dot is one persistent character across the welcome experience, autonomous exploration and the assistant dock. The explorer does not mount a second mascot: the same body-level Dot renderer changes mode and returns to its lower-right assistant position when the tour ends.

### Character rendering

- The face is rendered as crisp DOM features (two expressive eyes and a central mouth), separate from the particle canvas. Particle density, depth sorting and motion therefore cannot smear the face into a dark cloud.
- The surrounding particles form a dense, lightweight 3D orbital shell with independently varied angular velocity, changing rotation axes, depth projection and subtle organic drift. Particle sampling and point radii scale with the rendered character size without collapsing the small touring/docked Dot into a sparse ring.
- The face remains crisp DOM geometry above the canvas. Particle and central-face contrast adapts between light surfaces (dark particles) and dark surfaces (lime particles/center mark), without changing the face proportions.
- The particle loop pauses when the tab is hidden or the character leaves the viewport, respects reduced-motion preferences, and uses a lower frame rate while Dot is idle/docked.
- Eye gaze reacts to pointer movement without moving the facial layer with the particle shell.

### Autonomous exploration

- The autonomous route is a curated, slightly non-linear sequence rather than a simple section-by-section scroll. Each stop re-measures a real DOM target; Dot only scrolls it into view when needed, waits for scroll stability, then approaches with acceleration, damping, a speed cap, a curved path and a settling radius. High-frequency movement updates CSS variables directly rather than React state.
- Dot's comments are occasional contextual micro-popups captured beside Dot after it arrives and stops. They remain stationary through the interaction and disappear before Dot moves again; there is no travelling `DOT / EXPLORING` panel. Silent interactions and a speech cooldown keep the rhythm closer to discovery than narration.
- Dot plays with real portfolio elements: it accelerates and reverses the live ticker temporarily; selects a real capability tab; ripples through and opens a real crew card; fans and opens a real project card; triggers a chain reaction across process cards; throws a real toolkit chip through the same event used by the visitor drag interaction; scatters the actual FAQ question words so they fall like physical pieces before restoring them; and nudges the about/contact stamps.
- A quiet, continuous Web Audio ambience bed sits behind the experience, with occasional filtered pluck notes and separate interaction cues. It starts only from the visitor's Enter/Skip gesture (or when Sound is enabled), remains one loop across sections, and stops when Sound is turned off. No synthetic spoken narration is used.
- Every wait is cancellable and bounded. Missing or detached targets are skipped, movement has a maximum duration, and cleanup cancels animation frames, timers, Web Animations and the active motion controller. Interrupted FAQ scatter styles and text animations are reset immediately.
- Manual wheel, touch, pointer or keyboard input pauses the Tour and displays **“Exit overview?”** with Continue and Exit. Continue resumes from the current exploration step; Exit returns the same Dot to the persistent dock.

### Persistent assistant

- A single body-level portal protects Dot from local stacking contexts and clipped sections. The assistant keeps its curated Q&A, suggestions, optional server-side OpenRouter replies and page navigation guidance.
- The renderer stays mounted while changing between touring, docking and docked modes. The dock retains the same face and particle personality.

### Refresh and entry behavior

- The initial entry experience is shown on every new document load and browser refresh. Browser scroll restoration is disabled for the entry lifecycle and the page is reset to the top before the visitor enters.
- The entry-to-portfolio handoff uses a circular curtain reveal centered on the persistent Dot dock. The entry mascot travels and scales toward that dock; the same body-portal Dot then takes over there without a second cross-screen movement.
- The portfolio is rendered underneath the entry layer but remains inert and hidden from assistive technology until entry completes. There is one Dot renderer; no second tour mascot is created.

## Other portfolio interactions

- Capability tabs, project detail modals, an FAQ accordion, draggable toolkit tags, responsive navigation and `Ctrl/Cmd + K` section navigation.
- A small 5×5 knight route puzzle opened by the fixed “Play a move” control.
- The circular **START SOMETHING** stamp opens Areeb's LinkedIn profile in a new tab.

## Run locally

Requirements: Node.js 20.9+ (Node 22 recommended) and npm.

Open the **`areeb-portfolio-studio` folder** (the folder containing `package.json`, `next.config.ts`, `app/`, `components/` and `data/`). Run commands from that folder, not from inside `app/`.

```powershell
npm install
npm run dev
```

Open the local URL printed by Next.js (normally `http://localhost:3000`). If that port is already occupied, Next.js may select another available port.

The entry point uses project-relative imports, and `next.config.ts` anchors Turbopack to this project directory. This avoids depending on an alias at the entry point or accidentally selecting a parent workspace with another lockfile.

## Enable open-ended AI replies (optional)

1. Copy `.env.example` to `.env.local`.
2. Add a private OpenRouter key and optionally choose a model:

```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
```

3. Restart the dev server.

Do not use `NEXT_PUBLIC_` for the secret. The API route is `/api/assistant`; the key stays on the server. Without a key, Dot uses the curated local portfolio knowledge base. Dot uses interaction sound effects only; there is no robotic browser speech output.

## Personalisation

- Project information and links: `data/portfolio.ts`.
- Guide knowledge: `guideKnowledge` in `data/portfolio.ts`.
- Contact email: set `NEXT_PUBLIC_CONTACT_EMAIL` in `.env.local` if a public email should be displayed.
- Visual system, breakpoints and motion: `app/globals.css`.
- Entry experience (shown on every fresh load/refresh): `components/site-entry.tsx` and `components/driver-selection.tsx`. The entry and portfolio share one persistent Dot renderer; there is no second entry mascot.
- Character renderer: `components/dot/DotMascot.tsx` and `components/dot/DotMascot.css` (DOM face + canvas particle shell, with particle density scaled to the original entry-stage diameter).
- Persistent Dot position, moods, entry-to-dock travel and assistant dock: `components/dot/dot-guide.tsx`.
- Autonomous route, real-element interactions, Q&A panel and project content: `components/portfolio-experience.tsx`.
- Sound cues: `components/dot/use-dot-audio.ts`.

## Project content policy

Project names and public links are based on Areeb's supplied profile and project context. Descriptions do not invent jobs, metrics, model architectures, competition rankings, awards or user counts. Where a repository needs deeper code review, the card points visitors to its source.

## Troubleshooting

- **`Can't resolve '@/components/site-entry'`:** extract the *entire* ZIP, including `components/site-entry.tsx`, `components/driver-selection.tsx` and `components/dot/DotMascot.tsx`.
- **Parent workspace warning:** keep the project files together and run commands from the folder containing `package.json`. `next.config.ts` sets the Turbopack root to the project folder.
- **Port already in use:** use the localhost port printed in the terminal, or stop the existing Next.js process before restarting.

## Production checks

```powershell
npm run typecheck
npm run build
npm run start
```

Deploy only after the typecheck and production build pass and any optional environment variables are set in the hosting provider. Do not commit `.env.local`.

## Project layout

```text
app/
  api/assistant/route.ts   # optional server-side OpenRouter endpoint
  globals.css             # visual system, layout and animation
  layout.tsx              # metadata and root layout
  page.tsx                # homepage entry
components/
  dot/
    DotMascot.tsx          # canvas particle character and viewport gaze
    DotMascot.css          # responsive mascot stage
    dot-guide.tsx          # one persistent character and assistant dock
    use-dot-audio.ts       # opt-in Web Audio cues
  driver-selection.tsx    # entry Dot introduction
  site-entry.tsx          # always-on-entry intro / portfolio transition
  portfolio-experience.tsx # portfolio, autonomous tour, assistant and modals
data/
  portfolio.ts             # projects, capabilities and guide knowledge
public/
  dot-mark.svg              # site icon
.env.example
```

## Final Dot exploration flow refinement (November 7, 2026)

The latest refinement keeps the existing single Dot renderer, character appearance, portfolio content and interactions. It adds the reference-timed entry iris, post-entry automatic exploration, a synchronized 1:55 timer, reliable contextual messages, and a smoother final dock return.

- Enter now runs a 4.2-second Dot-centred portal transition: Dot enlarges, the black iris expands from its measured entry position, the page remains masked during the handoff, and the same persistent Dot renderer settles into its dock.
- Once the portfolio is revealed, automatic exploration begins after a 1.55-second settling pause. No additional “LET DOT EXPLORE” click is required.
- The exploration clock is 1:55 and starts at Dot's first real approach. It pauses on Escape/manual interruption, preserves remaining time, resumes with Continue, and finishes the session at zero.
- Beats with authored comments always display their contextual bubble. The bubble is captured beside the stopped Dot, uses the compact dark reference treatment, remains through the read/action/reaction sequence, and disappears before Dot moves again. Longer messages receive a longer reading pause.
- When the timer expires, Dot makes up to three smooth, recalculated attempts to reach its persistent dock; no timeout path snaps it to the destination.

For local verification, run `npm install`, `npm run typecheck`, `npm run build`, then `npm run start`. The included `TEST-REPORT.md` documents which static checks were completed in the packaging environment and which browser/build checks still need to be run locally.