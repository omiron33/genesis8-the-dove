// Inside the ark: a long timber hold (x -4..4 m, y 0..5.2 m, z -6..40 m) with ribs, posts, beams and a
// seamed roof; a window hatch in the right-hand wall, the great door in the far end, and a roof
// covering that can be taken off. Light enters as sun through whatever is open. The window can act
// as a projector: the lyric texture shapes the patch of light it throws.
export const HOLD_GLSL = /* glsl */ `
uniform float uOpen;      // door: 0 shut .. 1 lowered to a ramp
uniform float uWin;       // window hatch: 0 shut .. 1 open
uniform float uRoof;      // roof covering taken off from the far end: 0 .. 1
uniform float uGobo;      // 1 = the window light carries the lyric
uniform float uLand;      // outside: 0 flood (grey sea) .. 1 dry green land
uniform float uLamp;      // a small oil lamp's strength
uniform vec3 uLampPos;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform float uSeams;
uniform float uFill;      // dim ambient in the hold     // how much light the roof seams let through
#define SUN normalize(uSunDir)
const float ZD = 40.0;
const vec3 WIN = vec3(4.0, 2.75, 22.0);   // window centre on the right-hand wall
const vec2 WINH = vec2(1.15, 0.65);        // half width (z) and half height (y)

float planksAlong(vec3 p, float w, float gap) { float c = mod(p.x + 20.0, w) - w * 0.5; return abs(c) - (w * 0.5 - gap); }

vec2 holdMap(vec3 p) {
  float inner = -sdBox(p - vec3(0, 2.6, 17.0), vec3(4.0, 2.6, 23.0));
  float d = max(inner, sdBox(p - vec3(0, 2.6, 17.0), vec3(4.35, 2.95, 23.35)));
  float m = 1.0;
  float seam = planksAlong(p, 0.28, 0.006 + 0.012 * step(0.8, hash11(floor((p.x + 20.0) / 0.28))));
  if (uSeams > 0.0) d = max(d, -max(abs(p.y - 5.38) - 0.4, -seam));
  // the covering taken off
  if (uRoof > 0.0) d = max(d, -sdBox(p - vec3(0, 5.6, ZD - uRoof * 23.0), vec3(3.9, 0.6, uRoof * 23.0)));
  float zc = mod(p.z + 0.8, 1.6) - 0.8;
  float rib = max(sdBox(vec3(p.x, p.y - 2.6, zc), vec3(4.0, 2.6, 0.14)), -sdBox(vec3(p.x, p.y - 2.4, zc), vec3(3.62, 2.42, 1.0)));
  rib = max(rib, p.z - (ZD - 0.4));
  float beam = max(sdBox(vec3(p.x, p.y - 4.55, zc), vec3(4.0, 0.16, 0.12)), p.z - (ZD - 0.4));
  float post = max(sdBox(vec3(abs(p.x) - 1.9, p.y - 2.3, mod(p.z + 1.6, 3.2) - 1.6), vec3(0.13, 2.3, 0.13)), p.z - (ZD - 1.2));
  float solid = min(rib, min(beam, post));
  if (solid < d) { d = solid; m = 2.0; }
  // window opening and its hatch, hinged along the top and swung up and out
  float wh = sdBox(p - WIN, vec3(0.8, WINH.y, WINH.x));
  if (p.x > 3.5) d = max(d, -wh);
  vec3 q = p - vec3(4.35, WIN.y + WINH.y, WIN.z);
  q.xy = rot(-uWin * 1.25) * q.xy;
  float hatch = sdBox(q - vec3(0.06, -WINH.y, 0.0), vec3(0.06, WINH.y + 0.02, WINH.x + 0.03));
  if (hatch < d) { d = hatch; m = 3.0; }
  // the door in the far end, a leaf hinged at the sill
  float hole = sdBox(p - vec3(0, 2.1, ZD), vec3(2.2, 2.1, 0.8));
  if (p.z > ZD - 0.5) d = max(d, -hole);
  vec3 r = p - vec3(0, 0.0, ZD + 0.05);
  r.yz = rot(uOpen * 1.45) * r.yz;
  float leaf = sdBox(r - vec3(0, 2.1, 0.09), vec3(2.25, 2.12, 0.09));
  if (leaf < d) { d = leaf; m = 3.0; }
  float g = p.y + 0.9 + 0.3 * fbm(p.xz * 0.05, 3);
  if (p.z > ZD + 0.3 && g < d) { d = g; m = 4.0; }
  return vec2(d, m);
}
vec2 holdMarch(vec3 ro, vec3 rd) {
  float t = 0.01; float m = 0.0;
  for (int i = 0; i < 220; i++) {
    vec2 h = holdMap(ro + rd * t);
    if (abs(h.x) < 0.0005 * t) { m = h.y; break; }
    t += h.x * 0.9;
    if (t > 200.0) break;
  }
  return vec2(t, m);
}
vec3 holdNormal(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.001;
  return normalize(e.xyy * holdMap(p + e.xyy).x + e.yyx * holdMap(p + e.yyx).x + e.yxy * holdMap(p + e.yxy).x + e.xxx * holdMap(p + e.xxx).x);
}
float holdShadow(vec3 ro, vec3 rd) {
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 56; i++) {
    vec3 p = ro + rd * t;
    if (p.y > 5.8 || p.z > ZD + 0.6 || p.x > 4.5) break;
    float h = holdMap(p).x;
    res = min(res, 24.0 * h / t);
    t += clamp(h, 0.005, 0.5);
    if (res < 0.001) break;
  }
  return sat(res);
}
float holdAO(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 5; i++) { float h = 0.04 * float(i * i); o += (h - holdMap(p + n * h).x) * s; s *= 0.65; }
  return sat(1.0 - 1.4 * o);
}
vec3 holdOutside(vec3 rd) {
  float y = rd.y;
  vec3 flood = mix(mix(vec3(0.7, 0.74, 0.78), vec3(0.42, 0.46, 0.52), sat(y * 2.0)), vec3(0.05, 0.07, 0.08), smoothstep(0.0, -0.03, y));
  vec3 land = mix(vec3(1.25, 1.05, 0.85), vec3(0.3, 0.52, 0.95), sat(y * 3.0));
  float az = atan(rd.x, rd.z);
  float ridge = 0.035 + 0.05 * fbm(vec2(az * 3.0, 1.0), 5) + 0.03 * fbm(vec2(az * 9.0, 4.0), 4);
  float hill = smoothstep(ridge + 0.002, ridge - 0.002, y);
  land = mix(land, mix(vec3(0.34, 0.46, 0.3), vec3(0.6, 0.7, 0.62), sat(y / ridge)), hill * 0.9);
  land = mix(land, vec3(0.2, 0.34, 0.1) * (0.8 + 0.5 * fbm(rd.xz / (y - 0.01) * 0.5, 4)), smoothstep(0.0, -0.05, y));
  vec3 c = mix(flood, land * 0.6, uLand);
  c += uSunCol * pow(max(dot(rd, SUN), 0.0), 200.0) * 0.4;
  return c * clamp(length(uSunCol) / 10.0, 0.05, 1.3);
}
vec3 holdWood(vec3 p, vec3 n, float m) {
  vec3 a = abs(n);
  float across, along;
  if (m == 1.0) {
    if (a.y > 0.5) { across = p.x; along = p.z; } else if (a.x > 0.5) { across = p.y; along = p.z; } else { across = p.y; along = p.x; }
  } else {
    if (a.z > 0.5) { across = p.x; along = p.y; } else if (a.x > 0.5) { across = p.z; along = p.y; } else { across = p.z; along = p.x; }
    if (p.y > 4.3 && a.y < 0.5) { across = p.y; along = p.x; }
  }
  float w = m == 1.0 ? 0.28 : 0.3;
  float board = floor(across / w);
  float bh = hash11(board * 1.37 + m * 11.0);
  float warp = fbm(vec2(across * 6.0, along * 0.35 + bh * 20.0), 3);
  float fib = fbm(vec2(across * 55.0 + bh * 40.0, along * 1.6 + warp * 2.0), 4);
  float rings = 0.5 + 0.5 * sin(across * 140.0 + warp * 22.0 + bh * 50.0);
  vec3 c = mix(vec3(0.19, 0.115, 0.065), vec3(0.34, 0.215, 0.12), fib * 0.7 + rings * 0.18);
  c *= 0.75 + 0.45 * bh;
  float pitch = smoothstep(0.45, 0.75, fbm(vec2(along * 0.4, across * 0.8) + p.y * 0.3, 4)) * 0.55;
  c = mix(c, vec3(0.035, 0.026, 0.02), pitch);
  float e = abs(fract(across / w) - 0.5) * w;
  return c * (0.25 + 0.75 * smoothstep(w * 0.5 - 0.004, w * 0.5 - 0.012, e));
}
// window as projector: where does the sun ray through p cross the window, and what does the lyric say there
float goboAt(vec3 p) {
  if (uGobo < 0.5 || SUN.x <= 0.01) return 1.0;
  float s = (4.0 - p.x) / SUN.x;
  vec3 q = p + SUN * s;
  vec2 uv = vec2((WIN.z - q.z) / (2.0 * WINH.x) + 0.5, (q.y - WIN.y) / (2.0 * WINH.y) + 0.5);
  if (any(lessThan(uv, vec2(0))) || any(greaterThan(uv, vec2(1)))) return 1.0;
  return mix(0.3, 1.6, texture(uText, vec2(uv.x, uv.y * 0.5)).a);   // the lower half of the text canvas
}
vec3 holdScene(vec3 ro, vec3 rd, float jit, out float depth) {
  vec2 h = holdMarch(ro, rd);
  vec3 col;
  float tHit = h.x;
  if (h.y < 0.5 || h.y > 3.5) {
    if (h.y > 3.5) {
      vec3 p = ro + rd * h.x;
      vec3 n = holdNormal(p);
      vec3 alb = mix(vec3(0.30, 0.26, 0.18), vec3(0.22, 0.30, 0.12), smoothstep(0.4, 0.7, fbm(p.xz * 0.3, 4)));
      col = alb * uSunCol * sat(dot(n, SUN)) * 0.18 + alb * vec3(0.6, 0.75, 1.0) * 0.35;
      col = mix(col, holdOutside(rd) * 0.9, 1.0 - exp(-max(h.x - 20.0, 0.0) * 0.02));
    } else { col = holdOutside(rd); tHit = 1e3; }
  } else {
    vec3 p = ro + rd * h.x;
    vec3 n = holdNormal(p);
    vec3 alb = holdWood(p, n, h.y);
    float sh = holdShadow(p + n * 0.003, SUN) * goboAt(p);
    float dif = sat(dot(n, SUN));
    float oc = holdAO(p, n);
    float doorLight = uOpen * exp(-(ZD - p.z) * 0.09) * (0.35 + 0.65 * sat(dot(n, vec3(0, 0.3, 1.0))));
    float winLight = uWin * exp(-length(p - WIN) * 0.35) * (0.4 + 0.6 * sat(dot(n, vec3(1.0, 0.2, 0.0)))) * 0.6;
    float roofLight = uRoof * sat(n.y) * smoothstep(ZD - uRoof * 46.0 - 4.0, ZD - uRoof * 46.0 + 2.0, p.z);
    col = alb * uSunCol * dif * sh * 0.8;
    col += alb * vec3(1.0, 0.92, 0.82) * (doorLight * 2.2 + winLight + roofLight * 1.2) * oc;
    col += alb * vec3(0.9, 0.72, 0.55) * uFill * oc * (0.5 + 0.5 * sat(n.y + 0.5));
    if (uLamp > 0.0) {
      vec3 l = uLampPos - p; float dl = length(l);
      col += alb * vec3(1.0, 0.62, 0.3) * uLamp * sat(dot(n, l / dl)) / (dl * dl + 0.2);
    }
    col += uSunCol * pow(sat(dot(reflect(rd, n), SUN)), 24.0) * 0.08 * sh;
  }
  // light in the air
  const int N = 36;
  float tEnd = min(tHit, 60.0), dt = tEnd / float(N);
  vec3 L = vec3(0); float T = 1.0;
  float phase = 0.08 + 0.9 * pow(max(dot(rd, SUN), 0.0), 8.0);
  for (int i = 0; i < N; i++) {
    float t = (float(i) + jit) * dt;
    vec3 p = ro + rd * t;
    if (p.z > ZD + 0.3) break;
    float dens = (0.018 + 0.03 * fbm(p * 0.9 + vec3(0, uTime * 0.08, uTime * 0.05), 3)) * (1.0 - 0.6 * uOpen * smoothstep(ZD - 12.0, ZD, p.z));
    float v = holdShadow(p, SUN) * goboAt(p);
    float door = uOpen * exp(-(ZD - p.z) * 0.2) * 0.03;
    vec3 lamp = uLamp > 0.0 ? vec3(1.0, 0.62, 0.3) * uLamp * 0.02 / (dot(uLampPos - p, uLampPos - p) + 0.3) : vec3(0);
    L += T * (uSunCol * v * phase * 2.2 + vec3(1.0, 0.9, 0.8) * door + lamp) * dens * dt;
    T *= exp(-dens * dt * 0.8);
  }
  depth = tHit;
  return col * T + L;
}
`;

export const HOLD_UNIFORMS = { uOpen: 0, uWin: 0, uRoof: 0, uGobo: 0, uLand: 0, uLamp: 0, uLampPos: [2.5, 1.6, 21.5], uSunDir: [0.8, 0.45, 0.2], uSunCol: [7.0, 6.6, 6.2], uSeams: 1, uFill: 0.08 };
