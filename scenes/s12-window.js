// 12 · "After forty days, Noe opened / the window he had made in the ark."
// Inside the dark hold. On "opened" the hatch swings up and a bar of daylight crosses the air to the
// floor. The second line is carried by that light: the window projects it onto the boards.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01 } from '/song/lib/look.js';
import { HOLD_GLSL, HOLD_UNIFORMS } from '/song/lib/hold.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('After forty days', 'the window he had made');
const opened = L1.words.find((w) => w.w.startsWith('opened'));

export default (P) => ({
  name: 's12-window', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: HOLD_GLSL + /* glsl */ `
uniform vec3 uBeamC, uBeamX;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 5.13) * 77.0);
  float depth;
  vec3 c = holdScene(ro, rd, jit, depth);
  return c;
}`,
  uniforms: { ...HOLD_UNIFORMS, uGobo: 0, uSeams: 0.4, uSunDir: [0.85, 0.42, 0.22], uSunCol: [9, 8.8, 8.6], uFill: 0.3, uBeamC: [2.35, 1.85, 21.5], uBeamX: [-0.87, 0, 0.48] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    return { pos: [-1.9 + 0.9 * p, 2.2 - 0.2 * p, 15.6 + 1.5 * p], target: [2.0, 1.9, 22.0], fov: 48, roll: 0.02 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.5, aspect: 16 / 9 }); },
  update(t, u) {
    u.uWin.value = ease.inOut3((t - (opened.start - 0.1)) / 1.1);
  },
  post(t) { return grade(t, { exposure: keys(t, [[P.from, 2.2], [opened.start, 2.0], [opened.start + 1.2, 1.0]]), bloom: 0.1 }); },
});
