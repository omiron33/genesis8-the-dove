// 18 · "At evening she came back, / an olive leaf held in her beak."
// Slow motion, low over the water in the first warm light of the film: an evening sun behind her,
// the porcelain dove comes back, and the camera drifts round to find the olive leaf lit green.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01, gauge, paintHere } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { BIRD_GLSL } from '/song/lib/bird.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('At evening she came back', 'an olive leaf held');

export default (P) => ({
  name: 's18-evening', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: SEA_GLSL + BIRD_GLSL + /* glsl */ `
uniform float uYaw, uPh;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  vec3 lp, lrd;
  vec3 bird = vec3(0.0, 1.2 + 0.015 * sin(uPh + 1.0), 0.0);
  float tb = birdMarch(ro, rd, bird, uYaw, 0.05, 1.0, uPh, 1.0, 1.0, lp, lrd);
  if (tb > 0.0 && tb < depth) c = birdShade(lp, lrd, uYaw, 0.05, uPh, 1.0, 1.0, SUN, uSunCol * 2.2, skyCol(vec3(0, 1, 0)) * 1.2, 0.0);
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  return c;
}`,
  uniforms: { ...SEA_UNIFORMS, uNight: 0.0, uWind: 0.05, uYaw: 0, uPh: 0, uSunDir: [-0.3, 0.07, -1.0], uSunCol: [1.6, 1.0, 0.6], uLineGlow: 1.0 },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    const a = 1.95 - 0.85 * p, r = 1.8 - 0.75 * p;
    return { pos: [Math.cos(a) * r + 0.03, 1.18 + 0.05 * p, Math.sin(a) * r], target: [0.08, 1.2, 0], fov: 30, roll: 0.03 - 0.05 * p };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.3, aspect: 16 / 9 }); },
  update(t, u) { u.uPh.value = (t - P.from) * 1.3 * 6.2831; u.uWarm.value = 0.55; u.uYaw.value = 0.0; },
  post(t) { return grade(t, { exposure: 1.0, saturation: 1.05, gain: [1.03, 0.99, 0.94] }); },
  drawText(ctx, t) {
    const row = (L, x, y, px, italic, out) => {
      ctx.font = `${italic ? 'italic ' : ''}500 ${px}px "EB Garamond"`; ctx.letterSpacing = `${-0.01 * px}px`;
      for (const w of L.words) {
        const s = clean(w.w).replace(/[;,.]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.45);
        if (k > 0) { paintHere(ctx, s, x, y + (1 - k) * 30, (k * out).toFixed(3)); }
        x += paintHere(ctx, s, 0, 0, 0);
      }
    };
    row(L1, 200, 1760, 200, false, 1 - clamp01((t - (L2.start - 0.4)) / 0.4));
    row(L2, 200, 1760, 200, true, 1);
  },
});
