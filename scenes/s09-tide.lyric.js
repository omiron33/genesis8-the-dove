// The words of s09-tide, drawn as their own layer over the picture.
// 09 · "The waters kept on falling / until the tenth month."
// Low over the flood beneath the ark's mountain. The gold tide mark slides down the rock, leaving
// fainter rings where the water stood; the words ride down with it.
import { keys, ease, grade, warmth, linesFrom, clean, gauge, clamp01, paintHere } from '/song/lib/type.js';
import { MOUNTAIN_GLSL, MOUNTAIN_UNIFORMS } from '/song/lib/mountain.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('The waters kept on falling', 'until the tenth month');

const __scene = (P) => ({
  name: 's09-tide', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: MOUNTAIN_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = mountainScene(ro, rd, jit, depth);
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  return c;
}`,
  uniforms: { ...MOUNTAIN_UNIFORMS, uRel: 1, uWater: -0.05, uTide: 1.2, uRings: 0.009, uMist: -1, uSunDir: [-0.4, 0.45, -0.6], uSunCol: [8, 8, 8.4] },
  camera(t) {
    const p = (t - P.from) / (P.to - P.from);
    return { pos: [0.3 - 0.25 * p, keys(t, [[P.from, 0.02], [P.to, -0.04]]), -2.4 + 0.25 * p], target: [0.0, -0.03 - 0.03 * p, 0.0], fov: 22, roll: 0 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.05, aspect: 16 / 9 }); },
  update(t, u) {
    u.uWater.value = keys(t, [[P.from, -0.045], [P.to, -0.095]], ease.inOut3);
    u.uWarm.value = warmth(t);
  },
  post(t) { return grade(t, { exposure: 1.05 }); },
  drawText(ctx, t) {
    gauge(ctx, t, 150, 180, { alpha: 0.75, size: 44 });
    // the lines drift down the frame with the water
    const drop = ease.inOut3((t - P.from) / (P.to - P.from)) * 120;
    const row = (L, x, y, px, italic) => {
      ctx.font = `${italic ? 'italic ' : ''}500 ${px}px "EB Garamond"`; ctx.letterSpacing = `${-0.01 * px}px`;
      for (const w of L.words) {
        const s = clean(w.w).replace(/[;,.]+$/, '');
        const k = ease.out3((t - w.start + 0.1) / 0.4);
        const sink = ease.inOut3((t - w.end) / 2.0) * 50;
        if (k > 0) { paintHere(ctx, s, x, y + drop + sink - (1 - k) * 40, k.toFixed(3)); }
        x += paintHere(ctx, s, 0, 0, 0);
      }
    };
    row(L1, 200, 1420, 200, false);
    row(L2, 520, 1680, 200, true);
  },
});

export default (P) => { const s = __scene(P); return { textSize: s.textSize, textPlane: s.textPlane, drawText: s.drawText, shade: 1.0 }; };
