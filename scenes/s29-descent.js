// 29 · "Noe came out with his wife, / his sons and their wives. / Every beast and herd, / every bird and
// creeping thing, / each by its kind, / came out of the ark."
// Ararat again, now in full morning colour: green on the lower slopes, the water gone to a far bright
// line. The lines come down the frame like a path descending the mountain, switching back and forth,
// each one a step lower than the last.
import { keys, ease, grade, linesFrom, clean, clamp01 } from '/song/lib/look.js';
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
});
