// 09 · "The waters kept on falling / until the tenth month."
// Low over the flood beneath the ark's mountain. The gold tide mark slides down the rock, leaving
// fainter rings where the water stood; the words ride down with it.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01 } from '/song/lib/look.js';
import { MOUNTAIN_GLSL, MOUNTAIN_UNIFORMS } from '/song/lib/mountain.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('The waters kept on falling', 'until the tenth month');

export default (P) => ({
  name: 's09-tide', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: MOUNTAIN_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = mountainScene(ro, rd, jit, depth);
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
});
