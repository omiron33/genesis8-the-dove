// 08 · "in month seven, day twenty-seven, / on Ararat's mountains."
// The ark has come to rest on a high saddle, the flood still just below it. The camera orbits the
// hull; the date is stamped in the gauge voice as the words arrive, the mountain's name in the lyric voice.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01, SIGNAL } from '/song/lib/look.js';
import { MOUNTAIN_GLSL, MOUNTAIN_UNIFORMS } from '/song/lib/mountain.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('in month seven', 'on Ararat');

export default (P) => ({
  name: 's08-ararat-ark', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: MOUNTAIN_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = mountainScene(ro, rd, jit, depth);
  return c;
}`,
  uniforms: { ...MOUNTAIN_UNIFORMS, uRel: 1, uWater: -0.03, uTide: 1, uMist: -1, uSunDir: [-0.6, 0.38, 0.5], uSunCol: [8.5, 8.5, 8.8] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    const a = 4.25 + 0.75 * p;
    const r = 0.52 - 0.16 * p;
    return { pos: [Math.cos(a) * r, 0.24 - 0.09 * p, Math.sin(a) * r], target: [0, 0.004, 0], fov: 32, roll: 0.02 - 0.03 * p };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.05, aspect: 16 / 9 }); },
  update(t, u) { u.uWarm.value = warmth(t); u.uWater.value = keys(t, [[P.from, -0.02], [P.to, -0.035]]); },
  post(t) { return grade(t, { exposure: 1.0 }); },
});
