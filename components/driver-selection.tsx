"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";

type DriverSelectionProps = {
  onEnter: () => void;
  onSkip: () => void;
  leaving: boolean;
};

/** Entry screen shown on every new document visit. Dot remains the same in-site character after entering. */
export default function DriverSelection({
  onEnter,
  onSkip,
  leaving,
}: DriverSelectionProps) {
  const skipRef = useRef<HTMLButtonElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const mascotWrapRef = useRef<HTMLDivElement>(null);
  const [portalOrigin, setPortalOrigin] = useState<{ x: number; y: number } | null>(null);

  const beginEnter = () => {
    const rect = mascotWrapRef.current?.getBoundingClientRect();
    if (rect) setPortalOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    onEnter();
  };

  const portalStyle = portalOrigin
    ? ({ "--dot-portal-x": `${portalOrigin.x}px`, "--dot-portal-y": `${portalOrigin.y}px` } as CSSProperties)
    : undefined;

  useEffect(() => {
    enterRef.current?.focus({ preventScroll: true });
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onSkip();
      return;
    }

    if (event.key !== "Tab") return;

    // Keep keyboard focus inside the intro between Skip and Enter.
    if (event.shiftKey && document.activeElement === enterRef.current) {
      event.preventDefault();
      skipRef.current?.focus();
    } else if (event.shiftKey && document.activeElement === skipRef.current) {
      event.preventDefault();
      enterRef.current?.focus();
    } else if (!event.shiftKey && document.activeElement === enterRef.current) {
      event.preventDefault();
      skipRef.current?.focus();
    }
  };

  return (
    <section
      className={`driver-overlay${leaving ? " is-leaving" : ""}`}
      style={portalStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="driver-title"
      aria-describedby="driver-description"
      onKeyDown={handleKeyDown}
    >
      <header className="driver-topbar">
        <div className="driver-wordmark" aria-label="Areeb Khalid">
          AK<span>®</span>
        </div>
        <p className="driver-topline">INDEPENDENT DIGITAL EXPERIENCE <i /> 2026</p>
        <div className="driver-top-actions">
        <button
          ref={skipRef}
          className="driver-skip"
          type="button"
          onClick={onSkip}
        >
          SKIP INTRO <ArrowUpRight size={14} strokeWidth={1.8} />
        </button>
        </div>
      </header>

      <div className="driver-stage">
        <div className="driver-side-note driver-side-note-left" aria-hidden="true">
          <span>01 / 01</span>
          <p>A little curiosity goes a long way.</p>
        </div>

        <div className="driver-center">
          <div className="driver-mascot-wrap" ref={mascotWrapRef}>
            <div className="driver-orbit driver-orbit-outer" />
            <div className="driver-orbit driver-orbit-inner" />
            <span className="driver-orbit-point driver-orbit-point-a" />
            <span className="driver-orbit-point driver-orbit-point-b" />
            <span className="driver-dot-anchor" aria-hidden="true" />
            <span className="driver-mascot-caption">DOT / ONLINE</span>
          </div>

          <div className="driver-copy">
            <p className="driver-eyebrow"><span /> MEET YOUR GUIDE</p>
            <h1 id="driver-title">A new perspective<br />starts with <em>curiosity.</em></h1>
            <p id="driver-description">This is Dot. Move your cursor or tap to say hello before stepping inside.</p>
          </div>
        </div>

        <div className="driver-side-note driver-side-note-right" aria-hidden="true">
          <span>INTERACTIVE COMPANION</span>
          <p>Move your cursor. Dot follows your lead.</p>
        </div>
      </div>

      <footer className="driver-dock">
        <div className="driver-dock-profile">
          <div className="driver-dock-symbol" aria-hidden="true"><span /><span /><i /></div>
          <div className="driver-dock-copy">
            <small>YOUR DRIVER <b>01 / 01</b></small>
            <strong>DOT</strong>
            <span>Curiosity, in motion.</span>
          </div>
        </div>

        <div className="driver-dock-status" aria-hidden="true">
          <div className="driver-status-track"><span /></div>
          <small>THE PORTFOLIO IS READY</small>
        </div>

        <button
          ref={enterRef}
          className="driver-enter"
          type="button"
          onClick={beginEnter}
        >
          ENTER PORTFOLIO <ArrowRight size={17} strokeWidth={1.8} />
        </button>
      </footer>
    </section>
  );
}
