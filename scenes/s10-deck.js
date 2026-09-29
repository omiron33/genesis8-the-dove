// 10 · "On the first day of month ten," and the instrumental after it.
// A long, slow aerial above a sea of cloud that hides the flood. The date arrives in the gauge
// voice; through the instrumental the camera drifts toward the massif, still buried in cloud.
import { keys, ease, grade, warmth, linesFrom, clean, annotate, gauge, clamp01, SIGNAL } from '/song/lib/look.js';
import { MOUNTAIN_GLSL, MOUNTAIN_UNIFORMS } from '/song/lib/mountain.js';
import { cameraPlane } from '/engine.js';

const [L1] = linesFrom('On the first day of month ten');

export const HORIZON_GLSL = /* glsl */ `
vec3 horizonLine(vec3 rd, float glow) {
  float w = abs(rd.y + 0.004) * uRes.y / (2.0 * tan(radians(uFov) * 0.5));
  return GOLD * (exp(-w * w * 0.9) * 2.6 + exp(-w * 0.06) * 0.2) * glow;
}`;

export default (P) => ({
  name: 's10-deck', from: P.from, to: P.to,
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
  uniforms: { ...MOUNTAIN_UNIFORMS, uMist: 1.3, uWater: -0.25, uLineGlow: 0.7, uSunDir: [-0.85, 0.13, 0.42], uSunCol: [6.0, 5.4, 4.6] },
  camera(t) {
    const p = (t - P.from) / (P.to - P.from);
    return { pos: [2.8 - 0.6 * p, 3.7 + 0.05 * Math.sin(p * 3), -6.5 + 5.5 * p], target: [-0.3, 3.15, 14.5], fov: 34, roll: -0.02 + 0.03 * p };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.3, aspect: 16 / 9 }); },
  update(t, u) { u.uWarm.value = warmth(t) + 0.15; u.uMist.value = keys(t, [[P.from, 3.4], [P.to, 3.35]]); },
  post(t) { return grade(t, { exposure: 0.92 }); },
  drawText(ctx, t) {
    const out = 1 - clamp01((t - (L1.end + 2.5)) / 1.0);
    ctx.globalAlpha = out;
    ctx.font = '500 230px "EB Garamond"'; ctx.letterSpacing = '-2px';
    let x = 200;
    for (const w of L1.words) {
      const s = clean(w.w).replace(/[;,.]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.45);
      if (k > 0) { ctx.fillStyle = `rgba(30, 38, 46, ${k.toFixed(3)})`; ctx.fillText(s, x, 620 + (1 - k) * 30); }
      x += ctx.measureText(s + ' ').width;
    }
    ctx.globalAlpha = 1;
    // the instrumental: the date holds in the gauge voice, the waterline under it
    const d = clamp01((t - (L1.end + 3.2)) / 1.2) * (1 - clamp01((t - (P.to - 1.2)) / 1.0));
    if (d > 0) {
      annotate(ctx, 'MONTH 10   ·   DAY 1', 1920, 1000, { size: 64, color: '30, 38, 46', alpha: 0.9 * d, align: 'center', tracking: 0.45 });
      ctx.fillStyle = `rgba(${SIGNAL}, ${(0.8 * d).toFixed(3)})`;
      const w = 900 * ease.out3((t - (L1.end + 3.2)) / 3.0);
      ctx.fillRect(1920 - w / 2, 1060, w, 4);
      annotate(ctx, 'THE TOPS OF THE MOUNTAINS', 1920, 1170, { size: 40, color: '30, 38, 46', alpha: 0.7 * d, align: 'center', tracking: 0.5 });
    }
    gauge(ctx, t, 150, 180, { alpha: 0.7 * clamp01((t - P.from) / 0.5), size: 44, color: '30, 38, 46' });
  },
});
