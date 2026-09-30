// 31 · "The Lord God received the pleasing scent / and said within himself:"
// The smoke of the offering climbs into a high, clear sky, and the camera tilts up with it. The words
// rise inside the smoke, the name in the sacred register, thinning as they go up.
import { keys, ease, grade, linesFrom, clean, clamp01 } from '/song/lib/look.js';
import { GROUND_GLSL, GROUND_UNIFORMS } from '/song/lib/ground.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('The Lord God received', 'and said within himself');

export default (P) => ({
  name: 's31-smoke', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: GROUND_GLSL + /* glsl */ `
float smoke(vec3 p) {
  if (p.y < 1.2) return 0.0;
  float h = p.y - 1.2;
  vec3 q = p;
  q.x -= 0.25 * h + 0.6 * sin(h * 0.12 + uTime * 0.15) ;                // drifting in a light breeze
  float r = length(q.xz) / (0.3 + 0.09 * h);
  vec3 f = vec3(q.x, h - uTime * 1.3, q.z) * 0.45;
  float n = fbm(f, 5);
  return sat((1.0 - r) * 1.2 + (n - 0.5) * 1.8) * exp(-h * 0.035) * 0.8;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = groundScene(ro, rd, depth);
  // the smoke, lit warm on the sun side
  vec3 L = vec3(0); float T = 1.0;
  float jit = hash12(fc + fract(uTime * 3.7) * 31.0);
  float t0 = max(0.0, length(ro.xz) - 12.0), dt = 0.5;
  for (int i = 0; i < 72; i++) {
    float tt = t0 + (float(i) + jit) * dt;
    if (tt > depth) break;
    vec3 p = ro + rd * tt;
    float d = smoke(p);
    if (d > 0.01) {
      float lit = exp(-smoke(p + SUN * 0.8) * 2.0);
      vec3 sc = mix(vec3(0.42, 0.4, 0.4), vec3(1.25, 1.02, 0.78), lit) * (0.55 + 0.45 * sat(p.y / 30.0));
      float a = 1.0 - exp(-d * dt * 1.4);
      L += T * a * sc;
      T *= 1.0 - a;
      if (T < 0.02) break;
    }
  }
  c = c * T + L;
  return c;
}`,
  uniforms: { ...GROUND_UNIFORMS, uGreen: 0.7, uWet: 0, uGLine: 0.2, uSunDir: [-0.6, 0.35, -0.7], uSunCol: [7, 5.6, 4] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    return { pos: [3.0, 1.5, -14.0], target: [0.5 + 2.0 * p, 3.0 + 26.0 * p, 0.0], fov: 50, roll: 0 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  post(t) { return grade(t, { exposure: 1.0, saturation: 1.05 }); },
});
