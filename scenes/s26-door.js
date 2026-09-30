// 26 · "Come out of the ark, / you, your wife, your sons, / and your sons' wives with you."
// The great door lowers into a ramp and morning pours in along the floor. The words stand in the
// doorway, cut from the dark against the green land outside, as the camera walks toward the light.
import { keys, ease, grade, linesFrom, clean, clamp01 } from '/song/lib/look.js';
import { HOLD_GLSL, HOLD_UNIFORMS } from '/song/lib/hold.js';

const [L1, L2, L3] = linesFrom('Come out of the ark', 'you, your wife, your sons', 'and your sons');

export default (P) => ({
  name: 's26-door', from: P.from, to: P.to,
  textSize: [4096, 1536],
  frag: HOLD_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 5.13) * 77.0);
  float depth;
  vec3 c = holdScene(ro, rd, jit, depth);
  return c;
}`,
  uniforms: { ...HOLD_UNIFORMS, uLand: 1, uSeams: 1, uFill: 0.12, uSunDir: [0.18, 0.42, 1.0], uSunCol: [9.0, 7.6, 5.8] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    return { pos: [0.7 - 0.7 * p, 1.6 + 0.1 * p, 15.0 + 15.5 * p], target: [0.1 * (1 - p), 2.2, 40], fov: keys(t, [[P.from, 44], [P.to, 38]]), roll: 0.02 * (1 - p) };
  },
  update(t, u) { u.uOpen.value = keys(t, [[P.from, 0.12], [L1.start, 0.14], [L1.end + 0.4, 1.0, ease.inOut3]]); },
  post(t) { return grade(t, { exposure: keys(t, [[P.from, 2.4], [L1.start + 0.3, 2.0], [L1.end + 0.5, 1.0, ease.inOut3]]), bloom: 0.12, saturation: 1.08 }); },
});
