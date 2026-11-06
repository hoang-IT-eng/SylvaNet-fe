/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  clamp,
  seg,
  ease,
  nearestCachedIndex,
  calcAccumulatedCarbon,
  calcSparklineDashOffset,
} from './utils/mossline-math';
import { VideoAnimatorModal } from './components/VideoAnimatorModal';
import { Sparkles } from 'lucide-react';

// Exact asset URLs as specified
const ASSETS = {
  video:
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261106_025717_906b686d-9a9a-4dea-bab4-ae2454f8390e.mp4',
  heroStill:
    'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261106_031618_8ce6dca1-972d-429d-8d13-bf0691c37848.png&w=2400&q=88',
  cutout:
    'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261106_031657_baaa3380-5ece-482a-a623-a1838fd7653c.png&w=2400&q=90',
  spritesheet:
    'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261106_025635_82593f6a-1cf7-41c1-94ac-96fb89ebfd1a.png&w=2400&q=85',
  mastStill:
    'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261106_025630_9a37a1e0-2547-4973-8160-c75205993914.png&w=1400&q=82',
  islandClouds:
    'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261106_025545_b003e5cc-e68f-4fee-b686-c217a5d81eea.png&w=1400&q=82',
};

// 4 Hotspots
const HOTSPOTS = [
  { id: 'soil', left: '12%', top: '58%', label: 'Soil carbon', value: '+3.8 t/ha' },
  { id: 'canopy', left: '33%', top: '41%', label: 'Canopy moisture', value: '71 % RH' },
  { id: 'species', left: '70%', top: '66%', label: 'Species index', value: '214 taxa' },
  { id: 'micro', left: '83%', top: '47%', label: 'Microclimate', value: '14.2 °C' },
];

// Feature rows
const FEATURES = [
  { index: '01', text: 'Gold-standard observation system' },
  { index: '02', text: 'World-class atmospheric monitoring (AMRV)' },
  { index: '03', text: 'Integrated algorithmic processing' },
  { index: '04', text: 'Blockchain-secured traceability' },
  { index: '05', text: 'Built for scale and complexity' },
];

