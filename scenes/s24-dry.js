// 24 · "and saw the ground was dry. / In month two, on day twenty-seven,"
// From the ark's roof the camera tilts from the horizon down onto the ground: cracked silt, drying in
// the sun. The date is set as a ledger entry in the gauge voice, ruled with the gold line.
import { keys, ease, grade, linesFrom, clean, clamp01, SIGNAL } from '/song/lib/look.js';
import { GROUND_GLSL, GROUND_UNIFORMS } from '/song/lib/ground.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('and saw the ground was dry', 'In month two');

export default (P) => ({
  name: 's24-dry', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: GROUND_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = groundScene(ro, rd, depth);
  return c;
}`,
  uniforms: { ...GROUND_UNIFORMS, uWet: 0.35, uGLine: 0.7 },
  camera(t) {
    const tilt = ease.inOut3((t - (L1.start - 0.3)) / 3.2);
    const p = (t - P.from) / (P.to - P.from);
    return { pos: [0, 14 - 2 * p, -2 + 3 * p], target: [0, 14 - 16 * tilt - 2 * p, 30 - 12 * tilt], fov: 44, roll: 0 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) { u.uWet.value = keys(t, [[P.from, 0.4], [P.to, 0.05]]); u.uGLine.value = 0.7 * (1 - ease.inOut3((t - L1.end) / 2)); },
  post(t) { return grade(t, { exposure: 1.0 }); },
});
