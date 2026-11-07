"use client";

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type MutableRefObject } from "react";
import DotMascot from "./DotMascot";

export type DotGuideMode = "entry" | "docked" | "touring" | "docking";
export type DotGuideMood = "idle" | "curious" | "thinking" | "playful";

type DotGuideProps = {
  visible: boolean;
  mode: DotGuideMode;
  position: { x: number; y: number } | null;
  assistantOpen: boolean;
  mood?: DotGuideMood;
  /** Temporary character scale for large, deliberate reference-style moments. */
  characterScale?: number;
  /** Move the persistent entry character to its dock during the entry curtain. */
  entryLeaving?: boolean;
  rootRef?: MutableRefObject<HTMLElement | null>;
  onToggleAssistant: () => void;
};

type EntryPlacement = {
  x: number;
  y: number;
  size: number;
  deltaX: number;
  deltaY: number;
  dockScale: number;
};

/**
 * One DotMascot instance lives for the full page experience. It starts in the
 * entry scene, travels into the dock, then continues exploring/assisting without
 * swapping to a second renderer or a differently styled mascot.
 */
export default function DotGuide({
  visible,
  mode,
  position,
  assistantOpen,
  entryLeaving = false,
  mood = "idle",
  characterScale = 1,
  rootRef,
  onToggleAssistant,
}: DotGuideProps) {
  const [entryPlacement, setEntryPlacement] = useState<EntryPlacement | null>(null);

  useLayoutEffect(() => {
    if (mode !== "entry") return;

    const anchor = document.querySelector<HTMLElement>(".driver-mascot-wrap");
    const updatePlacement = () => {
      const rect = anchor?.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportWidth = Math.max(1, viewport?.width ?? window.innerWidth);
      const viewportHeight = Math.max(1, viewport?.height ?? window.innerHeight);
      const mobile = viewportWidth <= 720;
      const fallbackSize = mobile
        ? Math.min(viewportHeight * 0.34, viewportWidth * 0.78, 280)
        : viewportWidth <= 900
          ? Math.min(viewportHeight * 0.54, 430, viewportWidth * 0.65)
          : Math.min(viewportHeight * 0.58, 500, viewportWidth * 0.68);
      const mascotInset = mobile ? 0.48 : viewportWidth <= 900 ? 0.58 : 0.54;
      const anchorWidth = rect?.width || fallbackSize;
      const size = Math.max(1, Math.min(mobile ? 112 : 196, anchorWidth * mascotInset));
      const x = rect ? rect.left + rect.width / 2 : viewportWidth / 2;
      const y = rect ? rect.top + rect.height / 2 : viewportHeight / 2 - (mobile ? 8 : 20);
      const dockSize = mobile ? 74 : 94;
      const dockRight = mobile ? 12 : 24;
      const dockBottom = mobile ? 14 : 22;
      const dockX = viewportWidth - dockRight - dockSize / 2;
      const dockY = viewportHeight - dockBottom - dockSize / 2;
      setEntryPlacement({
        x,
        y,
        size,
        deltaX: dockX - x,
        deltaY: dockY - y,
        dockScale: dockSize / size,
      });
    };

    updatePlacement();
    const observer = anchor && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updatePlacement)
      : null;
    if (anchor) observer?.observe(anchor);
    window.addEventListener("resize", updatePlacement, { passive: true });
    window.addEventListener("orientationchange", updatePlacement, { passive: true });
    window.visualViewport?.addEventListener("resize", updatePlacement, { passive: true });
    window.visualViewport?.addEventListener("scroll", updatePlacement, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("orientationchange", updatePlacement);
      window.visualViewport?.removeEventListener("resize", updatePlacement);
      window.visualViewport?.removeEventListener("scroll", updatePlacement);
    };
  }, [mode]);

  if (!visible) return null;

  const entryMode = mode === "entry";
  const positionStyle: CSSProperties = entryMode
    ? ({
        "--dot-x": entryPlacement ? `${entryPlacement.x}px` : "50vw",
        "--dot-y": entryPlacement ? `${entryPlacement.y}px` : "calc(50vh - var(--entry-center-offset, 20px))",
        ...(entryPlacement ? { "--entry-dot-size": `${entryPlacement.size}px` } : {}),
        "--entry-delta-x": `${entryPlacement?.deltaX ?? 0}px`,
        "--entry-delta-y": `${entryPlacement?.deltaY ?? 0}px`,
        "--entry-dock-scale": `${entryPlacement?.dockScale ?? 0.2}`,
        "--dot-character-scale": `${characterScale}`,
      } as CSSProperties)
    : mode !== "docked" && position
      ? ({ "--dot-x": `${position.x}px`, "--dot-y": `${position.y}px`, "--dot-character-scale": `${characterScale}` } as CSSProperties)
      : ({ "--dot-character-scale": `${characterScale}` } as CSSProperties);

  const className = [
    "dot-guide",
    entryMode ? "dot-guide-entry" : `dot-guide-${mode}`,
    entryMode && entryLeaving ? "is-entry-leaving" : "",
  ].filter(Boolean).join(" ");

  const attachRootRef = useCallback((node: HTMLElement | null) => {
    if (rootRef) rootRef.current = node;
  }, [rootRef]);

  return (
    <aside
      ref={attachRootRef}
      className={className}
      data-mode={mode}
      data-mood={mood}
      style={positionStyle}
      aria-hidden={entryMode ? true : undefined}
      aria-label={mode === "touring" ? "Dot exploring the portfolio" : mode === "docking" ? "Dot returning to its assistant position" : "Dot assistant"}
    >
      <div className="dot-guide-inner">
        <button
          className={`dot-guide-orb${assistantOpen ? " is-open" : ""}`}
          type="button"
          onClick={onToggleAssistant}
          aria-label={assistantOpen ? "Close Dot assistant" : "Talk to Dot"}
          aria-expanded={assistantOpen}
          title={assistantOpen ? "Close Dot" : "Talk to Dot"}
          tabIndex={entryMode ? -1 : 0}
        >
          <span className="dot-guide-aura" />
          <DotMascot
            // Keep the visual profile constant. DotMascot scales its particle
            // density and point radii to the stage size after the dock resize.
            size="500px"
            particleCount={300}
            minParticleSize={1.05}
            maxParticleSize={2.8}
            backgroundColor="transparent"
            particleColor="#080808"
            interactive
            active={entryMode || mode !== "docked" || assistantOpen}
            mood={mode === "touring" ? mood : mode === "docking" ? "playful" : assistantOpen ? "curious" : mood}
            ariaLabel="Dot, a three-dimensional particle character with two expressive eyes and a central mouth"
            className="persistent-dot-canvas"
            adaptiveContrast
          />
          {mode === "docked" && <span className="dot-guide-live"><i />{assistantOpen ? "DOT / READY" : "ASK DOT"}</span>}
        </button>
      </div>
    </aside>
  );
}

export type DotMicroPopupPosition = { x: number; y: number; side: "above" | "below" };

/** A temporary speech bubble is captured beside Dot after it has stopped; it is removed before the next movement. */
export function DotMicroPopup({ message, position, tone = "dark" }: { message: string; position: DotMicroPopupPosition | null; tone?: "dark" | "light" }) {
  if (!message || !position) return null;
  const style = {
    "--popup-x": `${position.x}px`,
    "--popup-y": `${position.y}px`,
  } as CSSProperties;
  return (
    <div className={`dot-micro-popup is-${position.side}`} data-tone={tone} style={style} role="status" aria-live="polite">
      <p>{message}</p>
    </div>
  );
}