export default function App() {
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const storyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const camRef = useRef<HTMLDivElement>(null);
  const camFRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLImageElement>(null);
  const fogRef = useRef<HTMLDivElement>(null);
  const rk1Ref = useRef<HTMLDivElement>(null);
  const rk3Ref = useRef<HTMLDivElement>(null);
  const l0Ref = useRef<HTMLDivElement>(null);
  const l1Ref = useRef<HTMLDivElement>(null);
  const l2Ref = useRef<HTMLDivElement>(null);
  const l3Ref = useRef<HTMLDivElement>(null);
  const l4Ref = useRef<HTMLDivElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  const heroLineRef = useRef<HTMLSpanElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const visionChipRef = useRef<HTMLDivElement>(null);
  const visionWordsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const visionSubRef = useRef<HTMLParagraphElement>(null);
  const acctWordsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const hotspotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const credHeadingRef = useRef<HTMLDivElement>(null);
  const carbonCardRef = useRef<HTMLDivElement>(null);
  const carbonValRef = useRef<HTMLSpanElement>(null);
  const sparklineRef = useRef<SVGPolylineElement>(null);
  const featRowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progInnerRef = useRef<HTMLDivElement>(null);
  const solSectionRef = useRef<HTMLElement>(null);

  const [stats, setStats] = useState({
    sensors: '0',
    countries: '0',
    carbon: '0.0',
    uptime: '0.0',
  });
  const statsStartedRef = useRef(false);

  const acctText =
    'Our ecosystem-level accounting translates complex field science into verifiable, compliance-ready metrics — so you can drive measurable results, not just reports.';
  const acctWords = acctText.split(' ');

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const story = storyRef.current;
    if (!video || !canvas || !story) return;
    const vid = video;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const FPS = 24;
    let NF = 121;
    let frames: (Blob | null)[] = [];
    let cachedCount = 0;
    let want = 0;
    let shown = -1;
    let busy = false;

    // Grab canvas (1600x900)
    const grabCanvas = document.createElement('canvas');
    grabCanvas.width = 1600;
    grabCanvas.height = 900;
    const grabCtx = grabCanvas.getContext('2d');

    function resizeCanvas() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        if (shown >= 0 && frames[shown]) {
          renderFrame(shown);
        }
      }
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    async function renderFrame(idx: number) {
      const blob = frames[idx];
      if (!blob || !ctx || !canvas) return;
      busy = true;
      try {
        let bmp: ImageBitmap | HTMLImageElement;
        if ('createImageBitmap' in window) {
          bmp = await createImageBitmap(blob);
        } else {
          bmp = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
          });
        }

        const cw = canvas.width;
        const ch = canvas.height;
        const bw = bmp.width;
        const bh = bmp.height;
        const scale = Math.max(cw / bw, ch / bh);
        const dw = bw * scale;
        const dh = bh * scale;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;

        ctx.drawImage(bmp, dx, dy, dw, dh);
        shown = idx;

        if ('close' in bmp && typeof (bmp as ImageBitmap).close === 'function') {
          (bmp as ImageBitmap).close();
        }
      } catch {
        // Bitmap error ignore
      } finally {
        busy = false;
      }
    }

    function drawWant() {
      if (busy) return;
      const target = nearestCachedIndex(want, (i: number) => Boolean(frames[i]), NF);
      if (target >= 0 && target !== shown) {
        renderFrame(target);
      }
    }

    function grabBlob(quality = 0.86): Promise<Blob | null> {
      return new Promise((resolve) => {
        if (!grabCtx || !vid) return resolve(null);
        try {
          grabCtx.drawImage(vid, 0, 0, 1600, 900);
          grabCanvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
        } catch {
          resolve(null);
        }
      });
    }

    let rVfcId: number | null = null;
    function startCaching() {
      NF = Math.max(2, Math.round((vid.duration || 5.04) * FPS));
      frames = new Array(NF).fill(null);

      // Frame 0 first with eager grab & plate fallback
      const captureFrame0 = async () => {
        const b = await grabBlob(0.9);
        if (b && !frames[0]) {
          frames[0] = b;
          cachedCount++;
          drawWant();
          return;
        }
        try {
          const res = await fetch(ASSETS.heroStill);
          const blob = await res.blob();
          if (!frames[0]) {
            frames[0] = blob;
            cachedCount++;
            drawWant();
          }
        } catch {
          // Ignore
        }
      };
      captureFrame0();

      if ('requestVideoFrameCallback' in (vid as any)) {
        const onFrame = async (_now: number, meta: { mediaTime: number }) => {
          if (!vid.ended && !vid.paused) {
            rVfcId = (vid as any).requestVideoFrameCallback(onFrame);
          }
          const i = Math.min(NF - 1, Math.round(meta.mediaTime * FPS));
          if (i >= 0 && !frames[i]) {
            const b = await grabBlob(0.86);
            if (b && !frames[i]) {
              frames[i] = b;
              cachedCount++;
              if (i === want) drawWant();
            }
          }
        };
        rVfcId = (vid as any).requestVideoFrameCallback(onFrame);
        vid.play().catch(() => {});
      } else {
        let cur = 0;
        const seekNext = () => {
          if (cur >= NF) return;
          vid.currentTime = Math.min(cur / FPS, (vid.duration || 5.04) - 0.01);
        };
        const onSeeked = async () => {
          if (!frames[cur]) {
            const b = await grabBlob(0.86);
            if (b) {
              frames[cur] = b;
              cachedCount++;
              if (cur === want) drawWant();
            }
          }
          cur++;
          if (cur < NF) seekNext();
        };
        vid.addEventListener('seeked', onSeeked);
        seekNext();
      }
    }

    if (vid.readyState >= 2) {
      startCaching();
    } else {
      vid.addEventListener('loadeddata', startCaching, { once: true });
    }

    // Expose test hook
    (window as any).__hero = {
      ready: () => cachedCount >= NF - 2,
      settled: () => !busy && nearestCachedIndex(want, (i: number) => Boolean(frames[i]), NF) === shown,
    };

    function layoutHero() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const copy = heroCopyRef.current;
      const line = heroLineRef.current;
      if (!copy) return;

      if (W <= 820) {
        copy.style.top = '12.5vh';
        if (line) {
          line.style.fontSize = '';
          line.style.whiteSpace = 'normal';
        }
        return;
      }

      if (line) {
        line.style.whiteSpace = 'nowrap';
      }

      const bw = W * 1.06;
      const bh = H * 1.12;
      const k = Math.max(bw / 1600, bh / 900);
      const fernTop = -0.09 * H + (bh - 900 * k) / 2 + 245 * k + 0.06 * H;
      let fs = Math.min(104, 72 * k);

      if (line) {
        line.style.fontSize = `${fs}px`;
        const lineRect = line.getBoundingClientRect();
        if (lineRect.width > 0.86 * W) {
          fs = fs * ((0.86 * W) / lineRect.width);
          line.style.fontSize = `${fs}px`;
        }
      }

      const blockHeight = copy.offsetHeight || 120;
      const blockTop = fernTop + 0.5 * fs - blockHeight;
      copy.style.top = `${blockTop}px`;
    }

    layoutHero();
    window.addEventListener('resize', layoutHero);
    if ('fonts' in document) {
      document.fonts.ready.then(layoutHero);
    }

    let mx = 0;
    let my = 0;
    let sx = 0;
    let sy = 0;

    const onPointerMove = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let p = 0;
    let sp = 0;
    let lastTime = performance.now();
    let animId: number;

    const sparklineTotalLength = 245;
    if (sparklineRef.current) {
      sparklineRef.current.style.strokeDasharray = `${sparklineTotalLength}`;
      sparklineRef.current.style.strokeDashoffset = `${sparklineTotalLength}`;
    }

    function tick(now: number) {
      const dt = Math.min(64, now - lastTime);
      lastTime = now;

      if (story) {
        const storyRect = story.getBoundingClientRect();
        const totalScrollable = story.offsetHeight - window.innerHeight;
        p = totalScrollable > 0 ? clamp(-storyRect.top / totalScrollable, 0, 1) : 0;
      }

      sp += (p - sp) * (1 - Math.pow(0.86, dt / 16.7));
      if (Math.abs(p - sp) < 0.0002) sp = p;

      sx += (mx - sx) * 0.06;
      sy += (my - sy) * 0.06;

      const vp = ease(seg(sp, 0.05, 0.7));
      want = Math.round(vp * (NF - 1));
      drawWant();

      const camY = -sy * 12 + (1 - vp) * window.innerHeight * 0.06;
      const camScale = 1 + 0.02 * (1 - vp);
      const camTransform = `translate3d(${-sx * 18}px, ${camY}px, 0) scale(${camScale})`;
      if (camRef.current) camRef.current.style.transform = camTransform;
      if (camFRef.current) camFRef.current.style.transform = camTransform;

      // Handoff logic
      const ho = shown < 0 ? 0 : shown === 0 ? seg(sp, 0.06, 0.105) : 1;
      const plateOpacity = 1 - ho;
      const isHeroVisible = plateOpacity > 0.001;

      if (plateRef.current) {
        plateRef.current.style.opacity = `${plateOpacity}`;
        plateRef.current.style.visibility = isHeroVisible ? 'visible' : 'hidden';
      }
      if (camFRef.current) {
        camFRef.current.style.opacity = `${plateOpacity}`;
        camFRef.current.style.visibility = isHeroVisible ? 'visible' : 'hidden';
      }

      // Rocks
      const fp = seg(sp, 0.02, 0.2);
      const fe = fp * fp;
      if (rk1Ref.current) {
        if (fp >= 1) {
          rk1Ref.current.style.visibility = 'hidden';
        } else {
          rk1Ref.current.style.visibility = 'visible';
          const rk1X = -0.3 * fp * 70 + sx * -24 * 1.3;
          const rk1Y = -0.6 * fp * 60 + sy * -16 * 1.3;
          const rk1Scale = 1 + fe * 1.6 * 1.3;
          const rk1Blur = fe * 5 * 1.3;
          rk1Ref.current.style.transform = `translate3d(${rk1X}vw, ${rk1Y}vh, 0) scale(${rk1Scale})`;
          rk1Ref.current.style.filter = `blur(${rk1Blur}px)`;
        }
      }

      if (rk3Ref.current) {
        if (fp >= 1) {
          rk3Ref.current.style.visibility = 'hidden';
        } else {
          rk3Ref.current.style.visibility = 'visible';
          const rk3X = 1 * fp * 70 + sx * -24 * 1.8;
          const rk3Y = 0.55 * fp * 60 + sy * -16 * 1.8;
          const rk3Scale = 1 + fe * 1.6 * 1.8;
          const rk3Blur = fe * 5 * 1.8;
          rk3Ref.current.style.transform = `translate3d(${rk3X}vw, ${rk3Y}vh, 0) scale(${rk3Scale})`;
          rk3Ref.current.style.filter = `blur(${rk3Blur}px)`;
        }
      }

      // Hero Copy (L0 and L1)
      const h = seg(sp, 0.02, 0.1);
      const heroVisible = h < 1;
      if (l0Ref.current) l0Ref.current.style.visibility = heroVisible ? 'visible' : 'hidden';
      if (l1Ref.current) l1Ref.current.style.visibility = heroVisible ? 'visible' : 'hidden';

      if (heroVisible) {
        if (heroCopyRef.current) {
          heroCopyRef.current.style.transform = `translate3d(${-sx * 10}px, ${-h * 80 - sy * 6}px, 0) scale(${1 + h * 0.12})`;
          heroCopyRef.current.style.filter = `blur(${h * 14}px)`;
          heroCopyRef.current.style.opacity = `${1 - h}`;
        }
        if (hudRef.current) {
          hudRef.current.style.transform = `translate3d(${sx * 26}px, ${sy * 18 - h * 40}px, 0)`;
          hudRef.current.style.opacity = `${1 - seg(sp, 0.02, 0.08)}`;
        }
        const captionHintOpacity = 1 - seg(sp, 0.01, 0.05);
        if (captionRef.current) captionRef.current.style.opacity = `${captionHintOpacity}`;
        if (hintRef.current) hintRef.current.style.opacity = `${captionHintOpacity}`;
      }

      // Fog bank
      const fg = ease(seg(sp, 0.38, 0.47));
      if (fogRef.current) {
        if (fg <= 0) {
          fogRef.current.style.visibility = 'hidden';
        } else {
          fogRef.current.style.visibility = 'visible';
          fogRef.current.style.opacity = `${fg}`;
          fogRef.current.style.transform = `translate3d(${(fg - 1) * 18 + sx * -10}vw, ${sy * -6}px, 0)`;
        }
      }

      // Vision (L2)
      const vIn = seg(sp, 0.16, 0.27);
      const vOut = seg(sp, 0.34, 0.42);
      const isVisionActive = vIn > 0 && vOut < 1;
      if (l2Ref.current) {
        l2Ref.current.style.visibility = isVisionActive ? 'visible' : 'hidden';
      }

      if (isVisionActive) {
        const chipParaOpacity = clamp(vIn * 2 - 0.6) * (1 - vOut);
        const chipParaLift = -vOut * 50;
        if (visionChipRef.current) {
          visionChipRef.current.style.opacity = `${chipParaOpacity}`;
          visionChipRef.current.style.transform = `translate3d(0, ${chipParaLift}px, 0)`;
        }
        if (visionSubRef.current) {
          visionSubRef.current.style.opacity = `${chipParaOpacity}`;
          visionSubRef.current.style.transform = `translate3d(0, ${chipParaLift}px, 0)`;
        }

        visionWordsRef.current.forEach((wordEl, i) => {
          if (!wordEl) return;
          const k = clamp(vIn * 1.6 - i * 0.08);
          const ty = (1 - k) * 30 - vOut * 60;
          const blur = (1 - k) * 12 + vOut * 14;
          const op = k * (1 - vOut);
          wordEl.style.transform = `translate3d(0, ${ty}px, 0)`;
          wordEl.style.filter = `blur(${blur}px)`;
          wordEl.style.opacity = `${op}`;
        });
      }

      // Accounting & Hotspots (L3)
      const aIn = seg(sp, 0.45, 0.55);
      const aOut = seg(sp, 0.63, 0.68);
      const isL3Active = aIn > 0 && aOut < 1;
      if (l3Ref.current) {
        l3Ref.current.style.visibility = isL3Active ? 'visible' : 'hidden';
      }

      if (isL3Active) {
        const count = acctWordsRef.current.length || 1;
        acctWordsRef.current.forEach((wEl, i) => {
          if (!wEl) return;
          const k = clamp(aIn * 2.2 - (i / count) * 1.2);
          const op = (0.15 + 0.85 * k) * (1 - aOut);
          const blur = (1 - k) * 6 + aOut * 10;
          wEl.style.opacity = `${op}`;
          wEl.style.filter = `blur(${blur}px)`;
        });

        hotspotRefs.current.forEach((hsEl, i) => {
          if (!hsEl) return;
          const k = seg(sp, 0.49 + i * 0.02, 0.53 + i * 0.02);
          const scale = k * (1 - aOut);
          hsEl.style.transform = `translate3d(${sx * -30}px, ${sy * -20}px, 0) scale(${scale})`;
          hsEl.style.visibility = scale <= 0.001 ? 'hidden' : 'visible';
        });
      }

      // Station (L4)
      const sIn = seg(sp, 0.72, 0.82);
      const isL4Active = sIn > 0;
      if (l4Ref.current) {
        l4Ref.current.style.visibility = isL4Active ? 'visible' : 'hidden';
      }

      if (isL4Active) {
        if (credHeadingRef.current) {
          credHeadingRef.current.style.opacity = `${sIn}`;
          credHeadingRef.current.style.transform = `translate3d(0, ${(1 - sIn) * 30}px, 0)`;
          credHeadingRef.current.style.filter = `blur(${(1 - sIn) * 8}px)`;
        }

        const cIn = ease(seg(sp, 0.74, 0.86));
        if (carbonCardRef.current) {
          carbonCardRef.current.style.opacity = `${cIn}`;
          carbonCardRef.current.style.transform = `translate3d(${sx * -14}px, ${(1 - cIn) * 60 + sy * -10}px, 0) rotateY(${sx * 8}deg) rotateX(${-sy * 8}deg)`;
        }

        const carbonVal = calcAccumulatedCarbon(sp);
        if (carbonValRef.current) {
          carbonValRef.current.textContent = `${carbonVal}`;
        }

        if (sparklineRef.current) {
          const dash = calcSparklineDashOffset(sp, sparklineTotalLength);
          sparklineRef.current.style.strokeDashoffset = `${dash}`;
        }

        featRowRefs.current.forEach((rowEl, i) => {
          if (!rowEl) return;
          const k = ease(seg(sp, 0.76 + i * 0.025, 0.82 + i * 0.025));
          rowEl.style.opacity = `${k}`;
          rowEl.style.transform = `translateX(${(1 - k) * 40}px)`;
        });
      }

      // Progress bar
      if (progInnerRef.current) {
        progInnerRef.current.style.transform = `scaleX(${sp})`;
      }

      // Solutions stats trigger check
      if (solSectionRef.current && !statsStartedRef.current) {
        const solRect = solSectionRef.current.getBoundingClientRect();
        if (solRect.top <= window.innerHeight * 0.6) {
          statsStartedRef.current = true;
          animateStats();
        }
      }

      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);

    function animateStats() {
      const startTime = performance.now();
      const duration = 1600;

      function countStep(curTime: number) {
        const elapsed = curTime - startTime;
        const t = Math.min(1, elapsed / duration);
        const progress = ease(t);

        const curSensors = Math.round(1240 * progress);
        const curCountries = Math.round(38 * progress);
        const curCarbon = (2.1 * progress).toFixed(1);
        const curUptime = (99.4 * progress).toFixed(1);

        setStats({
          sensors: curSensors.toLocaleString('en-US'),
          countries: curCountries.toString(),
          carbon: curCarbon,
          uptime: curUptime,
        });

        if (t < 1) {
          requestAnimationFrame(countStep);
        } else {
          setStats({
            sensors: (1240).toLocaleString('en-US'),
            countries: '38',
            carbon: '2.1',
            uptime: '99.4',
          });
        }
      }

      requestAnimationFrame(countStep);
    }

    return () => {
      cancelAnimationFrame(animId);
      if (rVfcId !== null && 'cancelVideoFrameCallback' in vid) {
        (vid as any).cancelVideoFrameCallback(rVfcId);
      }
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('resize', layoutHero);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
  };

  const visionWords = [
    'From',
    'Data',
    'Chaos',
    'to',
    'Science-Backed,',
    'Actionable',
    'Insights',
  ];

  return (
    <div className="relative w-full overflow-x-clip bg-[var(--mist)] text-[var(--ink)]">
      {/* 3. Navigation (fixed) */}
      <nav className="nav-bar" aria-label="Main Navigation">
        {/* Logo */}
        <a href="#story" className="nav-logo" aria-label="Mossline Home">
          <svg
            className="w-[26px] h-[26px] text-current"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <path d="M16 2l12 7v14l-12 7-12-7V9z" fill="currentColor" />
            <path
              d="M16 8c-4 4-5 9-1 16 1-5 4-9 8-11-3 0-5 1-7 3 0-3 0-5 0-8z"
              fill="#c6f35c"
            />
          </svg>
          <span>Mossline</span>
        </a>

        {/* Menu */}
        <div className="nav-menu">
          <a href="#solutions" className="nav-link">
            <span>Solutions</span>
            <span className="nav-chevron" />
          </a>
          <a href="#solutions" className="nav-link">
            <span>Our tech</span>
            <span className="nav-chevron" />
          </a>
          <a href="#solutions" className="nav-link">
            <span>Company</span>
            <span className="nav-chevron" />
          </a>
          <a href="#solutions" className="nav-link">
            <span>Resources</span>
            <span className="nav-chevron" />
          </a>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsVideoModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--lime)] hover:bg-[var(--lime2)] text-[var(--ink)] text-xs font-mono font-medium uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Animate Photo (AI)</span>
          </button>

          {/* Right CTA */}
          <div className="nav-cta" role="button" tabIndex={0}>
            <span className="label">LET'S TALK</span>
            <span className="nav-cta-btn" aria-hidden="true">
              ›
            </span>
          </div>
        </div>
      </nav>

      {/* 4. Scroll Story: 640vh */}
      <section
        id="story"
        ref={storyRef}
        className="relative w-full"
        style={{ height: '640vh' }}
      >
        {/* Sticky Stage: 100vh */}
        <div
          className="sticky top-0 h-screen w-full overflow-hidden bg-[#dfe3e0]"
          style={{ height: '100vh' }}
        >
          {/* 1. Camera Box .cam */}
          <div
            ref={camRef}
            className="cam absolute will-change-transform pointer-events-none"
            style={{
              inset: '-9% -3% -3%',
              zIndex: 1,
            }}
          >
            <canvas
              id="cv"
              ref={canvasRef}
              className="absolute inset-0 w-full h-full block"
            />

            <img
              ref={plateRef}
              className="plate absolute inset-0 w-full h-full object-cover"
              src={ASSETS.heroStill}
              alt="Floating Moss Island Hero"
              loading="eager"
            />

            <div
              className="mist absolute pointer-events-none"
              style={{
                inset: '-10%',
                background: `radial-gradient(40% 30% at 20% 80%, rgba(255,255,255,0.55), transparent 70%), radial-gradient(35% 25% at 85% 30%, rgba(255,255,255,0.4), transparent 70%)`,
                animation: 'drift 18s ease-in-out infinite alternate',
              }}
            />
          </div>

          {/* 2. Hidden Video #push */}
          <video
            id="push"
            ref={videoRef}
            src={ASSETS.video}
            muted
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            className="opacity-0 pointer-events-none absolute w-[2px] h-[2px] top-0 left-0"
            aria-hidden="true"
          />

          {/* 3. Fog Bank .fog */}
          <div
            ref={fogRef}
            className="fog absolute pointer-events-none"
            style={{
              left: '-8vw',
              top: '-6vh',
              width: '56vw',
              height: '60vh',
              zIndex: 3,
              maskImage:
                'radial-gradient(ellipse 52% 48% at 46% 46%, #000 44%, rgba(0,0,0,.7) 64%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 52% 48% at 46% 46%, #000 44%, rgba(0,0,0,.7) 64%, transparent 100%)',
              visibility: 'hidden',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(60% 55% at 40% 45%, #d9dddd, #cfd4d4 60%, #c9cfcf)',
                filter: 'blur(10px)',
              }}
            />
            <div
              className="absolute"
              style={{
                inset: '-20%',
                opacity: 0.55,
                filter: 'blur(14px)',
                animation: 'fogA 26s ease-in-out infinite alternate',
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='700' height='460'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.006 0.014' numOctaves='3' seed='4'/><feColorMatrix type='matrix' values='0 0 0 0 0.74 0 0 0 0 0.78 0 0 0 0 0.79 1.4 0 0 0 -0.7'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
              }}
            />
            <div
              className="absolute"
              style={{
                inset: '-20%',
                opacity: 0.9,
                filter: 'blur(8px)',
                animation: 'fogB 19s ease-in-out infinite alternate',
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='700' height='460'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.004 0.009' numOctaves='4' seed='11'/><feColorMatrix type='matrix' values='0 0 0 0 0.90 0 0 0 0 0.92 0 0 0 0 0.92 1.6 0 0 0 -0.55'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
              }}
            />
          </div>

          {/* 4. Layer L0: Hero Headline Block */}
          <div ref={l0Ref} className="layer" style={{ zIndex: 4 }}>
            <div
              ref={heroCopyRef}
              className="hero-copy absolute left-0 right-0 text-center will-change-transform"
            >
              <div className="chip">Planet intelligence</div>
              <h1
                style={{
                  fontFamily: 'var(--sans)',
                  fontWeight: 500,
                  lineHeight: 0.92,
                  letterSpacing: '-0.045em',
                  marginTop: '18px',
                  color: 'var(--ink)',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    paddingBottom: '0.06em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    ref={heroLineRef}
                    style={{
                      display: 'inline-block',
                      animation: 'rise 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                    }}
                  >
                    Measure the Living Planet
                  </span>
                </span>
              </h1>
            </div>
          </div>

          {/* 5. Front cut-out .cam.camF */}
          <div
            ref={camFRef}
            className="cam camF absolute pointer-events-none will-change-transform"
            style={{
              inset: '-9% -3% -3%',
              zIndex: 5,
              maskImage:
                'linear-gradient(90deg, transparent 25%, #000 27.5%, #000 71.5%, transparent 74%)',
              WebkitMaskImage:
                'linear-gradient(90deg, transparent 25%, #000 27.5%, #000 71.5%, transparent 74%)',
              visibility: 'hidden',
            }}
          >
            <img
              src={ASSETS.cutout}
              alt="Foreground Island Cut-out"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* 6. Two floating rock sprites */}
          <div
            ref={rk1Ref}
            className="rock rk1 absolute overflow-hidden pointer-events-none will-change-transform"
            style={{
              left: '4%',
              top: '13%',
              width: '7.5vw',
              aspectRatio: '260 / 295',
              zIndex: 6,
            }}
          >
            <div
              className="bob absolute inset-0"
              style={{ animation: 'bob 6s ease-in-out infinite alternate' }}
            >
              <img
                src={ASSETS.spritesheet}
                alt="Floating rock left"
                style={{
                  position: 'absolute',
                  maxWidth: 'none',
                  width: `${(1200 / 260) * 100}%`,
                  left: `${(-30 / 260) * 100}%`,
                  top: `${(-200 / 295) * 100}%`,
                }}
              />
            </div>
          </div>

          <div
            ref={rk3Ref}
            className="rock rk3 absolute overflow-hidden pointer-events-none will-change-transform"
            style={{
              left: '80%',
              top: '58%',
              width: '14vw',
              aspectRatio: '265 / 270',
              zIndex: 6,
            }}
          >
            <div
              className="bob absolute inset-0"
              style={{
                animation: 'bob 8.5s ease-in-out infinite alternate',
                animationDelay: '-3s',
              }}
            >
              <img
                src={ASSETS.spritesheet}
                alt="Floating rock right"
                style={{
                  position: 'absolute',
                  maxWidth: 'none',
                  width: `${(1200 / 265) * 100}%`,
                  left: `${(-895 / 265) * 100}%`,
                  top: `${(-240 / 270) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* 7. Layer L1: Hero HUD, Caption, Scroll Hint */}
          <div ref={l1Ref} className="layer" style={{ zIndex: 7 }}>
            <div
              ref={hudRef}
              className="hud-box absolute will-change-transform"
              style={{ left: '53.5%', top: '62%' }}
            >
              <div
                className="absolute"
                style={{
                  left: '-44px',
                  top: '4px',
                  width: '22px',
                  height: '22px',
                  pointerEvents: 'none',
                }}
              >
                <div
                  className="absolute left-0 top-[10.5px] w-full h-[1px] bg-white"
                  style={{ opacity: 0.9 }}
                />
                <div
                  className="absolute top-0 left-[10.5px] h-full w-[1px] bg-white"
                  style={{ opacity: 0.9 }}
                />
              </div>

              <div className="relative inline-block">
                <div className="chip">Biodiversity</div>
                <pre
                  className="mono text-white text-[11px] leading-[1.65] mt-[12px]"
                  style={{
                    letterSpacing: '0.12em',
                    textShadow: '0 1px 6px rgba(0,0,0,.35)',
                  }}
                >
{`LAT  34.0922° N
LON 116.2432° W
ELEV 842 M`}
                </pre>
                <div className="corner-frame" />
              </div>
            </div>

            <div
              ref={captionRef}
              className="caption-box absolute left-[34px] bottom-[34px] pl-[16px] border-l-[2px] border-[var(--lime)]"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '11.5px',
                lineHeight: 1.75,
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
                color: 'var(--ink2)',
              }}
            >
              Real-time ecosystem insights.
              <br />
              Powered by science, blockchain,
              <br />
              and transparent data.
            </div>

            <div
              ref={hintRef}
              className="hint-box absolute right-[34px] bottom-[36px] flex items-center gap-[10px]"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                letterSpacing: '0.16em',
                color: 'var(--ink2)',
              }}
            >
              <div
                className="w-[20px] h-[20px] rounded-full border-[1.3px] border-[var(--ink2)] flex items-center justify-center"
                style={{ animation: 'nudge 1.6s ease-in-out infinite' }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '4px',
                    height: '4px',
                    borderRight: '1.2px solid currentColor',
                    borderBottom: '1.2px solid currentColor',
                    transform: 'translateY(-1px) rotate(45deg)',
                  }}
                />
              </div>
              <span>SCROLL TO EXPLORE</span>
            </div>
          </div>

          {/* 8. Layer L2: Vision */}
          <div ref={l2Ref} className="layer" style={{ zIndex: 8, visibility: 'hidden' }}>
            <div
              className="absolute left-1/2 top-1/2 text-center text-white"
              style={{
                transform: 'translate(-50%, -50%)',
                width: 'min(820px, 90vw)',
              }}
            >
              <div ref={visionChipRef} className="chip mb-2">
                Our vision
              </div>
              <h2
                style={{
                  fontFamily: 'var(--sans)',
                  fontWeight: 500,
                  fontSize: 'clamp(34px, 4.6vw, 70px)',
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  margin: '18px 0 20px',
                  textShadow:
                    '0 2px 40px rgba(10,30,15,.55), 0 1px 3px rgba(10,30,15,.3)',
                }}
              >
                <span className="block">
                  {visionWords.slice(0, 4).map((w, idx) => (
                    <span
                      key={idx}
                      ref={(el) => { visionWordsRef.current[idx] = el; }}
                      className="inline-block mr-[0.25em]"
                    >
                      {w}
                    </span>
                  ))}
                </span>
                <span className="block">
                  <span
                    ref={(el) => { visionWordsRef.current[4] = el; }}
                    className="inline-block"
                  >
                    {visionWords[4]}
                  </span>
                </span>
                <span className="block">
                  {visionWords.slice(5).map((w, idx) => (
                    <span
                      key={idx + 5}
                      ref={(el) => { visionWordsRef.current[idx + 5] = el; }}
                      className="inline-block mr-[0.25em]"
                    >
                      {w}
                    </span>
                  ))}
                </span>
              </h2>
              <p
                ref={visionSubRef}
                style={{
                  fontSize: '16px',
                  lineHeight: 1.45,
                  textShadow: '0 1px 14px rgba(10,30,15,.7)',
                }}
              >
                A breakthrough in environmental measurement,
                <br />
                built for commercial use.
              </p>
            </div>
          </div>

          {/* 9. Layer L3: Accounting & Hotspots */}
          <div ref={l3Ref} className="layer" style={{ zIndex: 9, visibility: 'hidden' }}>
            <p
              className="acct absolute left-[34px] top-[14vh]"
              style={{
                width: 'min(560px, 86vw)',
                color: 'var(--ink)',
                fontSize: 'clamp(20px, 1.9vw, 29px)',
                lineHeight: 1.16,
                letterSpacing: '-0.02em',
                textShadow: '0 0 24px rgba(255,255,255,.8)',
              }}
            >
              {acctWords.map((word, i) => (
                <span
                  key={i}
                  ref={(el) => { acctWordsRef.current[i] = el; }}
                  className="inline-block mr-[0.26em]"
                >
                  {word}
                </span>
              ))}
            </p>

            {HOTSPOTS.map((hs, i) => {
              const isOn = activeHotspot === i;
              return (
                <div
                  key={hs.id}
                  ref={(el) => { hotspotRefs.current[i] = el; }}
                  className={`hotspot absolute flex items-center gap-[10px] cursor-pointer ${isOn ? 'on' : ''}`}
                  style={{
                    left: hs.left,
                    top: hs.top,
                    transformOrigin: 'center center',
                  }}
                  onClick={() => setActiveHotspot(isOn ? null : i)}
                >
                  <div className="hotspot-dot">
                    <span className="hotspot-plus-h" />
                    <span className="hotspot-plus-v" />
                  </div>
                  <div
                    className="flex flex-col"
                    style={{
                      padding: '6px 9px',
                      borderRadius: '4px',
                      background: 'rgba(246,248,245,.72)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '10.5px',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--ink)',
                      }}
                    >
                      {hs.label}
                    </span>
                    <em className="hotspot-val">{hs.value}</em>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 10. Layer L4: Station */}
          <div ref={l4Ref} className="layer" style={{ zIndex: 10, visibility: 'hidden' }}>
            <div
              ref={credHeadingRef}
              className="cred absolute left-[34px] top-[13vh]"
              style={{ maxWidth: '380px' }}
            >
              <div
                className="chip mb-2"
                style={{
                  display: 'flex',
                  width: 'max-content',
                  fontSize: '10.5px',
                  padding: '4px 8px',
                  borderRadius: '3px',
                }}
              >
                ✕ Field station 07
              </div>
              <h3
                style={{
                  color: 'var(--ink)',
                  fontSize: 'clamp(22px, 2vw, 30px)',
                  lineHeight: 1.08,
                  letterSpacing: '-0.025em',
                  textShadow: '0 0 24px rgba(255,255,255,.8)',
                  fontWeight: 500,
                  marginTop: '12px',
                }}
              >
                Scientific credibility for corporate climate action
              </h3>
            </div>

            <div
              ref={carbonCardRef}
              className="carbon-card absolute text-white"
              style={{
                left: '38%',
                top: '38vh',
                width: '250px',
                padding: '18px',
                borderRadius: '10px',
                background: 'rgba(40,58,44,.32)',
                border: '1px solid rgba(255,255,255,.22)',
                backdropFilter: 'blur(16px) saturate(1.2)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
              }}
            >
              <h4 style={{ fontSize: '15px', fontWeight: 500, lineHeight: 1.2 }}>
                Accumulated carbon
                <br />
                balance
              </h4>
              <p
                className="mono mt-1"
                style={{ fontSize: '9.5px', opacity: 0.7, letterSpacing: '0.1em' }}
              >
                Plot 07 · 12 months
              </p>

              <div className="flex items-baseline gap-1 mt-4">
                <span
                  ref={carbonValRef}
                  style={{
                    fontSize: '46px',
                    fontWeight: 500,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                  }}
                >
                  0
                </span>
                <span className="mono" style={{ fontSize: '10px' }}>
                  tCO₂e
                </span>
              </div>

              <div
                className="chip absolute"
                style={{ right: '16px', top: '96px', fontSize: '9.5px', height: '20px' }}
              >
                +2.6 tCO₂e
              </div>

              <div className="mt-4">
                <svg
                  width="220"
                  height="70"
                  viewBox="0 0 220 70"
                  fill="none"
                  className="overflow-visible"
                >
                  <polyline
                    ref={sparklineRef}
                    points="0,60 30,55 60,57 90,44 120,46 150,30 180,24 214,10"
                    stroke="#c6f35c"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <circle cx="90" cy="44" r="2.4" fill="#ffffff" />
                  <circle cx="150" cy="30" r="2.4" fill="#ffffff" />
                  <circle cx="214" cy="10" r="3.4" fill="#c6f35c" />
                </svg>
              </div>

              <div
                className="mono flex justify-between mt-2 pt-2 border-t border-[rgba(255,255,255,0.15)]"
                style={{ fontSize: '10px', opacity: 0.7 }}
              >
                <span>Q1</span>
                <span>Q2</span>
                <span>Q3</span>
                <span>Q4</span>
              </div>
            </div>

            <div
              className="feats absolute right-[34px] top-[30vh]"
              style={{
                width: 'min(400px, 36vw)',
                padding: '6px 16px',
                borderRadius: '10px',
                background: 'rgba(246,248,245,.62)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
              }}
            >
              {FEATURES.map((feat, i) => {
                const isOn = activeFeature === i;
                return (
                  <div
                    key={feat.index}
                    ref={(el) => { featRowRefs.current[i] = el; }}
                    className={`feat-row ${isOn ? 'on' : ''}`}
                    onClick={() => setActiveFeature(isOn ? null : i)}
                  >
                    <span style={{ opacity: 0.6 }}>{feat.index}</span>
                    <span>{feat.text}</span>
                    <span className="feat-arrow">→</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 11. Progress bar .prog */}
          <div
            className="prog absolute left-1/2 -translate-x-1/2 bottom-[22px] overflow-hidden"
            style={{
              width: '120px',
              height: '2px',
              background: 'rgba(16,41,26,.18)',
              borderRadius: '2px',
              zIndex: 30,
            }}
          >
            <div
              ref={progInnerRef}
              className="h-full w-full"
              style={{
                background: 'var(--lime2)',
                transformOrigin: 'left center',
                transform: 'scaleX(0)',
              }}
            />
          </div>
        </div>
      </section>

      {/* 13. Solutions Section #sol */}
      <section
        id="solutions"
        ref={solSectionRef}
        className="relative z-10 bg-white"
        style={{
          marginTop: '-30vh',
          borderRadius: '22px 22px 0 0',
          padding: '70px 34px 90px',
          boxShadow: '0 -30px 60px rgba(16,41,26,.12)',
        }}
      >
        <div className="max-w-[1320px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-[40px] flex-wrap">
            <div className="max-w-[640px]">
              <div className="chip">Our solutions</div>
              <h2
                style={{
                  fontFamily: 'var(--sans)',
                  fontWeight: 500,
                  fontSize: 'clamp(34px, 3.9vw, 58px)',
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  color: 'var(--ink)',
                  marginTop: '20px',
                }}
              >
                Validating what the ecosystem does naturally
              </h2>
            </div>
            <p
              style={{
                maxWidth: '360px',
                fontSize: '15px',
                lineHeight: 1.5,
                color: '#4a5a4f',
              }}
            >
              Field sensors, atmospheric flux towers and satellite data fused into one
              auditable record — so every tonne you report can be traced back to the ground
              it came from.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px] mt-[54px]">
            {/* Card 1 */}
            <div
              className="group relative h-[440px] rounded-[12px] overflow-hidden bg-[#1b3122] text-white cursor-pointer transition-transform duration-200"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className="absolute inset-0 transition-transform duration-[1200ms]"
                style={{
                  backgroundImage: `url(${ASSETS.mastStill})`,
                  backgroundPosition: '22% 70%',
                  backgroundSize: '260%',
                  transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(10,25,15,.45), transparent 35%, transparent 55%, rgba(10,25,15,.75))',
                }}
              />
              <div className="relative h-full flex flex-col justify-between p-[18px] z-10 pointer-events-none">
                <div className="flex justify-between items-center">
                  <span
                    className="mono"
                    style={{ fontSize: '11px', letterSpacing: '0.12em' }}
                  >
                    [Nature-based solutions]
                  </span>
                  <div className="w-[28px] h-[28px] rounded-full bg-[var(--lime)] text-[var(--ink)] flex items-center justify-center font-bold text-[14px] transition-transform duration-300 group-hover:-rotate-45">
                    →
                  </div>
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: '25px',
                      fontWeight: 500,
                      letterSpacing: '-0.03em',
                      lineHeight: 1.05,
                    }}
                  >
                    Forest & peatland
                    <br />
                    carbon projects
                  </h3>
                  <div className="overflow-hidden max-h-0 group-hover:max-h-[80px] transition-all duration-[600ms] ease-in-out">
                    <p
                      className="text-white/80 mt-3"
                      style={{ fontSize: '13.5px', lineHeight: 1.45 }}
                    >
                      Continuous flux measurement replaces sampled estimates, so credits
                      reflect what the land actually absorbs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div
              className="group relative h-[440px] rounded-[12px] overflow-hidden bg-[#1b3122] text-white cursor-pointer transition-transform duration-200"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className="absolute inset-0 transition-transform duration-[1200ms]"
                style={{
                  backgroundImage: `url(${ASSETS.islandClouds})`,
                  backgroundPosition: '50% 50%',
                  backgroundSize: '190%',
                  transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(10,25,15,.45), transparent 35%, transparent 55%, rgba(10,25,15,.75))',
                }}
              />
              <div className="relative h-full flex flex-col justify-between p-[18px] z-10 pointer-events-none">
                <div className="flex justify-between items-center">
                  <span
                    className="mono"
                    style={{ fontSize: '11px', letterSpacing: '0.12em' }}
                  >
                    [Supply chain solutions]
                  </span>
                  <div className="w-[28px] h-[28px] rounded-full bg-[var(--lime)] text-[var(--ink)] flex items-center justify-center font-bold text-[14px] transition-transform duration-300 group-hover:-rotate-45">
                    →
                  </div>
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: '25px',
                      fontWeight: 500,
                      letterSpacing: '-0.03em',
                      lineHeight: 1.05,
                    }}
                  >
                    Scope 3 sourcing
                    <br />
                    verification
                  </h3>
                  <div className="overflow-hidden max-h-0 group-hover:max-h-[80px] transition-all duration-[600ms] ease-in-out">
                    <p
                      className="text-white/80 mt-3"
                      style={{ fontSize: '13.5px', lineHeight: 1.45 }}
                    >
                      Trace commodities to the plots that grew them, with
                      deforestation-free evidence attached to every shipment.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div
              className="group relative h-[440px] rounded-[12px] overflow-hidden bg-[#1b3122] text-white cursor-pointer transition-transform duration-200"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className="absolute inset-0 transition-transform duration-[1200ms]"
                style={{
                  backgroundImage: `url(${ASSETS.mastStill})`,
                  backgroundPosition: '62% 30%',
                  backgroundSize: '230%',
                  transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(10,25,15,.45), transparent 35%, transparent 55%, rgba(10,25,15,.75))',
                }}
              />
              <div className="relative h-full flex flex-col justify-between p-[18px] z-10 pointer-events-none">
                <div className="flex justify-between items-center">
                  <span
                    className="mono"
                    style={{ fontSize: '11px', letterSpacing: '0.12em' }}
                  >
                    [Biodiversity credits]
                  </span>
                  <div className="w-[28px] h-[28px] rounded-full bg-[var(--lime)] text-[var(--ink)] flex items-center justify-center font-bold text-[14px] transition-transform duration-300 group-hover:-rotate-45">
                    →
                  </div>
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: '25px',
                      fontWeight: 500,
                      letterSpacing: '-0.03em',
                      lineHeight: 1.05,
                    }}
                  >
                    Living species
                    <br />
                    baselines
                  </h3>
                  <div className="overflow-hidden max-h-0 group-hover:max-h-[80px] transition-all duration-[600ms] ease-in-out">
                    <p
                      className="text-white/80 mt-3"
                      style={{ fontSize: '13.5px', lineHeight: 1.45 }}
                    >
                      Acoustic and eDNA monitoring builds a measurable biodiversity
                      baseline you can report against year over year.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-[24px] mt-[60px] pt-[22px] border-t border-[#e0e5e0]">
            <div>
              <div
                style={{
                  fontSize: '44px',
                  fontWeight: 500,
                  letterSpacing: '-0.04em',
                  color: 'var(--ink)',
                  lineHeight: 1,
                }}
              >
                {stats.sensors}
              </div>
              <div
                className="mono mt-2"
                style={{ fontSize: '10.5px', letterSpacing: '0.14em', color: '#6a7a6f' }}
              >
                Sensors deployed
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '44px',
                  fontWeight: 500,
                  letterSpacing: '-0.04em',
                  color: 'var(--ink)',
                  lineHeight: 1,
                }}
              >
                {stats.countries}
              </div>
              <div
                className="mono mt-2"
                style={{ fontSize: '10.5px', letterSpacing: '0.14em', color: '#6a7a6f' }}
              >
                Countries monitored
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '44px',
                  fontWeight: 500,
                  letterSpacing: '-0.04em',
                  color: 'var(--ink)',
                  lineHeight: 1,
                }}
              >
                {stats.carbon}
              </div>
              <div
                className="mono mt-2"
                style={{ fontSize: '10.5px', letterSpacing: '0.14em', color: '#6a7a6f' }}
              >
                Mt CO₂e verified
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '44px',
                  fontWeight: 500,
                  letterSpacing: '-0.04em',
                  color: 'var(--ink)',
                  lineHeight: 1,
                }}
              >
                {stats.uptime}
              </div>
              <div
                className="mono mt-2"
                style={{ fontSize: '10.5px', letterSpacing: '0.14em', color: '#6a7a6f' }}
              >
                % Data uptime
              </div>
            </div>
          </div>

          {/* AI Ecosystem Animation Feature Banner */}
          <div className="mt-16 p-6 sm:p-8 rounded-2xl bg-[var(--mist)] border border-[var(--ink)]/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="chip">GEMINI OMNI FLASH</span>
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink2)]/80">INTERACTIONS API</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--ink)]">
                Animate Field Photography into Living Ecosystem Sweeps
              </h3>
              <p className="text-sm text-[var(--ink2)]/80 max-w-xl">
                Upload your ground station photos, canopy captures, or field quadrats. Our AI engine synthesizes photorealistic cinematic camera fly-throughs in 16:9 or 9:16 aspect ratios.
              </p>
            </div>
            <button
              onClick={() => setIsVideoModalOpen(true)}
              className="px-5 py-3 rounded-lg bg-[var(--lime)] hover:bg-[var(--lime2)] text-[var(--ink)] font-mono text-xs font-semibold uppercase tracking-wider transition-all shadow hover:shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Video Animator</span>
            </button>
          </div>
        </div>
      </section>

      {/* Video Animator Modal */}
      <VideoAnimatorModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
      />
    </div>
  );
}
