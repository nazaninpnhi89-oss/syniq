"use client";

import { useEffect, useRef } from "react";

type Particle = {
  hx: number; // home x (target)
  hy: number;
  x: number;
  y: number;
  r: number;
  c: string;
  ph: number; // phase for idle wave
};

/**
 * هیروی «ذرات شبکه‌ای»: یک عکس را به هزاران ذره‌ی نورانی تبدیل می‌کند
 * که در ابتدا پخش‌اند و آرام جمع می‌شوند و سپس موج ملایم می‌خورند.
 * با پالت آبی برند رنگ‌آمیزی می‌شود و با حرکت موس واکنش نشان می‌دهد.
 */
export function ParticlePortrait({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let particles: Particle[] = [];
    let W = 0;
    let H = 0;
    let raf = 0;
    let started = 0;
    let imgData: { w: number; h: number; data: Uint8ClampedArray } | null =
      null;
    const pointer = { x: -9999, y: -9999, active: false };

    // رنگ‌آمیزی آبیِ برند بر اساس روشنایی پیکسل (کفِ روشن‌تر تا موهای تیره هم دیده شوند)
    const tint = (lum: number) => {
      const t = Math.pow(lum, 0.7);
      const r = Math.round(74 + (224 - 74) * t); // brand -> ice/white
      const g = Math.round(140 + (242 - 140) * t);
      const b = Math.round(176 + (255 - 176) * t);
      const a = (0.45 + 0.55 * t).toFixed(2);
      return `rgba(${r},${g},${b},${a})`;
    };

    const build = () => {
      if (!imgData) return;
      const rect = wrap.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      if (W < 2 || H < 2) return;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { w: iw, h: ih, data } = imgData;
      // جای‌گذاری عکس به‌صورت contain داخل قاب
      const ir = iw / ih;
      const cr = W / H;
      let dw: number;
      let dh: number;
      if (ir > cr) {
        dw = W;
        dh = W / ir;
      } else {
        dh = H;
        dw = H * ir;
      }
      const ox = (W - dw) / 2;
      const oy = (H - dh) / 2;

      const step = 2;
      const cell = (dw / (iw / step)) * 1.05; // اندازه‌ی ذره برای پوشش کامل
      particles = [];
      for (let y = 0; y < ih; y += step) {
        for (let x = 0; x < iw; x += step) {
          const idx = (y * iw + x) * 4;
          const a = data[idx + 3];
          if (a < 128) continue;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          if (lum < 0.18) continue; // حذف پس‌زمینه‌ی تیره‌ی لوگو، نگهداشتنِ نقاطِ نورانی
          const tx = ox + (x / iw) * dw;
          const ty = oy + (y / ih) * dh;
          particles.push({
            hx: tx,
            hy: ty,
            x: W / 2 + (Math.random() - 0.5) * W * 1.4,
            y: H / 2 + (Math.random() - 0.5) * H * 1.4,
            r: Math.max(0.8, cell * (lum > 0.6 ? 1 : 0.85)),
            c: tint(lum),
            ph: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        ctx.fillStyle = p.c;
        ctx.fillRect(p.hx, p.hy, p.r, p.r);
      }
    };

    const frame = (now: number) => {
      const t = (now - started) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        const wave = Math.sin(t * 1.1 + p.ph) * 0.5;
        p.x += (p.hx - p.x) * 0.055;
        p.y += (p.hy - p.y) * 0.055 + wave * 0.12;
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 7000) {
            const d = Math.sqrt(d2) || 1;
            const f = ((84 - d) / 84) * 10;
            if (f > 0) {
              p.x += (dx / d) * f;
              p.y += (dy / d) * f;
            }
          }
        }
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.r, p.r);
      }
      raf = requestAnimationFrame(frame);
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tmp = document.createElement("canvas");
      const scale = Math.min(1, 280 / img.width);
      tmp.width = Math.max(1, Math.round(img.width * scale));
      tmp.height = Math.max(1, Math.round(img.height * scale));
      const tctx = tmp.getContext("2d", { willReadFrequently: true });
      if (!tctx) return;
      tctx.drawImage(img, 0, 0, tmp.width, tmp.height);
      const d = tctx.getImageData(0, 0, tmp.width, tmp.height);
      imgData = { w: tmp.width, h: tmp.height, data: d.data };
      build();
      if (reduce) {
        drawStatic();
      } else {
        started = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      }
    };
    img.src = src;

    const ro = new ResizeObserver(() => {
      if (!imgData) return;
      build();
      if (reduce) drawStatic();
    });
    ro.observe(wrap);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [src]);

  return (
    <div ref={wrapRef} className={className}>
      {/* هاله‌ی ملایم پشت ذرات */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-3/4 w-3/4 rounded-full bg-brand-light/10 blur-3xl" />
      </div>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
