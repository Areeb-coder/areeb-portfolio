"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import "./DotMascot.css";

type DotMood = "idle" | "curious" | "thinking" | "playful";

type DotMascotProps = {
  size?: number | string;
  particleCount?: number;
  backgroundColor?: string;
  particleColor?: string;
  minParticleSize?: number;
  maxParticleSize?: number;
  interactive?: boolean;
  mood?: DotMood;
  /** Active characters receive a higher frame budget than the idle docked Dot. */
  active?: boolean;
  adaptiveContrast?: boolean;
  ariaLabel?: string;
  className?: string;
};

type Particle = {
  phi: number;
  latitude: number;
  shell: number;
  radius: number;
  orbitRate: number;
  phase: number;
  wobble: number;
  alpha: number;
};
type ProjectedParticle = { x: number; y: number; depth: number; radius: number; alpha: number };

type Pointer = { x: number; y: number; active: boolean };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function parseRgb(value: string): { r: number; g: number; b: number; a: number } | null {
  const match = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/i);
  if (!match) return null;
  const alphaToken = match[4] ?? "1";
  const alpha = alphaToken.endsWith("%") ? Number(alphaToken.slice(0, -1)) / 100 : Number(alphaToken);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: clamp(alpha, 0, 1) };
}

function surfaceIsDark(stage: HTMLElement, width: number, height: number): boolean {
  const rect = stage.getBoundingClientRect();
  const offset = Math.max(10, Math.min(150, Math.min(width, height) * 0.59));
  const samples = [
    [rect.left + rect.width / 2 - offset, rect.top + rect.height / 2],
    [rect.left + rect.width / 2 + offset, rect.top + rect.height / 2],
    [rect.left + rect.width / 2, rect.top + rect.height / 2 - offset],
    [rect.left + rect.width / 2, rect.top + rect.height / 2 + offset],
  ];
  const luminances: number[] = [];
  for (const [x, y] of samples) {
    if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
    const candidates = document.elementsFromPoint(x, y);
    let sampled = false;
    for (const candidate of candidates) {
      if (!(candidate instanceof HTMLElement) || candidate.closest(".dot-guide, .dot-micro-popup, [data-dot-ignore]")) continue;
      let node: HTMLElement | null = candidate;
      while (node && node !== document.documentElement) {
        const style = window.getComputedStyle(node);
        const rgb = parseRgb(style.backgroundColor);
        if (rgb && rgb.a > 0.14) {
          // Composite translucent surfaces against a light neutral fallback.
          const r = rgb.r * rgb.a + 248 * (1 - rgb.a);
          const g = rgb.g * rgb.a + 247 * (1 - rgb.a);
          const b = rgb.b * rgb.a + 220 * (1 - rgb.a);
          luminances.push((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255);
          sampled = true;
          break;
        }
        if (node.matches('[data-theme="dark"], .theme-dark, .section-dark, .faq-section, .process-section')) {
          luminances.push(0.09);
          sampled = true;
          break;
        }
        node = node.parentElement;
      }
      if (sampled) break;
    }
  }
  if (!luminances.length) return false;
  const average = luminances.reduce((sum, value) => sum + value, 0) / luminances.length;
  return average < 0.38;
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 3D particles with independently varied angular velocity. */
function createParticles(count: number, minSize: number, maxSize: number): Particle[] {
  const random = mulberry32(731_927);
  return Array.from({ length: count }, () => ({
    phi: random() * Math.PI * 2,
    latitude: Math.asin(random() * 2 - 1),
    shell: 0.82 + random() * 0.16,
    radius: minSize + random() * (maxSize - minSize),
    orbitRate: (0.00005 + random() * 0.00022) * (random() > 0.5 ? 1 : -1),
    phase: random() * Math.PI * 2,
    wobble: 0.45 + random() * 1.45,
    alpha: 0.48 + random() * 0.45,
  }));
}

/**
 * Dot is split into two visual systems:
 * - a light-weight canvas for the 3D orbital shell;
 * - crisp DOM eyes/mouth that never get resampled with the particles.
 * The canvas pauses off-screen and when the tab is hidden.
 */
export default function DotMascot({
  size = 480,
  particleCount = 240,
  backgroundColor = "transparent",
  particleColor = "#080808",
  minParticleSize = 0.55,
  maxParticleSize = 1.65,
  interactive = true,
  mood = "idle",
  active = false,
  adaptiveContrast = true,
  ariaLabel = "Dot, a floating three-dimensional particle character with expressive eyes",
  className = "",
}: DotMascotProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<Pointer>({ x: 0, y: 0, active: false });
  const moodRef = useRef(mood);
  const activeRef = useRef(active);

  useEffect(() => { moodRef.current = mood; }, [mood]);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true, desynchronized: true });
    if (!stage || !canvas || !context) return;

    const particles = createParticles(
      clamp(particleCount, 80, 420),
      Math.max(0.25, minParticleSize),
      Math.max(minParticleSize, maxParticleSize),
    );
    const projected: ProjectedParticle[] = particles.map(() => ({ x: 0, y: 0, depth: 0, radius: 0, alpha: 0 }));

    let width = 1;
    let height = 1;
    let dpr = 1;
    let bodyRadius = 1;
    // Capture the entry-stage diameter once. When the same character docks,
    // its field is sampled down relative to this original visual scale.
    let referenceDiameter = 0;
    let activeParticleColor = particleColor;
    let darkSurface = false;
    let lastContrastSample = 0;
    let frameId = 0;
    let lastFrameAt = 0;
    let elapsed = 0;
    let running = false;
    let inViewport = true;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let resizeObserver: ResizeObserver | null = null;

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const nextWidth = Math.max(1, rect.width);
      const nextHeight = Math.max(1, rect.height);
      if (Math.abs(nextWidth - width) < 0.5 && Math.abs(nextHeight - height) < 0.5) return;
      width = nextWidth;
      height = nextHeight;
      if (referenceDiameter <= 1) referenceDiameter = Math.min(width, height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      bodyRadius = Math.min(width, height) * 0.445;
      darkSurface = adaptiveContrast ? surfaceIsDark(stage, width, height) : false;
      activeParticleColor = darkSurface ? "#dce85c" : particleColor;
      stage.dataset.contrast = darkSurface ? "dark" : "light";
      stage.style.setProperty("--dot-face-center-ink", darkSurface ? "#dce85c" : "#080808");
      draw(elapsed);
    };

    const draw = (time: number) => {
      if (width <= 1 || height <= 1) return;
      context.clearRect(0, 0, width, height);

      // A gently precessing axis changes the apparent 3D orientation over time.
      const axisX = reducedMotion ? 0.09 : 0.12 + Math.sin(time * 0.00019) * 0.12;
      const axisY = reducedMotion ? 0 : time * 0.000145;
      const axisZ = reducedMotion ? -0.04 : -0.04 + Math.cos(time * 0.00016) * 0.085;
      const cx = Math.cos(axisX), sx = Math.sin(axisX);
      const cy = Math.cos(axisY), sy = Math.sin(axisY);
      const cz = Math.cos(axisZ), sz = Math.sin(axisZ);
      const radius = bodyRadius;
      const diameterRatio = clamp(Math.min(width, height) / Math.max(1, referenceDiameter), 0.08, 1);
      // Preserve the reference's rich shell at smaller sizes. Linear sampling
      // keeps a substantial field in the 132px touring character (rather than
      // collapsing it to ~30 dots as the old 1.8 power did).
      const visibleCount = Math.max(72, Math.min(particles.length, Math.round(particles.length * diameterRatio)));
      const particleStride = particles.length / visibleCount;
      const particleRadiusScale = Math.max(0.78, Math.sqrt(diameterRatio));
      const bob = reducedMotion ? 0 : Math.sin(time * 0.00105) * radius * 0.018;
      const drift = reducedMotion ? 0 : Math.sin(time * 0.00073) * radius * 0.012;
      const breath = reducedMotion ? 1 : 1 + Math.sin(time * 0.00082) * 0.01;
      const moodTilt = moodRef.current === "playful" ? 0.032 : moodRef.current === "curious" ? 0.018 : 0.008;
      const tilt = reducedMotion ? 0 : Math.sin(time * 0.0006) * moodTilt;

      context.save();
      context.translate(width * 0.5 + drift, height * 0.5 + bob);
      context.rotate(tilt);
      context.scale(breath, breath);

      const framePoints: ProjectedParticle[] = [];
      for (let sample = 0; sample < visibleCount; sample += 1) {
        // Evenly sample the deterministic sphere so the small version keeps
        // a balanced orbital silhouette instead of an accidental clump.
        const index = Math.min(particles.length - 1, Math.floor((sample + 0.5) * particleStride));
        const particle = particles[index];
        const point = projected[index];
        const angle = particle.phi + (reducedMotion ? 0 : time * particle.orbitRate);
        const latitude = particle.latitude + (reducedMotion ? 0 : Math.sin(time * 0.00042 + particle.phase) * 0.022);
        const radial = Math.cos(latitude) * particle.shell;
        let x = Math.cos(angle) * radial;
        let y = Math.sin(latitude) * particle.shell;
        let z = Math.sin(angle) * radial;

        // Rotate around Y, X and Z. Each particle also has its own slow eddy.
        const yx = x * cy + z * sy;
        const yz = -x * sy + z * cy;
        x = yx;
        z = yz;
        const xx = x;
        const xy = y * cx - z * sx;
        const xz = y * sx + z * cx;
        x = xx * cz - xy * sz;
        y = xx * sz + xy * cz;
        z = xz;

        const localTime = time * 0.001 + particle.phase;
        const wobbleX = reducedMotion ? 0 : Math.sin(localTime * 0.71) * particle.wobble * 0.014;
        const wobbleY = reducedMotion ? 0 : Math.cos(localTime * 0.63) * particle.wobble * 0.012;
        const perspective = 3.7 / (3.7 - z * 0.6);
        point.x = (x * perspective + wobbleX) * radius;
        point.y = (y * perspective + wobbleY) * radius;
        point.depth = z;
        point.radius = Math.max(0.44, particle.radius * particleRadiusScale) * (0.72 + (z + 1) * 0.2) * perspective;
        point.alpha = particle.alpha * (0.54 + (z + 1) * 0.22);
        framePoints.push(point);
      }
      framePoints.sort((a, b) => a.depth - b.depth);

      context.fillStyle = activeParticleColor;
      // Keep particles crisp; contrast comes from colour, not a blur/glow layer.
      context.shadowBlur = 0;
      for (const point of framePoints) {
        // The HTML face is layered above the canvas, so particles can occupy
        // the full orbital volume without softening or covering the eyes.
        context.globalAlpha = clamp(point.alpha, 0.22, 0.92);
        context.beginPath();
        context.arc(point.x, point.y, Math.max(0.28, point.radius), 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
      context.globalAlpha = 1;
    };

    const animate = (now: number) => {
      if (!running || !inViewport || document.hidden) return;
      if (now - lastContrastSample > 280) {
        lastContrastSample = now;
        const nextDark = adaptiveContrast ? surfaceIsDark(stage, width, height) : false;
        if (nextDark !== darkSurface) {
          darkSurface = nextDark;
          activeParticleColor = nextDark ? "#dce85c" : particleColor;
          stage.dataset.contrast = nextDark ? "dark" : "light";
          stage.style.setProperty("--dot-face-center-ink", nextDark ? "#dce85c" : "#080808");
        }
      }
      const fps = activeRef.current ? 40 : 24;
      const frameInterval = 1000 / fps;
      if (now - lastFrameAt >= frameInterval) {
        const deltaMs = lastFrameAt ? Math.min(50, now - lastFrameAt) : frameInterval;
        elapsed += deltaMs;
        lastFrameAt = now;
        draw(elapsed);
      }
      frameId = window.requestAnimationFrame(animate);
    };

    const stop = () => {
      running = false;
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      lastFrameAt = 0;
    };
    const start = () => {
      stop();
      if (!inViewport || document.hidden) return;
      darkSurface = adaptiveContrast ? surfaceIsDark(stage, width, height) : false;
      activeParticleColor = darkSurface ? "#dce85c" : particleColor;
      stage.dataset.contrast = darkSurface ? "dark" : "light";
      stage.style.setProperty("--dot-face-center-ink", darkSurface ? "#dce85c" : "#080808");
      if (reducedMotion) {
        draw(elapsed);
        return;
      }
      running = true;
      frameId = window.requestAnimationFrame(animate);
    };

    const updateGaze = (event: PointerEvent) => {
      if (!interactive || event.pointerType === "touch") return;
      const rect = stage.getBoundingClientRect();
      const x = clamp(((event.clientX - (rect.left + rect.width / 2)) / Math.max(1, rect.width * 1.5)), -1, 1);
      const y = clamp(((event.clientY - (rect.top + rect.height / 2)) / Math.max(1, rect.height * 1.5)), -1, 1);
      pointerRef.current = { x, y, active: true };
      stage.style.setProperty("--dot-gaze-x", `${x * 5}px`);
      stage.style.setProperty("--dot-gaze-y", `${y * 4}px`);
    };
    const resetGaze = () => {
      pointerRef.current.active = false;
      stage.style.setProperty("--dot-gaze-x", "0px");
      stage.style.setProperty("--dot-gaze-y", "0px");
    };
    const onVisibilityChange = () => { if (document.hidden) stop(); else start(); };
    const onScroll = () => {
      if (!reducedMotion) return; // the active RAF samples contrast during normal motion
      darkSurface = adaptiveContrast ? surfaceIsDark(stage, width, height) : false;
      activeParticleColor = darkSurface ? "#dce85c" : particleColor;
      stage.dataset.contrast = darkSurface ? "dark" : "light";
      stage.style.setProperty("--dot-face-center-ink", darkSurface ? "#dce85c" : "#080808");
      draw(elapsed);
    };
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = (event: MediaQueryListEvent) => { reducedMotion = event.matches; start(); };

    resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(stage);
    const intersectionObserver = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => {
          inViewport = Boolean(entry?.isIntersecting);
          if (inViewport) start(); else stop();
        }, { rootMargin: "80px", threshold: 0.01 })
      : null;
    intersectionObserver?.observe(stage);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    if (interactive) window.addEventListener("pointermove", updateGaze, { passive: true });
    window.addEventListener("pointerleave", resetGaze, { passive: true });
    window.addEventListener("blur", resetGaze);
    document.addEventListener("visibilitychange", onVisibilityChange);
    motionQuery.addEventListener?.("change", onMotionChange);

    resize();
    start();
    return () => {
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", updateGaze);
      window.removeEventListener("pointerleave", resetGaze);
      window.removeEventListener("blur", resetGaze);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery.removeEventListener?.("change", onMotionChange);
    };
  }, [particleCount, minParticleSize, maxParticleSize, particleColor, interactive, adaptiveContrast]);

  const stageStyle = {
    "--dot-size": typeof size === "number" ? `${size}px` : size,
    "--dot-background": backgroundColor,
  } as CSSProperties;

  return (
    <div ref={stageRef} className={`dot-mascot ${className}`.trim()} style={stageStyle}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="dot-face" aria-hidden="true">
        <span className="dot-face-eye dot-face-eye-left"><i /></span>
        <span className="dot-face-eye dot-face-eye-right"><i /></span>
        <span className="dot-face-mouth" />
      </span>
      <span className="dot-sr-only">{ariaLabel}</span>
    </div>
  );
}
