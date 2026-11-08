"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DotSoundCue =
  | "enabled"
  | "transition"
  | "appear"
  | "move"
  | "land"
  | "section"
  | "interaction"
  | "text"
  | "scatter"
  | "hover"
  | "playful"
  | "discovery";

type AssetCue = "hover" | "move" | "playful" | "discovery" | "transition" | "land" | "click";

const ASSET_PATHS: Record<AssetCue | "ambient", string> = {
  ambient: "/audio/dot-ambient-loop.mp3",
  hover: "/audio/sfx-dot-hover.mp3",
  move: "/audio/sfx-dot-move.mp3",
  playful: "/audio/sfx-dot-playful.mp3",
  discovery: "/audio/sfx-dot-discovery.mp3",
  transition: "/audio/sfx-dot-transition.mp3",
  land: "/audio/sfx-dot-land.mp3",
  click: "/audio/sfx-ui-soft-click.mp3",
};

const COOLDOWNS: Record<AssetCue, number> = {
  hover: 500,
  move: 450,
  playful: 650,
  discovery: 700,
  transition: 600,
  land: 450,
  click: 180,
};

const AMBIENT_GAIN = 0.16;
const EFFECTS_GAIN = 0.45;

function resolveCue(cue: DotSoundCue): AssetCue {
  switch (cue) {
    case "hover": return "hover";
    case "move": return "move";
    case "playful":
    case "scatter": return "playful";
    case "discovery":
    case "appear":
    case "text": return "discovery";
    case "transition":
    case "section": return "transition";
    case "land": return "land";
    case "enabled":
    case "interaction": return "click";
  }
}

/**
 * A single audio engine is owned by SiteEntry and survives the portfolio's
 * entry/exit and ordinary React state changes. Audio is opt-in: the browser
 * context and sources are created only from the visible sound control's click.
 */
