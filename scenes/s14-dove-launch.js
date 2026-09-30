// 14 · "Then he sent a dove to learn / if waters had withdrawn from earth."
// Slow motion beside the dark hull: a porcelain-white dove leaves the window and beats out over the
// grey water. Each word opens like a wing as it is sung, pivoting out from its folded edge.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01 } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { BIRD_GLSL } from '/song/lib/bird.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('Then he sent a dove', 'if waters had withdrawn');

export default (P) => {
  const birdPos = (t) => {
    const u = t - P.from;
    // leaves the window at the left, passes close, then climbs away
    const away = Math.max(0, u - 3.5);
    return [-0.2 + 1.3 * u + 0.4 * away, 2.1 + 0.05 * u + 0.1 * Math.sin(u * 2.4) + 0.25 * away, 3.4 - 0.9 * away * away];
  };
  const camera = (t) => {
    const u = t - P.from;
    return { pos: [-1.0 + 1.3 * u, 1.9, 5.3], target: [-0.4 + 1.3 * u, 2.25, -4], fov: 34, roll: -0.01 };
  };
  return {
    name: 's14-dove-launch', from: P.from, to: P.to,
    textSize: [3840, 2160],
    frag: SEA_GLSL + BIRD_GLSL + /* glsl */ `
uniform vec3 uBird; uniform float uYaw, uPh, uBank;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  vec3 lp, lrd;
  float tb = birdMarch(ro, rd, uBird, uYaw, uBank, 1.0, uPh, 0.0, 1.0, lp, lrd);
  if (tb > 0.0 && tb < depth) c = birdShade(lp, lrd, uYaw, uBank, uPh, 0.0, 1.0, SUN, uSunCol * 1.5, skyCol(vec3(0, 1, 0)) * 1.1, 0.0);
  return c;
}`,
    uniforms: { ...SEA_UNIFORMS, uNight: 0.2, uWind: 0.12, uBird: [0, 2, 3], uYaw: 0, uPh: 0, uBank: 0, uSunDir: [-0.4, 0.45, 1.0], uSunCol: [1.1, 1.05, 1.0], uArkDist: 0 },
    camera,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const b = birdPos(t), b2 = birdPos(t + 0.05);
      u.uBird.value.set(...b);
      u.uYaw.value = -Math.atan2(b2[2] - b[2], b2[0] - b[0]);
      u.uBank.value = 0.12 * Math.sin((t - P.from) * 0.8);
      u.uPh.value = (t - P.from) * 1.5 * 6.2831;      // slowed wingbeat
      u.uWarm.value = warmth(t);
    },
    post(t) { return grade(t, { exposure: 1.02 }); },
  };
};
