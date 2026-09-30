// 21 · "In Noe's six hundred first year, / first month, the first day,"
// A split-flap board over the dawn water: the year, month and day flip through their figures and lock
// on the words that name them, and the gauge beneath reads the flood gone.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01, SIGNAL } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('In Noe', 'first month, the first day');
const find = (L, s) => L.words.find((w) => clean(w.w).toLowerCase().startsWith(s));

export default (P) => ({
  name: 's21-flap', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: SEA_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  return c;
}`,
  uniforms: { ...SEA_UNIFORMS, uNight: 0.0, uWind: 0.06, uSunDir: [0.0, 0.03, 1.0], uSunCol: [1.6, 1.1, 0.7], uLineGlow: 1.3 },
  camera(t) {
    const p = (t - P.from) / (P.to - P.from);
    return { pos: [0, 0.9 + 0.3 * p, 0], target: [0, 0.95 + 0.3 * p, 50], fov: 36, roll: 0 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) { u.uWarm.value = warmth(t) + 0.15; },
  post(t) { return grade(t, { exposure: 0.95 }); },
});
