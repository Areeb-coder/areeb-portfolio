"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DotSoundCue = "enabled" | "transition" | "appear" | "move" | "land" | "section" | "interaction" | "text" | "scatter";

type Note = {
  frequency: number;
  endFrequency?: number;
  delay: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
};

// Short, tactile UI sounds. Dot uses sound design rather than synthetic speech:
// no robot voice is played when a natural voice is not available.
const CUES: Record<DotSoundCue, Note[]> = {
  enabled: [
    { frequency: 523.25, delay: 0, duration: 0.2, gain: 0.145 },
    { frequency: 783.99, delay: 0.08, duration: 0.3, gain: 0.12 },
  ],
  transition: [
    { frequency: 220, endFrequency: 330, delay: 0, duration: 0.38, gain: 0.17, type: "triangle" },
    { frequency: 440, endFrequency: 659.25, delay: 0.1, duration: 0.42, gain: 0.14 },
  ],
  appear: [
    { frequency: 196, endFrequency: 294, delay: 0, duration: 0.42, gain: 0.17, type: "triangle" },
    { frequency: 392, endFrequency: 587.33, delay: 0.11, duration: 0.48, gain: 0.145 },
    { frequency: 784, delay: 0.22, duration: 0.24, gain: 0.11 },
  ],
  move: [
    { frequency: 180, endFrequency: 270, delay: 0, duration: 0.32, gain: 0.105, type: "sine" },
    { frequency: 360, endFrequency: 440, delay: 0.07, duration: 0.24, gain: 0.075, type: "triangle" },
  ],
  land: [
    { frequency: 392, delay: 0, duration: 0.18, gain: 0.17, type: "triangle" },
    { frequency: 587.33, delay: 0.065, duration: 0.27, gain: 0.145 },
  ],
  section: [
    { frequency: 440, delay: 0, duration: 0.16, gain: 0.14 },
    { frequency: 554.37, delay: 0.06, duration: 0.2, gain: 0.12 },
  ],
  interaction: [
    { frequency: 587.33, delay: 0, duration: 0.13, gain: 0.17, type: "triangle" },
    { frequency: 739.99, delay: 0.045, duration: 0.18, gain: 0.125 },
  ],
  text: [
    { frequency: 330, endFrequency: 392, delay: 0, duration: 0.23, gain: 0.13, type: "sine" },
    { frequency: 659.25, delay: 0.055, duration: 0.19, gain: 0.1 },
  ],
  scatter: [
    { frequency: 240, endFrequency: 185, delay: 0, duration: 0.19, gain: 0.16, type: "triangle" },
    { frequency: 330, endFrequency: 250, delay: 0.055, duration: 0.18, gain: 0.13, type: "triangle" },
    { frequency: 415, endFrequency: 290, delay: 0.11, duration: 0.17, gain: 0.12, type: "sine" },
    { frequency: 520, endFrequency: 360, delay: 0.17, duration: 0.16, gain: 0.1, type: "triangle" },
    { frequency: 285, endFrequency: 210, delay: 0.23, duration: 0.2, gain: 0.105, type: "sine" },
  ],
};

