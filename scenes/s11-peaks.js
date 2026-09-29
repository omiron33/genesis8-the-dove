// 11 · "the mountain peaks came into view."
// The approved test shot: as the words are sung the cloud deck sinks and the snow-lined peaks rise
// through it, the gold line of the horizon behind them.
import { keys, ease, grade, warmth, linesFrom, clean, annotate, gauge, clamp01 } from '/song/lib/look.js';
import { MOUNTAIN_GLSL, MOUNTAIN_UNIFORMS } from '/song/lib/mountain.js';
import { HORIZON_GLSL } from '/song/scenes/s10-deck.js';
import { cameraPlane } from '/engine.js';

const [L1] = linesFrom('the mountain peaks came into view');

export default (P) => ({
  name: 's11-peaks', from: P.from, to: P.to,
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
    vec4 tx = texture(uText, tp.xy);
    c = c * (1.0 - tx.a) + tx.rgb;
  }
  return c;
}`,
  uniforms: { ...MOUNTAIN_UNIFORMS, uMist: 1.2, uWater: -0.25, uLineGlow: 0.7, uSunDir: [-0.85, 0.13, 0.42], uSunCol: [6.5, 5.4, 4.2] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    return { pos: [2.2 - 0.9 * p, 3.65 - 1.75 * p, -1.0 + 3.4 * p], target: [-0.5, 3.1 - 1.85 * p, 14.5], fov: keys(t, [[P.from, 34], [P.to, 29]]), roll: -0.01 + 0.02 * p };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.3, aspect: 16 / 9 }); },
  update(t, u) {
    u.uWarm.value = warmth(t) + 0.25;
    u.uMist.value = keys(t, [[P.from, 3.35], [L1.start, 3.0], [L1.end + 0.2, 0.55, ease.inOut3], [P.to, 0.45]]);
  },
  post(t) { return grade(t, { exposure: 0.92 }); },
  drawText(ctx, t) {
    ctx.font = '500 250px "EB Garamond"'; ctx.letterSpacing = '-2px';
    let x = 200;
    for (const w of L1.words) {
      const s = clean(w.w).replace(/[;,.]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.45);
      if (k > 0) { ctx.fillStyle = `rgba(30, 38, 46, ${k.toFixed(3)})`; ctx.fillText(s, x, 560 + (1 - k) * 30); }
      x += ctx.measureText(s + ' ').width;
    }
    gauge(ctx, t, 150, 180, { alpha: 0.7, size: 44, color: '30, 38, 46' });
  },
});
