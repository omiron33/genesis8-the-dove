// 23 · "Noe opened the ark's covering"
// Looking straight up inside the hold: the roof boards are lifted away one run after another and
// the sky floods in. Each word rises off the frame with the boards, carried up into the light.
import { keys, ease, grade, linesFrom, clean, clamp01 } from '/song/lib/look.js';
import { HOLD_GLSL, HOLD_UNIFORMS } from '/song/lib/hold.js';
import { cameraPlane } from '/engine.js';

const [L1] = linesFrom('Noe opened the ark');

export default (P) => ({
  name: 's23-covering', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: HOLD_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 5.13) * 77.0);
  float depth;
  vec3 c = holdScene(ro, rd, jit, depth);
  return c;
}`,
  uniforms: { ...HOLD_UNIFORMS, uRoof: 0, uLand: 1, uSeams: 1, uFill: 0.1, uSunDir: [0.3, 0.9, 0.25], uSunCol: [8, 7.4, 6.4] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    return { pos: [0.4, 1.7, 27.0 + 1.5 * p], target: [0.1, 6.5, 31.5 + 1.0 * p], fov: 62 - 6 * p, roll: 0.25 + 0.2 * p };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.5, aspect: 16 / 9 }); },
  update(t, u) { u.uRoof.value = keys(t, [[L1.start - 0.2, 0.0], [L1.end + 0.3, 0.72, ease.inOut3]]); },
  post(t) { return grade(t, { exposure: keys(t, [[P.from, 1.9], [L1.end, 1.0]]), bloom: 0.12, saturation: 1.05 }); },
});
