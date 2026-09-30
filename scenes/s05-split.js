// 05 · "The springs of the deep were closed, / heaven's floodgates shut;"
// The lens sits exactly at the water's surface: the gold waterline wavers across the frame, the deep
// below with its springs rising, the sky above with its clouds closing. The first line lives under
// the water, the second in the sky, and each closes like a shutter toward the line as it ends.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01 } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('The springs of the deep', 'heaven');

export default (P) => ({
  name: 's05-split', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: SEA_GLSL + /* glsl */ `
uniform float uSprings;   // 1 = springs flowing, 0 = closed
uniform float uGates;     // 0 = clouds open, 1 = shut
vec3 deep(vec3 ro, vec3 rd) {
  // murky water lit from above in shifting shafts
  float y = rd.y;
  vec3 c = mix(vec3(0.012, 0.03, 0.036), vec3(0.08, 0.14, 0.15), sat(y * 1.5 + 0.8));
  vec2 sp = vec2(atan(rd.x, rd.z) * 6.0, 0.0);
  float shafts = pow(vnoise(vec2(sp.x * 1.8 + uTime * 0.3, 0.0)), 3.0) * smoothstep(-0.5, 0.2, y);
  c += vec3(0.1, 0.16, 0.16) * shafts * 0.9;
  // springs: columns of bubbles rising from the floor, slowing to nothing as they close
  vec3 acc = vec3(0);
  for (int k = 0; k < 14; k++) {
    float zp = 2.0 + float(k) * 1.1;
    float t = (zp - ro.z) / rd.z;
    if (t <= 0.2) continue;
    vec3 p = ro + rd * t;
    float col = floor(p.x / 1.7);
    if (hash11(col + float(k) * 7.0) > 0.35) continue;
    float cx = (col + 0.5) * 1.7 + (hash11(col * 3.1 + float(k)) - 0.5);
    float rise = uTime * 0.9 + hash11(col + 9.0) * 10.0;
    float yy = p.y + rise;
    float cell = floor(yy / 0.18);
    float bx = cx + (hash11(cell + col) - 0.5) * 0.25 + 0.05 * sin(yy * 6.0);
    vec2 q = vec2(p.x - bx, fract(yy / 0.18) * 0.18 - 0.09);
    float r = 0.012 + 0.02 * hash11(cell * 1.7 + col);
    float alive = step(hash11(cell + col * 5.0), uSprings);
    float d = length(q);
    float pw = t * 2.0 * tan(radians(uFov) * 0.5) / uRes.y;
    float ring = sat(1.0 - abs(d - r) / (pw * 1.5 + 0.003)) + 0.3 * sat((r - d) / pw);
    acc += ring * alive * vec3(0.5, 0.65, 0.66) * 0.4 * exp(-t * 0.08) * step(p.y, -0.1);
  }
  return c + acc;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  // the surface right at the lens: a wavering meniscus
  float meniscus = 0.12 * seaH(ro.xz + vec2(rd.x / max(rd.z, 0.2), 1.0) * 0.6, 3) - ro.y;
  float s = rd.y * 0.6 - meniscus;
  vec3 c;
  if (s < 0.0) {
    c = deep(ro, rd);
  } else {
    float depth;
    c = seaScene(ro, rd, depth);
    // the floodgates: cloud closing over the sky
    vec2 uv = rd.xz / (rd.y + 0.05);
    float cl = fbm(uv * 0.5 + vec2(uTime * 0.03, 0), 5);
    float shut = smoothstep(1.0 - uGates, 1.0 - uGates + 0.25, cl + 0.25 * rd.y);
    c = mix(c, vec3(0.2, 0.22, 0.25) * (0.7 + 0.5 * cl), shut * smoothstep(0.0, 0.1, rd.y));
  }
  // the gold waterline where air meets water
  float px = abs(s) * uRes.y / (2.0 * tan(radians(uFov) * 0.5)) / 0.6;
  c += LINE_GOLD * (exp(-px * px * 0.5) * 2.6 + exp(-px * 0.08) * 0.25) * uLineGlow;
  return c;
}`,
  uniforms: { ...SEA_UNIFORMS, uNight: 0.2, uWind: 0.15, uSprings: 1, uGates: 0, uSunDir: [0.2, 0.2, 1.0], uSunCol: [0.8, 0.84, 0.9] },
  camera(t) {
    const p = (t - P.from) / (P.to - P.from);
    return { pos: [0, 0.0, keys(t, [[P.from, 0], [P.to, 5]])], target: [0.4 * Math.sin(p * 2), 0.0, 40], fov: 46, roll: 0.02 * Math.sin(t * 0.8) };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) {
    u.uSprings.value = keys(t, [[L1.start, 1], [L1.end, 0.0, ease.inOut3]]);
    u.uGates.value = keys(t, [[L2.start - 0.2, 0.05], [L2.end, 1.05, ease.inOut3]]);
    u.uWarm.value = warmth(t);
  },
  post(t) { return grade(t, { exposure: 1.1, bloom: 0.1 }); },
});
