// 10 · "On the first day of month ten," · instrumental · "the mountain peaks came into view."
// One continuous shot low over the flood. The date arrives; through the instrumental the water keeps
// falling and the first dark tips break the surface far ahead; on the sung line the sea drops away
// and Ararat rises out of it, streaming, its gold tide line sliding down the rock.
import { keys, ease, grade, warmth, linesFrom, clean, annotate, gauge, clamp01, paintHere, widthHere, SIGNAL } from '/song/lib/look.js';
import { MOUNTAIN_GLSL, MOUNTAIN_UNIFORMS } from '/song/lib/mountain.js';
import { HORIZON_GLSL } from '/song/scenes/s10-deck.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('On the first day of month ten', 'the mountain peaks came into view');

export default (P) => ({
  name: 's10-emerge', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: MOUNTAIN_GLSL + HORIZON_GLSL + /* glsl */ `
uniform float uLineGlow;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = mountainScene(ro, rd, jit, depth);
  if (depth > 70.0) c += horizonLine(rd, uLineGlow);
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  return c;
}`,
  uniforms: { ...MOUNTAIN_UNIFORMS, uMist: -1, uWater: 3.2, uTide: 1.3, uRings: 0.12, uArkOn: 1, uLineGlow: 0.9, uSunDir: [-0.85, 0.13, 0.42], uSunCol: [6.5, 5.4, 4.2] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    // skim just above the falling water, then lift and pull back as the massif rises
    const water = keys(t, [[P.from, 3.2], [L2.start - 0.4, 2.35, ease.inOut3], [L2.end + 0.2, 0.55, ease.inOut3], [P.to, 0.45]]);
    const y = water + keys(t, [[P.from, 0.04], [L2.start - 0.4, 0.06], [P.to, 0.9, ease.inOut3]]);
    return { pos: [2.6 - 1.2 * p, y, -4.5 + 3.5 * p], target: [-0.5, y - 0.02 + 0.3 * ease.inOut3((t - L2.start) / 3), 14.5], fov: keys(t, [[P.from, 38], [P.to, 32]]), roll: -0.015 + 0.02 * p };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.3, aspect: 16 / 9 }); },
  update(t, u) {
    u.uWater.value = keys(t, [[P.from, 3.2], [L2.start - 0.4, 2.35, ease.inOut3], [L2.end + 0.2, 0.55, ease.inOut3], [P.to, 0.45]]);
    u.uWarm.value = warmth(t) + 0.2;
  },
  post(t) { return grade(t, { exposure: 1.0 }); },
  drawText(ctx, t) {
    gauge(ctx, t, 150, 180, { alpha: 0.75, size: 44 });
    const row = (L, y, px, italic, alpha) => {
      ctx.font = `${italic ? 'italic ' : ''}500 ${px}px "EB Garamond"`; ctx.letterSpacing = '-1px';
      let x = 200;
      for (const w of L.words) {
        const s = clean(w.w).replace(/[;,.:]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.45);
        if (k > 0) paintHere(ctx, s, x, y + (1 - k) * 30, k * alpha);
        x += paintHere(ctx, s, 0, 0, 0);
      }
    };
    row(L1, 560, 210, false, 1 - clamp01((t - (L1.end + 3.0)) / 1.0));
    // the date holds through the instrumental, ruled with the waterline gold
    const d = clamp01((t - (L1.end + 3.2)) / 1.2) * (1 - clamp01((t - (L2.start - 0.8)) / 0.6));
    if (d > 0) {
      annotate(ctx, 'MONTH 10   ·   DAY 1', 1920, 1560, { size: 64, alpha: 0.9 * d, align: 'center', tracking: 0.45 });
      ctx.fillStyle = `rgba(${SIGNAL}, ${(0.85 * d).toFixed(3)})`;
      const w = 900 * ease.out3((t - (L1.end + 3.2)) / 3.0);
      ctx.fillRect(1920 - w / 2, 1620, w, 4);
      annotate(ctx, 'THE WATERS KEPT ON FALLING', 1920, 1730, { size: 40, alpha: 0.75 * d, align: 'center', tracking: 0.5 });
    }
    if (t > L2.start - 0.4) row(L2, 560, 250, false, 1);
  },
});
