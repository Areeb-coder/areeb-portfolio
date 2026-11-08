"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PortfolioExperience from "./portfolio-experience";
import DriverSelection from "./driver-selection";
import { useDotAudio } from "./dot/use-dot-audio";

const EXIT_DURATION_MS = 4200;

/** The entry scene is intentionally shown on every document load, including refreshes. */
export default function SiteEntry() {
  // Render the entry scene in the first server/client frame; no placeholder flash.
  const [showIntro, setShowIntro] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [experienceVersion, setExperienceVersion] = useState(0);
  const [introOutcome, setIntroOutcome] = useState<"active" | "completed" | "skipped">("active");
  const { soundOn, toggleSound, playSound, startAudio } = useDotAudio();
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Browsers may restore the previous scroll offset before hydration. The
    // portfolio starts at its first section every time a new document loads.
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const resetScroll = () => window.scrollTo({ left: 0, top: 0, behavior: "instant" });
    const onPageShow = (event: PageTransitionEvent) => {
      resetScroll();
      if (!event.persisted) return;
      // A page restored from the back/forward cache is a new visit to this
      // experience too: clear old timers and remount the hidden portfolio.
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
      setLeaving(false);
      setIntroOutcome("active");
      setShowIntro(true);
      setExperienceVersion(value => value + 1);
    };
    window.addEventListener("pageshow", onPageShow);
    resetScroll();
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      resetScroll();
      scrollFrameRef.current = window.requestAnimationFrame(resetScroll);
    });

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.history.scrollRestoration = previousRestoration;
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showIntro) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overscrollBehavior = previousOverscroll;
    };
  }, [showIntro]);

  const skipIntro = useCallback(() => {
    if (leaving) return;
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = null;
    window.scrollTo({ left: 0, top: 0, behavior: "instant" });
    startAudio();
    // Skipping is a separate state transition: reveal the portfolio immediately
    // but explicitly keep Dot's automatic exploration disabled.
    setIntroOutcome("skipped");
    setLeaving(false);
    setShowIntro(false);
  }, [leaving, startAudio]);

  const enterPortfolio = useCallback(() => {
    if (leaving) return;
    window.scrollTo({ left: 0, top: 0, behavior: "instant" });
    startAudio();
    playSound("transition");
    setLeaving(true);
    // Dot travels with the entry curtain. The body-portal character takes over
    // at the same dock point as the entry scene clears.
    exitTimerRef.current = setTimeout(() => {
      // The Dot-centred iris has completed its blackout. Reveal the already
      // mounted portfolio underneath; the persistent Dot renderer has reached
      // its dock in the same animation, so no mascot swap or position reset occurs.
      setIntroOutcome("completed");
      setShowIntro(false);
      setLeaving(false);
      playSound("land");
    }, EXIT_DURATION_MS);
  }, [leaving, playSound, startAudio]);

  return (
    <>
      <div
        className="portfolio-entry"
        aria-hidden={showIntro}
        inert={showIntro}
      >
        <PortfolioExperience
          key={experienceVersion}
          autoTourEnabled={introOutcome === "completed"}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          playSound={playSound}
          showDotGuide={!showIntro}
          entryLeaving={leaving}
        />
      </div>
      {showIntro && (
        <DriverSelection onEnter={enterPortfolio} onSkip={skipIntro} leaving={leaving} />
      )}
    </>
  );
}
