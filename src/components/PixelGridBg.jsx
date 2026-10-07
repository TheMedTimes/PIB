import { useEffect, useRef } from 'react';

// A grid of small squares that light up in the P.I.B. palette near the
// cursor and fade back out. This is a mouse-hover flourish: on a
// touch-only device (most phones) it barely shows anyway (only reacts to
// drags, not taps), so it's skipped entirely there, no point paying a
// continuous per-frame cost for an effect most visitors will never see.
// On devices that do get it, the render loop idles (stops entirely) when
// nothing is glowing, instead of running forever at 60fps in the
// background.
export default function PixelGridBg() {
  const canvasRef = useRef(null);
  const pointer = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (prefersReducedMotion || !hasFinePointer) return undefined;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const colors = ['#3fd6c8', '#ff5d6c', '#f4b942', '#ff8fc2', '#f5f0e6'];
    const cell = 22;
    const radius = 160;
    let cols = 0, rows = 0, cellColors = [], glow = [];
    let raf = null;
    let running = false;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.ceil(canvas.width / cell) + 1;
      rows = Math.ceil(canvas.height / cell) + 1;
      cellColors = Array.from({ length: cols * rows }, () => colors[Math.floor(Math.random() * colors.length)]);
      glow = new Array(cols * rows).fill(0);
    }

    function ensureRunning() {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    }

    function onMove(x, y) {
      pointer.current = { x, y };
      ensureRunning();
    }
    function onMouse(e) { onMove(e.clientX, e.clientY); }
    function onLeave() { pointer.current = { x: -9999, y: -9999 }; }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x: px, y: py } = pointer.current;

      // Only scan cells inside a bounding box around the pointer, plus a
      // small margin, for anything that could still be decaying, instead
      // of the entire grid every frame.
      const minC = Math.max(0, Math.floor((px - radius) / cell));
      const maxC = Math.min(cols - 1, Math.ceil((px + radius) / cell));
      const minR = Math.max(0, Math.floor((py - radius) / cell));
      const maxR = Math.min(rows - 1, Math.ceil((py + radius) / cell));

      let anyGlowing = false;

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const idx = r * cols + c;
          const cx = c * cell + cell / 2;
          const cy = r * cell + cell / 2;
          const dist = Math.hypot(cx - px, cy - py);
          if (dist < radius) glow[idx] = Math.max(glow[idx], 1 - dist / radius);
        }
      }

      // Decay and draw every cell that currently has any glow (tracked
      // cheaply by re-checking the same bounding box across frames; since
      // glow only decays, once it drops below threshold it stays there).
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const idx = r * cols + c;
          if (glow[idx] <= 0.02) continue;
          glow[idx] *= 0.9;
          if (glow[idx] <= 0.02) continue;
          anyGlowing = true;
          const cx = c * cell + cell / 2;
          const cy = r * cell + cell / 2;
          ctx.globalAlpha = glow[idx] * 0.55;
          ctx.fillStyle = cellColors[idx];
          const size = cell * (0.35 + glow[idx] * 0.5);
          ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
        }
      }
      ctx.globalAlpha = 1;

      const pointerActive = px > -1000;
      if (anyGlowing || pointerActive) {
        raf = requestAnimationFrame(draw);
      } else {
        running = false; // idle: stop the loop entirely until pointer moves again
      }
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('mouseleave', onLeave);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
