/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  seg,
  ease,
  layoutHeroMetrics,
  nearestCachedIndex,
  calcAccumulatedCarbon,
  calcSparklineDashOffset,
} from './mossline-math.ts';

test('clamp restricts values to min and max', () => {
  assert.equal(clamp(-0.5, 0, 1), 0);
  assert.equal(clamp(1.5, 0, 1), 1);
  assert.equal(clamp(0.42, 0, 1), 0.42);
});

test('seg computes clamped segment progress', () => {
  assert.equal(seg(0.1, 0.2, 0.8), 0);
  assert.ok(Math.abs(seg(0.5, 0.2, 0.8) - 0.5) < 1e-10);
  assert.equal(seg(0.9, 0.2, 0.8), 1);
});

test('ease calculates cubic in-out', () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(0.5), 0.5);
  assert.equal(ease(1), 1);
  assert.ok(ease(0.2) < 0.2);
  assert.ok(ease(0.8) > 0.8);
});

test('layoutHeroMetrics computes correct scales for desktop and mobile', () => {
  const desktop = layoutHeroMetrics({
    W: 1600,
    H: 900,
    lineNaturalWidth: 1000,
    blockHeight: 120,
  });
  assert.equal(desktop.isMobile, false);
  assert.ok(desktop.fs > 0 && desktop.fs <= 104);
  assert.ok(Number.isFinite(desktop.blockTop));

  const mobile = layoutHeroMetrics({
    W: 400,
    H: 800,
  });
  assert.equal(mobile.isMobile, true);
});

test('nearestCachedIndex searches outward correctly', () => {
  const cached = new Set([0, 10, 12, 50]);
  const isCached = (idx: number) => cached.has(idx);

  assert.equal(nearestCachedIndex(0, isCached, 121), 0);
  assert.equal(nearestCachedIndex(11, isCached, 121), 10);
  assert.equal(nearestCachedIndex(13, isCached, 121), 12);
  assert.equal(nearestCachedIndex(45, isCached, 121), 50);
});

test('accumulated carbon counts from 0 to 24 in range 0.76 to 0.90', () => {
  assert.equal(calcAccumulatedCarbon(0.70), 0);
  assert.equal(calcAccumulatedCarbon(0.76), 0);
  assert.equal(calcAccumulatedCarbon(0.83), 12);
  assert.equal(calcAccumulatedCarbon(0.90), 24);
  assert.equal(calcAccumulatedCarbon(0.95), 24);
});

test('sparkline dash offset diminishes from full length to 0', () => {
  const fullLength = 300;
  assert.equal(calcSparklineDashOffset(0.70, fullLength), 300);
  assert.equal(calcSparklineDashOffset(0.92, fullLength), 0);
  assert.equal(calcSparklineDashOffset(1.0, fullLength), 0);
});
