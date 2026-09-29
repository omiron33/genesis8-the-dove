// The flood sea: a heightfield ocean under an overcast sky, with the gold waterline on the horizon.
// Scenes include SEA_GLSL and call seaScene(ro, rd, ...) from their shade().
import { ARK_GLSL } from '/song/lib/ark.js';
export const SEA_GLSL = ARK_GLSL + /* glsl */ `
uniform float uWind;      // 0 calm .. 1 gale (wave height and spray)
uniform float uGust;      // position of a travelling gust front across the water (m), large = none
uniform float uNight;     // 0 day .. 1 night
uniform float uLine;      // 0..1 how much of the gold horizon line is drawn (from the centre out)
uniform float uLineGlow;  // intensity of the gold line
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform float uWarm;      // 0 silver flood .. 1 warm light
uniform float uArkDist;   // distance to the ark on the horizon (m), 0 = no ark

#define SUN normalize(uSunDir)
const vec3 LINE_GOLD = vec3(1.0, 0.62, 0.2);

// one directional swell with sharpened crests
float swell(vec2 p, vec2 dir, float k, float amp, float spd, float chop, float t) {
  vec2 wp = p + (vec2(vnoise(p * k * 0.21), vnoise(p * k * 0.21 + 7.3)) - 0.5) * (2.5 / k);
  float ph = dot(wp, dir) * k - t * spd + 1.6 * vnoise(p * k * 0.12);
  float s = 1.0 - abs(sin(ph));
  return amp * (pow(s, chop) - 0.5);
}
float seaH(vec2 p, int oct) {
  float t = uTime;
  float a = 0.55 + 0.9 * uWind;
  float h = 0.0;
  vec2 d = normalize(vec2(1.0, 0.35));
  float k = 0.16, amp = 0.62 * a, chop = 2.2;
  for (int i = 0; i < 7; i++) {
    if (i >= oct) break;
    h += swell(p, d, k, amp, sqrt(9.8 * k) * 1.0, chop, t);
    d = rot(0.83 + float(i) * 1.37) * d;
    k *= 1.85; amp *= 0.46; chop = mix(chop, 1.2, 0.35);
  }
  // gust: a band of roughened water sweeping across
  float gx = (p.x - uGust) * 0.08;
  float g = exp(-gx * gx);
  h += g * 0.08 * (vnoise(p * 3.0 + t * 2.0) - 0.5);
  return h;
}

float seaMarch(vec3 ro, vec3 rd, out vec3 hit) {
  // heightfield: bracket then bisect
  float t0 = 0.0, t1 = 400.0;
  if (rd.y >= 0.0) { hit = ro + rd * 1e4; return 1e4; }
  float hx = 0.0, tm = 0.0;
  float tA = 0.0, hA = ro.y - seaH(ro.xz, 3);
  float tB = min(t1, (ro.y + 1.5) / -rd.y);
  float step = max(0.02, (tB - tA) / 64.0);
  float t = 0.0;
  for (int i = 0; i < 96; i++) {
    t = tA + max(0.03 + t * 0.02, hA * 0.6);
    vec3 p = ro + rd * t;
    float h = p.y - seaH(p.xz, 3);
    if (h < 0.0) { tB = t; break; }
    tA = t; hA = h;
    if (t > t1) { hit = ro + rd * 1e4; return 1e4; }
  }
  for (int i = 0; i < 8; i++) {
    float tm = 0.5 * (tA + tB);
    vec3 p = ro + rd * tm;
    if (p.y - seaH(p.xz, 3) < 0.0) tB = tm; else tA = tm;
  }
  hit = ro + rd * tB;
  return tB;
}

vec3 seaNormal(vec3 p, float dist) {
  float e = 0.004 + dist * 0.0015;
  float h = seaH(p.xz, 7);
  return normalize(vec3(h - seaH(p.xz + vec2(e, 0), 7), e, h - seaH(p.xz + vec2(0, e), 7)));
}

vec3 skyCol(vec3 rd) {
  float y = rd.y;
  vec3 dayTop = mix(vec3(0.34, 0.39, 0.45), vec3(0.42, 0.40, 0.46), uWarm);
  vec3 dayHor = mix(vec3(0.72, 0.76, 0.80), vec3(1.05, 0.80, 0.62), uWarm);
  vec3 c = mix(dayHor, dayTop, pow(sat(y * 1.6), 0.6));
  // overcast: layered cloud under a ceiling
  vec2 uv = rd.xz / (rd.y + 0.08);
  float cl = fbm(uv * 0.35 + vec2(uTime * 0.01, 0.0), 6);
  float cl2 = fbm(uv * 1.1 - vec2(uTime * 0.02, 0.0), 4);
  float dens = smoothstep(0.35, 0.8, cl * 0.8 + cl2 * 0.35);
  vec3 cloudC = mix(vec3(0.46, 0.5, 0.55), vec3(0.8, 0.78, 0.76), smoothstep(0.4, 0.9, cl2));
  c = mix(c, cloudC * mix(1.0, 1.25, uWarm), dens * smoothstep(0.0, 0.15, y) * 0.85);
  float s = max(dot(rd, SUN), 0.0);
  c += uSunCol * (pow(s, 10.0) * 0.25 + pow(s, 200.0) * 1.5) * (1.0 - dens * 0.7);
  c = mix(c, c * vec3(0.06, 0.08, 0.13), uNight);
  return c;
}

// the ark riding the water, broadside-on at an angle
uniform float uArkYaw;
vec3 arkLocal(vec3 p) { vec3 q = p - vec3(0.0, -3.2, uArkDist); q.xz = rot(uArkYaw) * q.xz; return q; }
float arkSil(vec3 p) { return arkSDF(arkLocal(p)); }
vec3 seaShade(vec3 ro, vec3 rd, float t, vec3 p) {
  vec3 n = seaNormal(p, t);
  vec3 r = reflect(rd, n); r.y = abs(r.y);
  float fr = 0.02 + 0.98 * pow(1.0 - sat(dot(n, -rd)), 5.0);
  vec3 refl = skyCol(r);
  vec3 deep = mix(vec3(0.03, 0.05, 0.065), vec3(0.05, 0.06, 0.06), uWarm);
  vec3 sss = vec3(0.10, 0.17, 0.18) * pow(sat(p.y - seaH(p.xz, 2) + 0.35), 2.0) * sat(dot(SUN, -rd) + 0.4);
  vec3 c = mix(deep + sss, refl, fr);
  // sun glitter
  c += uSunCol * pow(sat(dot(r, SUN)), 240.0) * 3.0;
  // foam on crests when the wind rises
  float foam = smoothstep(0.25, 0.45, p.y + 0.25 * uWind) * uWind * smoothstep(0.4, 0.9, vnoise(p.xz * 2.0 + uTime));
  c = mix(c, vec3(0.7, 0.72, 0.74), foam * 0.7);
  c = mix(c, c * vec3(0.05, 0.07, 0.12), uNight);
  // aerial perspective to the horizon
  float fog = 1.0 - exp(-t * 0.006);
  return mix(c, skyCol(normalize(vec3(rd.x, 0.001, rd.z))), fog);
}

// full sea frame (no text): returns colour and depth
vec3 seaScene(vec3 ro, vec3 rd, out float depth) {
  vec3 p;
  float t = seaMarch(ro, rd, p);
  vec3 c;
  if (t < 1e3) { c = seaShade(ro, rd, t, p); depth = t; }
  else { c = skyCol(rd); depth = 1e4; }
  // the ark
  if (uArkDist > 0.0) {
    float tb = max(0.0, length(vec3(0.0, 5.0, uArkDist) - ro) - 90.0);
    bool hit = false;
    for (int i = 0; i < 128; i++) {
      float d = arkSil(ro + rd * tb);
      if (d < 0.002 * tb) { hit = true; break; }
      tb += d;
      if (tb > depth || tb > uArkDist + 200.0) break;
    }
    if (hit && tb < depth) {
      vec3 q = ro + rd * tb;
      vec2 e = vec2(0.02 + tb * 0.0005, 0.0);
      vec3 n = normalize(vec3(arkSil(q + e.xyy) - arkSil(q - e.xyy), arkSil(q + e.yxy) - arkSil(q - e.yxy), arkSil(q + e.yyx) - arkSil(q - e.yyx)));
      float rough;
      vec3 alb = arkColor(arkLocal(q), n, rough);
      vec3 sky = skyCol(normalize(n + vec3(0, 0.6, 0))) * (0.5 + 0.5 * n.y);
      vec3 ac = alb * (sky * 1.4 + uSunCol * sat(dot(n, SUN)) * 1.2);
      ac += skyCol(reflect(rd, n)) * pow(1.0 - sat(dot(n, -rd)), 4.0) * 0.25 * (1.0 - rough);
      ac = mix(ac, ac * vec3(0.05, 0.07, 0.12), uNight);
      float fog = 1.0 - exp(-tb * 0.0011);
      c = mix(ac, skyCol(normalize(vec3(rd.x, 0.001, rd.z))), fog);
      depth = tb;
    }
  }
  // the gold waterline: the horizon itself, drawn from the centre outward
  float hy = rd.y + 0.0015;                         // just under the geometric horizon
  float w = abs(hy) * uRes.y / (2.0 * tan(radians(uFov) * 0.5));
  float core = exp(-w * w * 0.9);
  float halo = exp(-w * 0.06) * 0.25;
  vec3 fw = normalize(uCamTarget - uCamPos);
  float side = abs(dot(normalize(rd.xz), normalize(vec2(fw.z, -fw.x))));
  float drawn = smoothstep(uLine + 0.02, uLine - 0.02, side * 1.6);
  c += LINE_GOLD * (core * 3.2 + halo) * uLineGlow * drawn * (depth > 900.0 ? 1.0 : 0.25);
  return c;
}
`;

export const SEA_UNIFORMS = { uWind: 0.2, uGust: 1e4, uNight: 0, uLine: 1, uLineGlow: 1, SUN: [0.3, 0.12, 0.95], uSunCol: [1.0, 0.95, 0.9], uWarm: 0, uArkDist: 0, uArkYaw: 0.35 };
