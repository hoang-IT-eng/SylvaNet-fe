/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function clamp(val: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, val));
}

export function seg(p: number, a: number, b: number): number {
  if (b === a) return p >= a ? 1 : 0;
  return clamp((p - a) / (b - a), 0, 1);
}

export function ease(t: number): number {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export interface HeroLayoutParams {
  W: number;
  H: number;
  lineNaturalWidth?: number;
  blockHeight?: number;
}

export interface HeroLayoutResult {
  bw: number;
  bh: number;
  k: number;
  fernTop: number;
  fs: number;
  blockTop: number;
  isMobile: boolean;
}

export function layoutHeroMetrics({
  W,
  H,
  lineNaturalWidth = 0,
  blockHeight = 0,
}: HeroLayoutParams): HeroLayoutResult {
  if (W <= 820) {
    return {
      bw: W * 1.06,
      bh: H * 1.12,
      k: 1,
      fernTop: 0,
      fs: 44,
      blockTop: 0,
      isMobile: true,
    };
  }

  const bw = W * 1.06;
  const bh = H * 1.12;
  const k = Math.max(bw / 1600, bh / 900);
  const fernTop = -0.09 * H + (bh - 900 * k) / 2 + 245 * k + 0.06 * H;
  let fs = Math.min(104, 72 * k);

  if (lineNaturalWidth > 0 && W > 0) {
    const maxWidth = 0.86 * W;
    if (lineNaturalWidth > maxWidth) {
      fs = fs * (maxWidth / lineNaturalWidth);
    }
  }

  const blockTop = fernTop + 0.5 * fs - blockHeight;

  return {
    bw,
    bh,
    k,
    fernTop,
    fs,
    blockTop,
    isMobile: false,
  };
}

export function nearestCachedIndex(
  want: number,
  isCached: (idx: number) => boolean,
  NF: number
): number {
  if (NF <= 0) return 0;
  const clampedWant = Math.max(0, Math.min(NF - 1, Math.round(want)));
  if (isCached(clampedWant)) return clampedWant;

  const maxDist = Math.max(clampedWant, NF - 1 - clampedWant);
  for (let d = 1; d <= maxDist; d++) {
    const prev = clampedWant - d;
    if (prev >= 0 && isCached(prev)) return prev;
    const next = clampedWant + d;
    if (next < NF && isCached(next)) return next;
  }
  return -1;
}

export function calcAccumulatedCarbon(sp: number): number {
  return Math.round(24 * seg(sp, 0.76, 0.9));
}

export function calcSparklineDashOffset(sp: number, fullLength: number): number {
  const prog = seg(sp, 0.77, 0.92);
  return fullLength * (1 - prog);
}
