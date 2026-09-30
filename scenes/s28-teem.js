// 28 · "Let them teem and multiply; / let them fill the earth."
// A blue morning over the green land. One bird, then two, four, a hundred: the flock doubles on the
// beat until a murmuration fills the sky. The word "multiply" multiplies with it, filling the frame
// in a widening field before the last line settles.
import { keys, ease, grade, linesFrom, clean, clamp01 } from '/song/lib/look.js';
import { GROUND_GLSL, GROUND_UNIFORMS } from '/song/lib/ground.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('Let them teem and multiply', 'let them fill the earth');
const mult = L1.words.find((w) => w.w.startsWith('multiply'));

export default (P) => ({
  name: 's28-teem', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: GROUND_GLSL + /* glsl */ `
uniform float uCount;   // how full the sky is, 0..1 (log scale of the flock)
// a flock as small birds on world-fixed sheets across the sky, each flapping, drifting in a flow
vec3 flock(vec3 ro, vec3 rd, vec3 c) {
  for (int k = 0; k < 10; k++) {
    float zp = 14.0 + float(k) * 7.0;
    float t = (zp - ro.z) / rd.z;
    if (t <= 0.0) continue;
    vec3 p = ro + rd * t;
    if (p.y < 1.0) continue;
    // the flock's shape: a drifting murmuration cloud
    vec2 fp = p.xy * 0.035 + vec2(uTime * 0.05, 0.0);
    float cloud = smoothstep(0.42, 0.62, fbm(fp + vec2(float(k) * 0.15, 0.0), 4) + 0.2 * sin(p.x * 0.05 + uTime * 0.4));
    vec2 flow = vec2(uTime * 3.0, 0.8 * sin(uTime * 0.7 + p.x * 0.03));
    vec2 q = p.xy - flow;
    vec2 cell = vec2(0.9, 0.75);
    vec2 cid = floor(q / cell);
    float h = hash12(cid + float(k) * 17.0);
    // birds appear in order of their hash as the count rises: doubling reads as doubling
    if (h > uCount * cloud * 1.6) continue;
    vec2 f = q - (cid + 0.5 + (hash22(cid + 3.1) - 0.5) * 0.6) * cell;
    float ph = uTime * 9.0 + h * 30.0;
    float wing = 0.25 * sin(ph);
    float s = 0.3 + 0.12 * hash12(cid + 9.0);
    vec2 l = f / s;
    // a bird seen from below: two swept wings from a small body
    float d = length(l) - 0.12;
    vec2 lw = vec2(abs(l.x), l.y);
    vec2 a = vec2(0.0), b = vec2(0.9, wing + 0.1);
    vec2 pa = lw - a, ba = b - a;
    float hh = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    d = min(d, length(pa - ba * hh) - 0.07 * (1.0 - hh));
    float pw = t * 2.0 * tan(radians(uFov) * 0.5) / uRes.y / s;
    float cov = sat((pw * 0.8 - d) / (pw * 1.6));
    c = mix(c, vec3(0.06, 0.06, 0.07), cov * exp(-t * 0.004));
  }
  return c;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = groundScene(ro, rd, depth);
  if (depth > 1e3) c = flock(ro, rd, c);
  return c;
}`,
  uniforms: { ...GROUND_UNIFORMS, uGreen: 1, uWet: 0, uGLine: 0.25, uCount: 0, uSunDir: [0.4, 0.55, -0.6], uSunCol: [7, 6.6, 6] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    return { pos: [0, 1.7, 0], target: [0, 1.7 + 22 - 8 * p, 40], fov: 60 - 4 * p, roll: 0.02 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) {
    // doubling on the beat from "teem" to the end of the first line, then full
    const k = clamp01((t - L1.words[2].start) / (L1.end + 1.2 - L1.words[2].start));
    u.uCount.value = t < L1.words[2].start ? 0.002 : Math.min(1, Math.pow(2, k * 11) / 2048);
  },
  post(t) { return grade(t, { exposure: 1.0, saturation: 1.1 }); },
});
