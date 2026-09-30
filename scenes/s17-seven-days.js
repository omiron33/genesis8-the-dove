// 17 · "He waited seven more days, / then sent the dove out again."
// Through the open window, seven days and nights pass in the light on the timber. Seven gold marks
// are counted beside the lyric, one for each day. Then the dove leaves through the window again.
import { keys, ease, grade, linesFrom, clean, clamp01, dayCount, SIGNAL } from '/song/lib/look.js';
import { HOLD_GLSL, HOLD_UNIFORMS } from '/song/lib/hold.js';
import { BIRD_GLSL } from '/song/lib/bird.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('He waited seven more days', 'then sent the dove out again');

export default (P) => {
  const d0 = L1.start - 0.2, d1 = L2.start - 0.3;          // the seven days pass between these
  const day = (t) => clamp01((t - d0) / (d1 - d0)) * 7;    // 0..7
  const light = (t) => { const d = day(t); if (d <= 0 || d >= 7) return 1; return 0.08 + 0.92 * Math.pow(0.5 + 0.5 * Math.cos(d * 2 * Math.PI), 1.5); };
  const leave = L2.words.find((w) => w.w.startsWith('dove')).start;
  const birdPos = (t) => {
    const u = Math.max(0, t - leave);
    return [2.6 + 1.6 * u + 0.4 * u * u, 2.3 + 0.2 * u, 22.0 + 0.3 * u];
  };
  return {
    name: 's17-seven-days', from: P.from, to: P.to,
    textSize: [3840, 2160],
    frag: HOLD_GLSL + BIRD_GLSL + /* glsl */ `
uniform vec3 uBird; uniform float uYaw, uPh, uDay, uShowBird;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 5.13) * 77.0);
  float depth;
  vec3 c = holdScene(ro, rd, jit, depth);
  if (uShowBird > 0.5) {
    vec3 lp, lrd;
    float tb = birdMarch(ro, rd, uBird, uYaw, 0.0, 1.0, uPh, 0.0, 1.0, lp, lrd);
    if (tb > 0.0 && tb < depth) {
      vec3 l = uLampPos - uBird;
      c = birdShade(lp, lrd, uYaw, 0.0, uPh, 0.0, 1.0, SUN, uSunCol * 0.2, vec3(0.5, 0.52, 0.55), 0.0) + vec3(1.0, 0.62, 0.3) * uLamp * 0.2 / (dot(l, l) + 0.3);
    }
  }
  return c;
}`,
    uniforms: { ...HOLD_UNIFORMS, uWin: 1, uSeams: 0.3, uFill: 0.1, uLamp: 4, uLampPos: [2.3, 1.55, 20.9], uSunDir: [0.85, 0.42, 0.22], uSunCol: [6, 6, 6.2],
      uBird: [2.6, 2.3, 22], uYaw: 0, uPh: 0, uDay: 1, uShowBird: 0 },
    camera(t) {
      const p = ease.inOut3((t - P.from) / (P.to - P.from));
      return { pos: [0.2 + 0.6 * p, 2.3, 18.6 + 0.6 * p], target: [4.0, 2.5, 22.3], fov: 40, roll: 0.0 };
    },
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.4, aspect: 16 / 9 }); },
    update(t, u) {
      const l = light(t);
      u.uSunCol.value.set(6 * l, 6 * l, 6.4 * l);
      u.uLamp.value = 4 + 3 * (1 - l);
      u.uShowBird.value = t > leave - 0.6 ? 1 : 0;
      const b = birdPos(t), b2 = birdPos(t + 0.05);
      u.uBird.value.set(...b);
      u.uYaw.value = -Math.atan2(b2[2] - b[2], b2[0] - b[0]);
      u.uPh.value = (t - P.from) * 2.4 * 6.2831;
    },
    post(t) { return grade(t, { exposure: 1.1 + 0.5 * (1 - light(t)) }); },
  };
};
