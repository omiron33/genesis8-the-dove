// 01 · 0–15.5 · instrumental. The gold waterline draws itself across a dark silver sea; the gauge
// ignites; the camera skims the swell toward the horizon.
import { keys, ease, grade, warmth, clamp01, SIGNAL } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { cameraPlane } from '/engine.js';

export default (P) => ({
  name: 's01-line', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: SEA_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  // title and gauge, set on a plane just in front of the lens
  return c;
}`,
  uniforms: { ...SEA_UNIFORMS, uNight: 0.35, uWind: 0.25, uLine: 0, uSunDir: [0.0, 0.05, 1.0], uSunCol: [0.8, 0.82, 0.86] },
  camera(t) {
    const pos = [0, keys(t, [[P.from, 1.1], [P.to, 2.4]]), keys(t, [[P.from, 0], [P.to, 38]], (x) => x)];
    return { pos, target: [0, pos[1] * 0.35, pos[2] + 60], fov: 38, roll: 0.01 * Math.sin(t * 0.7) };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) {
    // the line draws from the centre outward on the first bar, then breathes with the music
    u.uLine.value = ease.out3((t - 0.25) / 3.2) * 1.2;
    u.uLineGlow.value = 0.6 + 0.4 * ease.out3((t - 0.25) / 1.5);
    u.uNight.value = keys(t, [[0, 0.45], [15.5, 0.25]]);
    u.uWarm.value = warmth(t);
  },
  post(t) { return grade(t, { exposure: keys(t, [[0, 0.0], [0.6, 0.85, ease.out3], [15.5, 1.0]]), bloom: 0.1 }); },
});
