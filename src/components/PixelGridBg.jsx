import { useEffect, useRef } from 'react';

// A grid of small squares that light up in the P.I.B. palette near the
// cursor/touch point and fade back out. Pure canvas, no dependencies.
export default function PixelGridBg() {
  const canvasRef = useRef(null);
  const pointer = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const colors = ['#3fd6c8', '#ff5d6c', '#f4b942', '#ff8fc2', '#f5f0e6'];
    const cell = 22;
    let cols = 0, rows = 0, cellColors = [], glow = [];
    let raf;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.ceil(canvas.width / cell) + 1;
      rows = Math.ceil(canvas.height / cell) + 1;
      cellColors = Array.from({ length: cols * rows }, () => colors[Math.floor(Math.random() * colors.length)]);
      glow = new Array(cols * rows).fill(0);
    }

    function onMove(x, y) {
      pointer.current = { x, y };
    }
    function onMouse(e) { onMove(e.clientX, e.clientY); }
    function onTouch(e) {
      if (e.touches && e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
    function onLeave() { pointer.current = { x: -9999, y: -9999 }; }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x: px, y: py } = pointer.current;
      const radius = 160;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const cx = c * cell + cell / 2;
          const cy = r * cell + cell / 2;
          const dist = Math.hypot(cx - px, cy - py);

          if (dist < radius) {
            glow[idx] = Math.max(glow[idx], 1 - dist / radius);
          } else {
            glow[idx] *= 0.93; // decay
          }

          if (glow[idx] > 0.02) {
            ctx.globalAlpha = glow[idx] * 0.55;
            ctx.fillStyle = cellColors[idx];
            const size = cell * (0.35 + glow[idx] * 0.5);
            ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
          }
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
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