export function useDotAudio() {
  const [soundOn, setSoundOn] = useState(false);
  const soundOnRef = useRef(false);
  const unlockedRef = useRef(false);
  const contextRef = useRef<AudioContext | null>(null);
  const ambientSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const effectsBusRef = useRef<GainNode | null>(null);
  const buffersRef = useRef<Partial<Record<AssetCue | "ambient", AudioBuffer>>>({});
  const loadingRef = useRef<Promise<void> | null>(null);
  const activeSourcesRef = useRef<Partial<Record<AssetCue, AudioBufferSourceNode>>>({});
  const lastCueAtRef = useRef<Partial<Record<AssetCue, number>>>({});
  const duckTimerRef = useRef<number | null>(null);

  const getContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (contextRef.current && contextRef.current.state !== "closed") return contextRef.current;

    const AudioContextConstructor = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    try {
      const context = new AudioContextConstructor();
      const ambientGain = context.createGain();
      const effectsBus = context.createGain();
      ambientGain.gain.value = 0.0001;
      effectsBus.gain.value = 0.0001;
      ambientGain.connect(context.destination);
      effectsBus.connect(context.destination);

      contextRef.current = context;
      ambientGainRef.current = ambientGain;
      effectsBusRef.current = effectsBus;
      return context;
    } catch {
      return null;
    }
  }, []);

  const loadAssets = useCallback(async (context: AudioContext) => {
    if (loadingRef.current) return loadingRef.current;

    loadingRef.current = (async () => {
      const entries = Object.entries(ASSET_PATHS) as Array<[AssetCue | "ambient", string]>;
      await Promise.all(entries.map(async ([name, path]) => {
        if (buffersRef.current[name]) return;
        try {
          const response = await fetch(path, { cache: "force-cache" });
          if (!response.ok) return;
          const bytes = await response.arrayBuffer();
          const decoded = await context.decodeAudioData(bytes);
          buffersRef.current[name] = decoded;
        } catch {
          // An unavailable or unsupported sound must never break the portfolio.
        }
      }));
    })().finally(() => {
      loadingRef.current = null;
    });

    return loadingRef.current;
  }, []);

  const setGain = useCallback((node: GainNode | null, value: number, seconds: number) => {
    const context = contextRef.current;
    if (!context || !node || context.state === "closed") return;
    const now = context.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(Math.max(0.0001, node.gain.value), now);
    node.gain.linearRampToValueAtTime(Math.max(0.0001, value), now + seconds);
  }, []);

  const startAmbient = useCallback(() => {
    const context = contextRef.current;
    const buffer = buffersRef.current.ambient;
    const gain = ambientGainRef.current;
    if (!context || !buffer || !gain || ambientSourceRef.current || !soundOnRef.current) return;

    try {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start(0);
      ambientSourceRef.current = source;
      setGain(gain, AMBIENT_GAIN, 3);
    } catch {
      // Keep the visual experience working if Web Audio refuses source creation.
    }
  }, [setGain]);

  const enableAudio = useCallback(async () => {
    const context = getContext();
    if (!context) return;

    // resume() is called synchronously from the user-initiated toggle handler.
    try {
      if (context.state !== "running") await context.resume();
    } catch {
      return;
    }
    if (context.state !== "running" || !soundOnRef.current) return;

    unlockedRef.current = true;
    await loadAssets(context);
    if (context.state !== "running" || !soundOnRef.current) return;

    const effectsBus = effectsBusRef.current;
    if (effectsBus) setGain(effectsBus, EFFECTS_GAIN, 0.12);
    startAmbient();
  }, [getContext, loadAssets, setGain, startAmbient]);

  const playSound = useCallback((cue: DotSoundCue) => {
    if (!soundOnRef.current || !unlockedRef.current || document.visibilityState === "hidden") return;

    const context = contextRef.current;
    if (!context) return;
    const assetCue = resolveCue(cue);
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    const previous = lastCueAtRef.current[assetCue] ?? -Infinity;
    if (nowMs - previous < COOLDOWNS[assetCue]) return;
    if (activeSourcesRef.current[assetCue]) return;

    const play = () => {
      if (!soundOnRef.current || context.state !== "running") return;
      const buffer = buffersRef.current[assetCue];
      const bus = effectsBusRef.current;
      if (!buffer || !bus) return;

      try {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(bus);
        activeSourcesRef.current[assetCue] = source;
        source.onended = () => {
          if (activeSourcesRef.current[assetCue] === source) delete activeSourcesRef.current[assetCue];
          try { source.disconnect(); } catch { /* already disconnected */ }
        };
        source.start(0);
        lastCueAtRef.current[assetCue] = nowMs;

        // A subtle ambient dip keeps the cue legible without changing the mix.
        const ambientGain = ambientGainRef.current;
        if (ambientGain) {
          setGain(ambientGain, 0.135, 0.035);
          if (duckTimerRef.current !== null) window.clearTimeout(duckTimerRef.current);
          duckTimerRef.current = window.setTimeout(() => {
            duckTimerRef.current = null;
            if (soundOnRef.current) setGain(ambientGain, AMBIENT_GAIN, 0.32);
          }, Math.min(900, Math.max(220, buffer.duration * 1000)));
        }
      } catch {
        delete activeSourcesRef.current[assetCue];
      }
    };

    if (context.state === "suspended") {
      void context.resume().then(play).catch(() => undefined);
    } else {
      play();
    }
  }, [setGain]);

  const toggleSound = useCallback(() => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);

    try {
      if (next) sessionStorage.removeItem("dot-audio-muted");
      else sessionStorage.setItem("dot-audio-muted", "true");
    } catch {
      // Storage may be blocked; audio remains usable for this page session.
    }

    if (next) {
      // The toggle itself is a genuine user gesture and therefore the unlock.
      unlockedRef.current = true;
      void enableAudio();
    } else {
      if (duckTimerRef.current !== null) {
        window.clearTimeout(duckTimerRef.current);
        duckTimerRef.current = null;
      }
      setGain(ambientGainRef.current, 0.0001, 0.08);
      setGain(effectsBusRef.current, 0.0001, 0.05);
      Object.values(activeSourcesRef.current).forEach(source => {
        if (!source) return;
        try { source.stop(); } catch { /* already stopped */ }
        try { source.disconnect(); } catch { /* already disconnected */ }
      });
      activeSourcesRef.current = {};
    }
  }, [enableAudio, setGain]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("dot-audio-muted") === "true") {
        soundOnRef.current = false;
        setSoundOn(false);
      }
    } catch {
      // Private browsing/storage restrictions must not affect the site.
    }

    const handleVisibility = () => {
      const context = contextRef.current;
      if (!context || context.state === "closed") return;
      if (document.visibilityState === "hidden") {
        void context.suspend().catch(() => undefined);
      } else if (soundOnRef.current && unlockedRef.current) {
        void context.resume().then(() => {
          if (soundOnRef.current && context.state === "running") {
            const bus = effectsBusRef.current;
            if (bus) setGain(bus, EFFECTS_GAIN, 0.12);
            startAmbient();
            if (ambientGainRef.current) setGain(ambientGainRef.current, AMBIENT_GAIN, 0.5);
          }
        }).catch(() => undefined);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [setGain, startAmbient]);

  useEffect(() => () => {
    if (duckTimerRef.current !== null) window.clearTimeout(duckTimerRef.current);
    Object.values(activeSourcesRef.current).forEach(source => {
      try { source?.stop(); } catch { /* already stopped */ }
      try { source?.disconnect(); } catch { /* already disconnected */ }
    });
    const ambient = ambientSourceRef.current;
    if (ambient) {
      try { ambient.stop(); } catch { /* already stopped */ }
      try { ambient.disconnect(); } catch { /* already disconnected */ }
    }
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }, []);

  return { soundOn, toggleSound, playSound };
}
