// Dry ground after the flood: a wide plain of cracked, drying silt under open sky, far hills, and
// (as the film warms) green coming through the cracks. Flat plane at y = 0 with detail in the shading.
export const GROUND_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform float uGreen;   // 0 bare .. 1 green shoots
uniform float uWet;     // 0 dry .. 1 still wet
uniform float uGLine;   // the gold line: the last of the water on the horizon
#define SUN normalize(uSunDir)
const vec3 GGOLD = vec3(1.0, 0.62, 0.2);
float gCracks(vec2 xz) {
  vec2 w = xz + (vec2(vnoise(xz * 0.9), vnoise(xz * 0.9 + 5.0)) - 0.5) * 0.6;
  vec2 v = voronoiEdge(w * 1.6);
  vec2 v2 = voronoiEdge(w * 5.0 + 3.0);
  float big = smoothstep(0.0, 0.03 + 0.04 * vnoise(xz * 0.7), v.x);
  float small = mix(1.0, smoothstep(0.0, 0.05, v2.x), 0.5);
  return big * small;
}
vec3 gSky(vec3 rd) {
  float y = max(rd.y, 0.0);
  float s = max(dot(rd, SUN), 0.0);
  vec3 c = mix(vec3(1.0, 0.8, 0.62), vec3(0.32, 0.46, 0.7), pow(sat(y * 2.5), 0.7));
  c += uSunCol * (pow(s, 12.0) * 0.06 + pow(s, 600.0) * 3.0);
  vec2 uv = rd.xz / (rd.y + 0.08);
  float cl = smoothstep(0.55, 0.85, fbm(uv * 0.4 + vec2(uTime * 0.01, 0), 5));
  c = mix(c, vec3(1.1, 1.0, 0.95), cl * 0.5 * smoothstep(0.0, 0.2, rd.y));
  // hills on the horizon
  float az = atan(rd.x, rd.z);
  float ridge = 0.02 + 0.035 * fbm(vec2(az * 3.0, 1.0), 5) + 0.015 * fbm(vec2(az * 11.0, 4.0), 4);
  float hill = smoothstep(ridge + 0.0015, ridge - 0.0015, rd.y);
  vec3 hc = mix(vec3(0.5, 0.52, 0.55), mix(vec3(0.42, 0.48, 0.36), vec3(0.3, 0.4, 0.22), uGreen), 0.4);
  c = mix(c, mix(hc, c, 0.35), hill);
  return c;
}
vec3 groundScene(vec3 ro, vec3 rd, out float depth) {
  vec3 col = gSky(rd);
  depth = 1e4;
  if (rd.y < 0.0) {
    float t = -ro.y / rd.y;
    vec3 p = ro + rd * t;
    depth = t;
    float c0 = gCracks(p.xz), e = 0.01;
    float cx = gCracks(p.xz + vec2(e, 0)), cz = gCracks(p.xz + vec2(0, e));
    vec3 n = normalize(vec3((c0 - cx) / e * 0.03, 1.0, (c0 - cz) / e * 0.03));
    float grain = fbm(p.xz * 30.0, 3);
    vec3 alb = mix(vec3(0.33, 0.29, 0.24), vec3(0.46, 0.41, 0.34), grain);
    alb = mix(alb, vec3(0.16, 0.13, 0.1), (1.0 - c0) * 0.8);
    alb = mix(alb, alb * 0.55, uWet * (0.6 + 0.4 * fbm(p.xz * 0.3, 3)));
    // shoots in the cracks
    float shoot = sat(uGreen * 2.0) * (1.0 - c0) * smoothstep(0.5, 0.8, fbm(p.xz * 3.0, 3));
    alb = mix(alb, vec3(0.2, 0.32, 0.08), shoot);
    // a meadow once the green has fully come
    float meadow = smoothstep(0.5, 1.0, uGreen) * (0.75 + 0.25 * fbm(p.xz * 0.4, 3));
    // meadow: clumps, blade streaks along the view, seed heads and bare patches, shading with distance
    float clump = fbm(p.xz * 0.8 + 7.0, 5);
    float blades = vnoise(vec2(p.x * 60.0, p.z * 6.0) + vec2(0.0, clump * 4.0));
    vec3 grassC = mix(vec3(0.06, 0.12, 0.03), vec3(0.3, 0.38, 0.1), clump);
    grassC = mix(grassC, vec3(0.44, 0.43, 0.2), smoothstep(0.6, 0.85, fbm(p.xz * 0.35 + 3.0, 4)) * 0.45);
    grassC *= 0.62 + 0.55 * mix(0.5, blades, exp(-t * 0.03));
    grassC = mix(grassC, vec3(0.2, 0.16, 0.1), smoothstep(0.72, 0.9, fbm(p.xz * 0.12 + 11.0, 3)) * 0.6);
    alb = mix(alb, grassC, meadow);
    n = normalize(mix(n, normalize(vec3((fbm(p.xz * 8.0, 3) - 0.5) * 1.2, 1.0, (fbm(p.xz * 8.0 + 3.0, 3) - 0.5) * 1.2)), meadow));
    float dif = sat(dot(n, SUN));
    float selfShade = mix(1.0, 0.55 + 0.45 * fbm(p.xz * 3.0, 3), meadow);
    col = (alb * uSunCol * dif * 0.3 + alb * vec3(0.5, 0.6, 0.78) * 0.45) * selfShade;
    col += vec3(1.0) * pow(sat(dot(reflect(rd, n), SUN)), 40.0) * uWet * 0.6;
    float fog = 1.0 - exp(-t * 0.003);
    col = mix(col, gSky(normalize(vec3(rd.x, 0.001, rd.z))), fog);
  }
  // the last gold line of water, lying on the horizon
  float w = abs(rd.y + 0.001) * uRes.y / (2.0 * tan(radians(uFov) * 0.5));
  col += GGOLD * (exp(-w * w * 0.8) * 2.2 + exp(-w * 0.07) * 0.15) * uGLine;
  return col;
}
`;
export const GROUND_UNIFORMS = { uSunDir: [0.5, 0.35, 1.0], uSunCol: [6.5, 5.8, 4.8], uGreen: 0, uWet: 0.2, uGLine: 0.6 };
