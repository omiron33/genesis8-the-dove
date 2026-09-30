// 10 · "On the first day of month ten," and the instrumental after it.
// A long, slow aerial above a sea of cloud that hides the flood. The date arrives in the gauge
// voice; through the instrumental the camera drifts toward the massif, still buried in cloud.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01, SIGNAL } from '/song/lib/look.js';
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
});