export function useDotAudio() {
  const [soundOn, setSoundOn] = useState(false);
  const soundOnRef = useRef(false);
  const contextRef = useRef<AudioContext | null>(null);
  const lastCueAtRef = useRef<Partial<Record<DotSoundCue, number>>>({});
  const ambientSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const ambientTimerRef = useRef<number | null>(null);
  const ambientStartedRef = useRef(false);
  const ambientUnlockHandlerRef = useRef<(() => void) | null>(null);

  const getContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (contextRef.current && contextRef.current.state !== "closed") return contextRef.current;
    const Constructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return null;
    try {
      contextRef.current = new Constructor();
      return contextRef.current;
    } catch {
      return null;
    }
  }, []);

  const scheduleCue = useCallback((context: AudioContext, cue: DotSoundCue) => {
    const now = context.currentTime;
    const pitchVariation = cue === "interaction" || cue === "section" || cue === "text"
      ? [0.982, 1, 1.014][Math.floor(Math.random() * 3)]
      : 1;
    const levelVariation = 0.94 + Math.random() * 0.08;

    for (const note of CUES[cue]) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const filter = context.createBiquadFilter();
      const startAt = now + note.delay;
      const endAt = startAt + note.duration;
      const level = Math.min(0.24, note.gain * levelVariation);

      oscillator.type = note.type ?? "sine";
      oscillator.frequency.setValueAtTime(note.frequency * pitchVariation, startAt);
      if (note.endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency * pitchVariation, endAt);
      }
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(cue === "move" ? 1050 : 2200, startAt);
      filter.Q.setValueAtTime(0.45, startAt);
      envelope.gain.setValueAtTime(0.0001, startAt);
      envelope.gain.exponentialRampToValueAtTime(level, startAt + 0.028);
      envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);

      oscillator.connect(filter);
      filter.connect(envelope);
      envelope.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(endAt + 0.025);
      oscillator.onended = () => {
        oscillator.disconnect();
        filter.disconnect();
        envelope.disconnect();
      };
    }
  }, []);

  const playSound = useCallback((cue: DotSoundCue) => {
    if (!soundOnRef.current) return;
    const timestamp = typeof performance !== "undefined" ? performance.now() : Date.now();
    const previous = lastCueAtRef.current[cue] ?? -Infinity;
    const cooldown = cue === "section" ? 520 : cue === "move" ? 360 : 120;
    if (timestamp - previous < cooldown) return;
    lastCueAtRef.current[cue] = timestamp;

    const context = getContext();
    if (!context) return;
    if (context.state === "suspended") {
      void context.resume().then(() => {
        if (soundOnRef.current && context.state === "running") scheduleCue(context, cue);
      }).catch(() => undefined);
      return;
    }
    if (context.state === "running") scheduleCue(context, cue);
  }, [getContext, scheduleCue]);

  const clearAmbientUnlock = useCallback(() => {
    const handler = ambientUnlockHandlerRef.current;
    if (!handler || typeof window === "undefined") return;
    window.removeEventListener("pointerdown", handler, true);
    window.removeEventListener("touchstart", handler, true);
    window.removeEventListener("keydown", handler, true);
    ambientUnlockHandlerRef.current = null;
  }, []);

  const stopAmbient = useCallback(() => {
    clearAmbientUnlock();
    if (ambientTimerRef.current !== null) {
      window.clearInterval(ambientTimerRef.current);
      ambientTimerRef.current = null;
    }
    const source = ambientSourceRef.current;
    ambientSourceRef.current = null;
    if (source) {
      try { source.stop(); } catch {}
      try { source.disconnect(); } catch {}
    }
    const gain = ambientGainRef.current;
    ambientGainRef.current = null;
    if (gain) {
      try { gain.disconnect(); } catch {}
    }
    ambientStartedRef.current = false;
  }, [clearAmbientUnlock]);

  const startAudio = useCallback(() => {
    soundOnRef.current = true;
    setSoundOn(true);
    const context = getContext();
    if (!context) return;

    const startAmbient = () => {
      if (!soundOnRef.current || ambientStartedRef.current || context.state !== "running") return;

      // One persistent low-level ambience bed plus occasional soft plucked notes.
      // The master gain is deliberately audible at phone-speaker volume without
      // competing with the portfolio copy or Dot's interaction cues.
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, context.currentTime);
      master.gain.exponentialRampToValueAtTime(0.26, context.currentTime + 1.4);
      master.connect(context.destination);

      const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 8), context.sampleRate);
      const data = buffer.getChannelData(0);
      let seed = 918273;
      for (let i = 0; i < data.length; i += 1) {
        seed = (seed * 16807) % 2147483647;
        const noise = ((seed / 2147483647) * 2 - 1) * 0.014;
        const time = i / context.sampleRate;
        const warmBed = Math.sin(2 * Math.PI * 0.125 * time) * 0.004
          + Math.sin(2 * Math.PI * 130.81 * time) * 0.0022
          + Math.sin(2 * Math.PI * 196 * time) * 0.0011;
        data[i] = noise + warmBed;
      }

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1450, context.currentTime);
      filter.Q.setValueAtTime(0.18, context.currentTime);
      source.connect(filter);
      filter.connect(master);
      source.start();
      ambientSourceRef.current = source;
      ambientGainRef.current = master;
      ambientStartedRef.current = true;

      let step = 0;
      const spark = () => {
        if (!soundOnRef.current || context.state !== "running") return;
        const now = context.currentTime;
        const frequencies = [392, 523.25, 659.25, 493.88, 587.33, 440];
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const softFilter = context.createBiquadFilter();
        const startAt = now + 0.01;
        const endAt = startAt + 0.36;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequencies[step % frequencies.length], startAt);
        softFilter.type = "lowpass";
        softFilter.frequency.setValueAtTime(1800, startAt);
        envelope.gain.setValueAtTime(0.0001, startAt);
        envelope.gain.exponentialRampToValueAtTime(0.025, startAt + 0.05);
        envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);
        oscillator.connect(softFilter);
        softFilter.connect(envelope);
        envelope.connect(master);
        oscillator.start(startAt);
        oscillator.stop(endAt + 0.02);
        oscillator.onended = () => {
          oscillator.disconnect();
          softFilter.disconnect();
          envelope.disconnect();
        };
        step += 1;
      };

      spark();
      ambientTimerRef.current = window.setInterval(spark, 1850);
    };

    const deferUntilNextGesture = () => {
      if (ambientUnlockHandlerRef.current || !soundOnRef.current) return;
      const onUnlock = () => {
        clearAmbientUnlock();
        if (!soundOnRef.current) return;
        if (context.state === "suspended") {
          void context.resume().then(startAmbient).catch(() => undefined);
        } else {
          startAmbient();
        }
      };
      ambientUnlockHandlerRef.current = onUnlock;
      window.addEventListener("pointerdown", onUnlock, { once: true, capture: true, passive: true });
      window.addEventListener("touchstart", onUnlock, { once: true, capture: true, passive: true });
      window.addEventListener("keydown", onUnlock, { once: true, capture: true });
    };

    if (context.state === "suspended") {
      // The Enter/Skip tap normally unlocks this immediately. If a browser
      // rejects it, wait for one later gesture rather than retrying on a loop.
      void context.resume().then(startAmbient).catch(deferUntilNextGesture);
    } else if (context.state === "running") {
      startAmbient();
    }
  }, [clearAmbientUnlock, getContext]);

  const toggleSound = useCallback(() => {
    if (!soundOnRef.current) {
      startAudio();
      const context=getContext();
      if(context) void context.resume().then(()=>{ if(soundOnRef.current && context.state==="running") scheduleCue(context,"enabled"); }).catch(()=>undefined);
      return;
    }
    soundOnRef.current=false; setSoundOn(false); stopAmbient();
  }, [getContext, scheduleCue, startAudio, stopAmbient]);

  useEffect(() => () => {
    stopAmbient();
    soundOnRef.current = false;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }, [stopAmbient]);

  return { soundOn, toggleSound, playSound, startAudio };
}
