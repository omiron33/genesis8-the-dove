// 07 · "After one hundred fifty days / they had fallen; the ark came to rest,"
// A counter rolls to 150 like the drum of a gauge while the camera rises over the calming sea and
// the ark far below; on "rest" the counter locks and the whole frame settles.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01, SIGNAL } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('After one hundred fifty days', 'they had fallen');
const rest = L2.words.find((w) => w.w.startsWith('rest')).start;

export default (P) => ({
  name: 's07-days', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: SEA_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  return c;
}`,
  uniforms: { ...SEA_UNIFORMS, uNight: 0.5, uWind: 0.1, uArkDist: 480, uLineGlow: 0.7, uSunDir: [0.4, 0.18, 1.0], uSunCol: [0.85, 0.87, 0.9] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (rest + 0.8 - P.from));
    const settle = Math.exp(-Math.max(0, t - rest) * 3) * Math.sin(Math.max(0, t - rest) * 9) * 0.6;
    const pos = [-40 + 25 * p, 10 + 40 * p + settle, 40 * p];
    return { pos, target: [110, -10, 480], fov: keys(t, [[P.from, 38], [P.to, 30]]), roll: 0.02 * (1 - p) };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) { u.uWarm.value = warmth(t); u.uWind.value = keys(t, [[P.from, 0.2], [rest, 0.02]]); },
  post(t) { return grade(t, { exposure: 1.0, vignette: 0.55 }); },
});
