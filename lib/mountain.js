// Ararat: an eroded, snow-lined massif (units: km) rising from the flood, a cloud deck that can sink,
// the flood's surface at uWater with the gold tide mark where it meets the rock, and the ark on a
// high saddle. Scenes include MOUNTAIN_GLSL and call mountainScene().
import { ARK_GLSL } from '/song/lib/ark.js';

export const MOUNTAIN_GLSL = ARK_GLSL + /* glsl */ `
uniform float uMist;      // top of the cloud deck (km); below -0.4 = no deck
uniform float uWater;     // the flood's level (km)
uniform float uTide;      // brightness of the gold tide mark
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform float uWarm;      // 0 silver .. 1 warm
uniform float uGreen;     // 0 bare rock .. 1 green on the lower slopes
uniform float uArkOn;     // 1 = the ark rests on the saddle
uniform float uRings;     // faint older tide marks left above the water, spaced this far apart (km); 0 = none
uniform float uRel;       // 1 = camera, water and deck are given relative to the ark's resting place
float WATER, MIST;
#define SUN normalize(uSunDir)
const vec2 ARK = vec2(-0.55, 13.2);
const vec3 GOLD = vec3(1.0, 0.62, 0.2);

float terrainRaw(vec2 p, int oct) {
  vec2 q = p * 0.42;
  float a = 0.0, b = 1.0; vec2 d = vec2(0);
  for (int i = 0; i < 14; i++) {
    if (i >= oct) break;
    vec3 n = vnoised(q);
    d += n.yz;
    a += b * n.x / (1.0 + dot(d, d));
    b *= 0.5; q = M2 * q * 2.0;
  }
  return a;
}
float terrain(vec2 p, int oct) {
  float r1 = length((p - vec2(0.8, 16.0)) * vec2(1.0, 1.3));
  float r2 = length((p - vec2(-4.2, 13.0)) * vec2(1.0, 1.2));
  float massif = 2.25 * exp(-r1 * r1 * 0.028) + 1.15 * exp(-r2 * r2 * 0.06);
  float h = terrainRaw(p, oct);
  return massif * (0.4 + 0.75 * h) + 0.3 * h - 0.55;
}
float arkHere(vec3 p) {        // the ark in km, resting on the saddle
  vec3 a = vec3(ARK.x, terrain(ARK, 9) - 0.002, ARK.y);
  vec3 q = (p - a) * 1000.0;
  q.xz = rot(0.5) * q.xz;
  return arkSDF(q) / 1000.0;
}
vec2 marchTerrain(vec3 ro, vec3 rd, float tmax) {
  float t = 0.002;
  for (int i = 0; i < 420; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - terrain(p.xz, 9);
    if (uArkOn > 0.5 && length(p.xz - ARK) < 0.2) h = min(h, arkHere(p));
    if (h < 0.0004 * t) return vec2(t, 1.0);
    t += h * 0.3;
    if (t > tmax || p.y > 6.0 && rd.y > 0.0) break;
  }
  return vec2(tmax, 0.0);
}
vec3 terrainNormal(vec2 p, float t) {
  float e = max(0.0004, 0.0008 * t);
  float h = terrain(p, 13);
  return normalize(vec3(h - terrain(p + vec2(e, 0), 13), e, h - terrain(p + vec2(0, e), 13)));
}
float terrainShadow(vec3 ro) {
  float res = 1.0, t = 0.01;
  for (int i = 0; i < 48; i++) {
    vec3 p = ro + SUN * t;
    float h = p.y - terrain(p.xz, 6);
    res = min(res, 16.0 * h / t);
    t += clamp(h, 0.01, 0.4);
    if (res < 0.0 || p.y > 3.0) break;
  }
  return smoothstep(0.0, 1.0, res);
}
float terrainShadowCheap(vec3 p) {
  float res = 1.0, t = 0.05;
  for (int i = 0; i < 10; i++) { vec3 q = p + SUN * t; float h = q.y - terrain(q.xz, 4); res = min(res, 10.0 * h / t); t += max(h, 0.15); }
  return sat(res);
}
vec3 mSky(vec3 rd) {
  float s = max(dot(rd, SUN), 0.0);
  float y = max(rd.y, 0.0);
  vec3 hor = mix(vec3(0.74, 0.76, 0.78), vec3(1.0, 0.68, 0.48), uWarm);
  vec3 top = mix(vec3(0.3, 0.34, 0.42), vec3(0.16, 0.27, 0.5), uWarm);
  vec3 c = mix(hor, top, sat(y * 3.2));
  c += mix(vec3(0.4), vec3(1.0, 0.6, 0.3), uWarm) * pow(s, 8.0) * 0.8;
  c += uSunCol * pow(s, 900.0) * 30.0;
  vec2 uv = rd.xz / (rd.y + 0.06);
  float ci = smoothstep(0.55, 0.9, fbm(uv * 0.6 + vec2(uTime * 0.004, 0), 5)) * smoothstep(0.0, 0.25, rd.y);
  c = mix(c, mix(vec3(0.8, 0.82, 0.85), vec3(1.2, 0.85, 0.7), uWarm) * (0.8 + 1.4 * pow(s, 4.0)), ci * 0.5);
  return c;
}
float cloud(vec3 p) {
  float top = MIST + 0.12 * (fbm(p.xz * 0.35, 3) - 0.5);
  float hgt = sat((top - p.y) / 0.25) * sat((p.y - WATER + 0.05) / 0.3);
  if (hgt <= 0.0) return 0.0;
  vec3 q = p * vec3(1.2, 2.2, 1.2) + vec3(uTime * 0.012, 0, uTime * 0.006);
  float n = fbm(q, 5);
  return sat((n - 0.42 + (hgt - 1.0) * 0.4) * 5.0);
}
vec4 clouds(vec3 ro, vec3 rd, float tHit, float jit) {
  if (uMist < -0.4) return vec4(0, 0, 0, 1);
  float y1 = MIST + 0.1, y0 = WATER - 0.05;
  float t0 = (y1 - ro.y) / rd.y, t1 = (y0 - ro.y) / rd.y;
  if (t0 > t1) { float tt = t0; t0 = t1; t1 = tt; }
  t0 = max(t0, 0.0); t1 = min(t1, min(tHit, 40.0));
  if (t1 <= t0) return vec4(0, 0, 0, 1);
  const int N = 48;
  float dt = (t1 - t0) / float(N);
  vec3 L = vec3(0); float T = 1.0;
  float mu = dot(rd, SUN);
  float phase = mix(0.08, 0.6 * pow(max(mu, 0.0), 6.0) + 0.1, 0.7);
  for (int i = 0; i < N; i++) {
    float t = t0 + (float(i) + jit) * dt;
    vec3 p = ro + rd * t;
    float d = cloud(p);
    if (d > 0.01) {
      float ds = cloud(p + SUN * 0.06);
      float lit = exp(-ds * 3.5) * (0.35 + 0.65 * terrainShadowCheap(p));
      float ambient = 0.35 + 0.65 * sat((p.y - WATER) / (MIST - WATER + 0.4));
      vec3 c = uSunCol * lit * phase * 1.3 + mix(vec3(0.6, 0.64, 0.7), vec3(0.55, 0.62, 0.78), uWarm) * ambient * 0.9;
      float a = 1.0 - exp(-d * dt * 22.0);
      L += T * a * c;
      T *= 1.0 - a;
      if (T < 0.01) break;
    }
  }
  return vec4(L, T);
}
vec3 arkBase() { return vec3(ARK.x, terrain(ARK, 9), ARK.y); }
vec3 mountainScene(vec3 ro, vec3 rd, float jit, out float depth) {
  float base = uRel > 0.5 ? terrain(ARK, 9) : 0.0;
  WATER = uWater + base; MIST = uMist + base;
  if (uRel > 0.5) ro += vec3(ARK.x, base, ARK.y);
  vec2 h = marchTerrain(ro, rd, 60.0);
  vec3 col;
  float tHit = h.x;
  float tw = rd.y < 0.0 ? (WATER - ro.y) / rd.y : 1e9;
  if (tw > 0.0 && tw < tHit) {
    vec3 p = ro + rd * tw;
    vec3 n = normalize(vec3((vnoise(p.xz * 40.0 + uTime * 0.3) - 0.5) * 0.06, 1.0, (vnoise(p.xz * 40.0 + 9.0) - 0.5) * 0.06));
    float fr = 0.02 + 0.98 * pow(1.0 - sat(dot(n, -rd)), 5.0);
    col = mix(mix(vec3(0.02, 0.035, 0.045), vec3(0.03, 0.05, 0.04), uGreen), mSky(reflect(rd, n)), fr);
    // the tide mark reflected: the gold line where water meets rock
    float shore = terrain(p.xz, 6) - WATER;
    col += GOLD * uTide * exp(-abs(shore) * 900.0 / (1.0 + tw * 2.0)) * 1.5;
    tHit = tw;
  } else if (h.y > 0.5) {
    vec3 p = ro + rd * h.x;
    bool onArk = uArkOn > 0.5 && arkHere(p) < 0.0006;
    vec3 n = terrainNormal(p.xz, h.x);
    if (onArk) {
      vec2 e = vec2(0.00003, 0);
      n = normalize(vec3(arkHere(p + e.xyy) - arkHere(p - e.xyy), arkHere(p + e.yxy) - arkHere(p - e.yxy), arkHere(p + e.yyx) - arkHere(p - e.yyx)));
    }
    float sh = terrainShadow(p + n * 0.002);
    float dif = sat(dot(n, SUN));
    float strata = vnoise(vec2(p.y * 60.0, p.x * 0.5));
    vec3 rock = mix(vec3(0.16, 0.12, 0.10), vec3(0.30, 0.24, 0.20), strata);
    rock = mix(rock, vec3(0.09, 0.075, 0.07), smoothstep(0.7, 0.4, n.y) * 0.6);
    // wet dark rock just above the water where the flood has only now left it
    float wet = smoothstep(0.12, 0.0, p.y - WATER);
    rock *= 1.0 - 0.45 * wet;
    float snow = smoothstep(0.62, 0.85, n.y + 0.2 * (fbm(p.xz * 20.0, 3) - 0.5) + (p.y - 0.9) * 0.35);
    snow *= smoothstep(0.35, 0.9, p.y);
    vec3 alb = mix(rock, vec3(0.86, 0.88, 0.92), snow);
    float grass = uGreen * smoothstep(0.55, 0.8, n.y) * smoothstep(1.1, 0.4, p.y) * smoothstep(-0.02, 0.1, p.y - WATER);
    alb = mix(alb, mix(vec3(0.12, 0.16, 0.05), vec3(0.2, 0.24, 0.08), fbm(p.xz * 30.0, 3)), grass);
    if (onArk) { float r; alb = arkColor((p - vec3(ARK.x, terrain(ARK, 9) - 0.002, ARK.y)) * 1000.0, n, r); }
    float occ = sat(0.35 + 0.65 * n.y);
    col = alb * uSunCol * dif * sh * 0.3;
    col += alb * mix(vec3(0.6, 0.64, 0.72), vec3(0.45, 0.55, 0.78), uWarm) * occ * 0.5;
    col += vec3(1.0, 0.9, 0.8) * snow * pow(sat(dot(reflect(rd, n), SUN)), 30.0) * sh * 1.6;
    // the tide mark on the rock
    col += GOLD * uTide * exp(-abs(p.y - WATER) * 1400.0 / (1.0 + h.x * 1.5)) * 2.0;
    if (uRings > 0.0 && p.y > WATER) {
      float k = (p.y - WATER) / uRings;
      float ring = floor(k + 0.5);
      if (ring >= 1.0 && ring <= 7.0) col += GOLD * uTide * exp(-abs(k - ring) * uRings * 1400.0 / (1.0 + h.x * 1.5)) * 0.45 / ring;
    }
    tHit = h.x;
  } else {
    col = mSky(rd);
    tHit = 80.0;
  }
  float fogAmt = tHit < 79.0 ? 1.0 - exp(-tHit * 0.02) : 0.0;
  vec3 fogC = mix(mix(vec3(0.66, 0.7, 0.76), vec3(0.55, 0.62, 0.78), uWarm), mix(vec3(0.9), vec3(1.2, 0.85, 0.6), uWarm), pow(max(dot(rd, SUN), 0.0), 3.0));
  col = mix(col, fogC, fogAmt * 0.85);
  vec4 c = clouds(ro, rd, tHit, jit);
  depth = tHit;
  return col * c.a + c.rgb;
}
`;

export const MOUNTAIN_UNIFORMS = { MIST: -1, WATER: -0.25, uTide: 0, uSunDir: [-0.85, 0.13, 0.42], uSunCol: [7.0, 5.0, 3.4], uWarm: 0, uGreen: 0, uArkOn: 1, uRel: 0, uRings: 0 };
