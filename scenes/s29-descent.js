// 29 · "Noe came out with his wife, / his sons and their wives. / Every beast and herd, / every bird and
// creeping thing, / each by its kind, / came out of the ark."
// Ararat again, now in full morning colour: green on the lower slopes, the water gone to a far bright
// line. The lines come down the frame like a path descending the mountain, switching back and forth,
// each one a step lower than the last.
import { keys, ease, grade, linesFrom, clean, clamp01, gauge, paintHere, widthHere } from '/song/lib/look.js';
import { MOUNTAIN_GLSL, MOUNTAIN_UNIFORMS } from '/song/lib/mountain.js';
import { HORIZON_GLSL } from '/song/scenes/s10-deck.js';
import { cameraPlane } from '/engine.js';

const LS = linesFrom('Noe came out with his wife', 'his sons and their wives', 'Every beast and herd', 'every bird and creeping', 'each by its kind', 'came out of the ark');

export default (P) => ({
  name: 's29-descent', from: P.from, to: P.to,
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
  uniforms: { ...MOUNTAIN_UNIFORMS, uMist: -1, uWater: -0.35, uTide: 0.6, uGreen: 1, uWarm: 1, uLineGlow: 0.5, uSunDir: [-0.7, 0.35, 0.55], uSunCol: [7.5, 6.4, 5.0] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    return { pos: [3.2 - 1.8 * p, 1.5 - 0.4 * p, 2.0 + 3.0 * p], target: [-0.4, 0.8 - 0.1 * p, 14.5], fov: 36, roll: -0.02 + 0.03 * p };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.3, aspect: 16 / 9 }); },
  update(t, u) {},
  post(t) { return grade(t, { exposure: 1.0, saturation: 1.1 }); },
  drawText(ctx, t) {
    gauge(ctx, t, 150, 180, { alpha: 0.75, size: 44, color: '255, 255, 255' });
    // a switchback path down the frame: lines alternate sides, each one lower
    LS.forEach((L, i) => {
      const y = 720 + i * 240, left = i % 2 === 0;
      const px = i === 0 ? 170 : 150;
      ctx.font = `${i % 2 ? 'italic ' : ''}500 ${px}px "EB Garamond"`; ctx.letterSpacing = '-1px';
      const ws = L.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.:]+$/, '') }));
      const tot = widthHere(ctx, ws.map((w) => w.s));
      let x = left ? 260 + i * 60 : 3580 - tot - i * 60;
      for (const w of ws) {
        const k = ease.out3((t - w.start + 0.1) / 0.4);
        // words step down onto their line from the one above
        if (k > 0) { paintHere(ctx, w.s, x, y - (1 - k) * 120, k.toFixed(3)); }
        x += paintHere(ctx, w.s, 0, 0, 0);
      }
    });
  },
});
