export type DotMoveOptions = {
  maxDuration?: number;
  maxSpeed?: number;
  stiffness?: number;
  damping?: number;
  curve?: number;
};

/** A small critically-damped motion controller. It updates CSS variables directly, never React state. */
export class DotMotionController {
  private getElement: () => HTMLElement | null;
  private frameId = 0;
  private resolveCurrent: ((arrived: boolean) => void) | null = null;
  private destroyed = false;

  constructor(getElement: () => HTMLElement | null) {
    this.getElement = getElement;
  }

  private write(x: number, y: number, vx: number, vy: number) {
    const element = this.getElement();
    if (!element) return;
    const degrees = Math.atan2(vy, vx) * (180 / Math.PI);
    const tilt = Number.isFinite(degrees) ? Math.max(-7, Math.min(7, (degrees - 90) * 0.08)) : 0;
    element.style.setProperty("--dot-x", `${x.toFixed(2)}px`);
    element.style.setProperty("--dot-y", `${y.toFixed(2)}px`);
    element.style.setProperty("--dot-tilt", `${tilt.toFixed(2)}deg`);
    element.setAttribute("data-side", x > window.innerWidth * 0.56 ? "left" : "right");
  }

  setPosition(x: number, y: number) {
    if (this.destroyed) return;
    this.stop();
    this.write(x, y, 0, 0);
  }

  moveTo(x: number, y: number, options: DotMoveOptions = {}): Promise<boolean> {
    if (this.destroyed) return Promise.resolve(false);
    const element = this.getElement();
    if (!element || !Number.isFinite(x) || !Number.isFinite(y)) return Promise.resolve(false);

    this.stop();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.write(x, y, 0, 0);
      return Promise.resolve(true);
    }
    const rect = element.getBoundingClientRect();
    let px = rect.left + rect.width / 2;
    let py = rect.top + rect.height / 2;
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      px = window.innerWidth - rect.width / 2 - 24;
      py = window.innerHeight - rect.height / 2 - 24;
    }

    const startX = px;
    const startY = py;
    const dx = x - px;
    const dy = y - py;
    const distance = Math.hypot(dx, dy);
    if (distance < 5) {
      this.write(x, y, 0, 0);
      return Promise.resolve(true);
    }

    const durationLimit = Math.max(900, options.maxDuration ?? 5600);
    const maxSpeed = Math.max(150, options.maxSpeed ?? 460);
    const stiffness = Math.max(10, options.stiffness ?? 28);
    const damping = Math.max(4, options.damping ?? 10.5);
    const curveSize = Math.min(62, distance * (options.curve ?? 0.115));
    const curveDirection = Math.random() > 0.5 ? 1 : -1;
    const perpendicularX = distance ? (-dy / distance) * curveDirection : 0;
    const perpendicularY = distance ? (dx / distance) * curveDirection : 0;

    return new Promise<boolean>((resolve) => {
      this.resolveCurrent = resolve;
      let vx = 0;
      let vy = 0;
      let previousAt = 0;
      const startedAt = performance.now();
      let settledFrames = 0;

      const finish = (arrived: boolean) => {
        window.cancelAnimationFrame(this.frameId);
        this.frameId = 0;
        this.resolveCurrent = null;
        if (arrived) this.write(x, y, 0, 0);
        resolve(arrived);
      };

      const step = (now: number) => {
        if (this.destroyed) {
          finish(false);
          return;
        }
        const elapsed = now - startedAt;
        const dt = Math.min(0.035, Math.max(0.001, previousAt ? (now - previousAt) / 1000 : 1 / 60));
        previousAt = now;
        const progress = Math.min(1, elapsed / Math.min(durationLimit * 0.88, Math.max(1000, distance / maxSpeed * 1000 + 900)));
        const curve = Math.sin(progress * Math.PI) * curveSize;
        const targetX = x + perpendicularX * curve;
        const targetY = y + perpendicularY * curve;

        let ax = (targetX - px) * stiffness - vx * damping;
        let ay = (targetY - py) * stiffness - vy * damping;
        const acceleration = Math.hypot(ax, ay);
        const maxAcceleration = 1680;
        if (acceleration > maxAcceleration) {
          ax = (ax / acceleration) * maxAcceleration;
          ay = (ay / acceleration) * maxAcceleration;
        }
        vx += ax * dt;
        vy += ay * dt;
        const speed = Math.hypot(vx, vy);
        if (speed > maxSpeed) {
          vx = (vx / speed) * maxSpeed;
          vy = (vy / speed) * maxSpeed;
        }
        px += vx * dt;
        py += vy * dt;
        this.write(px, py, vx, vy);

        const remaining = Math.hypot(x - px, y - py);
        if (remaining < 2.6 && Math.hypot(vx, vy) < 10) settledFrames += 1;
        else settledFrames = 0;

        if (settledFrames >= 5) {
          finish(true);
          return;
        }
        if (elapsed >= durationLimit) {
          // Never teleport on timeout. Return failure at the current position;
          // the explorer will recalculate or skip the unstable interaction.
          finish(false);
          return;
        }
        this.frameId = window.requestAnimationFrame(step);
      };

      this.frameId = window.requestAnimationFrame(step);
    });
  }

  stop() {
    if (this.frameId) window.cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    const resolve = this.resolveCurrent;
    this.resolveCurrent = null;
    resolve?.(false);
  }

  destroy() {
    this.stop();
    this.destroyed = true;
  }
}
