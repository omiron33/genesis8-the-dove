// A bird as a sculpted, faceted form: porcelain for the dove, obsidian for the raven. Units are
// metres; the bird faces +x, up is +y, wings along ±z. The flap phase is passed in.
export const BIRD_GLSL = /* glsl */ `
float bFeather(vec3 p, vec3 b, vec3 d, vec3 n, float len, float wid, float thk) {
  vec3 q = p - b; vec3 s = cross(d, n);
  vec3 l = vec3(dot(q, d) - len * 0.5, dot(q, n), dot(q, s));
  float taper = 1.0 - 0.55 * sat(l.x / (len * 0.5));
  return sdEllipsoid(l, vec3(len * 0.5, thk, wid * 0.5 * taper));
}
float bWing(vec3 p, float side, float ph, float span) {
  float up = sin(ph);
  float spread = 0.1 + 0.95 * up;
  float fold = 0.6 * sat(-cos(ph)) * sat(0.4 - up);
  vec3 sh = vec3(0.03, 0.03, 0.04 * side);
  vec3 arm = normalize(vec3(-0.15 - 0.2 * fold, sin(spread) * 0.9, cos(spread) * side));
  vec3 wrist = sh + arm * 0.11 * span;
  vec3 hdir = normalize(vec3(-0.3 - 0.9 * fold, sin(spread * 1.2 - 0.12) * 0.9, cos(spread * 1.2 - 0.12) * side));
  vec3 tip = wrist + hdir * 0.15 * span;
  vec3 back = vec3(-1, 0, 0);
  vec3 n = normalize(cross(arm, back)) * side; if (n.y < 0.0) n = -n;
  float bb = sdCapsule(p, sh, tip, 0.2);
  if (bb > 0.04) return bb;
  float d = sdRoundCone(p, sh, wrist, 0.02, 0.012);
  d = smin(d, sdRoundCone(p, wrist, tip - hdir * 0.04, 0.012, 0.006), 0.01);
  // one continuous feathered surface: secondaries along the arm, primaries fanning from the hand
  for (int i = 0; i < 6; i++) {
    float u = (float(i) + 0.5) / 6.0;
    vec3 b = mix(sh + arm * 0.02, wrist, u);
    d = smin(d, bFeather(p, b, normalize(back + arm * (0.1 + 0.2 * u)), n, (0.1 - 0.012 * u) * span, 0.036, 0.0025), 0.006);
  }
  for (int i = 0; i < 7; i++) {
    float u = float(i) / 6.0;
    vec3 b = mix(wrist, tip, u * 0.85);
    vec3 dir = normalize(mix(back + arm * 0.35, hdir * 1.3 + back * 0.12, pow(u, 0.8)));
    d = smin(d, bFeather(p, b, dir, n, mix(0.12, 0.19, sin(u * 2.6)) * span, mix(0.03, 0.018, u), 0.0018), 0.003);
  }
  d = smin(d, bFeather(p, sh + vec3(0.012, 0, 0), normalize(arm + back * 0.25), n, 0.2 * span, 0.075, 0.008), 0.01);
  return d;
}
float BIRD_PART; // 0 body, 1 wing, 2 beak, 3 leaf, 4 eye
float birdSDF(vec3 p, float ph, float leaf, float span) {
  p.y -= 0.012 * sin(ph + 1.2);
  // a slim, tapering body: breast forward, long tail behind, a small round head on a short neck
  float d = sdEllipsoid(p - vec3(-0.03, 0.0, 0.0), vec3(0.13, 0.036, 0.04));
  d = smin(d, sdEllipsoid(p - vec3(0.045, -0.006, 0.0), vec3(0.06, 0.038, 0.038)), 0.025);   // breast
  d = smin(d, sdEllipsoid(p - vec3(0.112, 0.018, 0.0), vec3(0.03, 0.022, 0.02)), 0.02);     // neck
  d = smin(d, sdEllipsoid(p - vec3(0.145, 0.03, 0.0), vec3(0.026, 0.021, 0.019)), 0.014);   // head
  for (int i = 0; i < 5; i++) {                                                            // tail fan
    float u = (float(i) - 2.0) / 2.0;
    d = smin(d, bFeather(p, vec3(-0.12, 0.004, 0.0), normalize(vec3(-1.0, 0.03, u * 0.2)), vec3(0, 1, 0), 0.15, 0.036, 0.004), 0.008);
  }
  BIRD_PART = 0.0;
  float w = min(bWing(p, 1.0, ph, span), bWing(p, -1.0, ph, span));
  if (w < d) BIRD_PART = 1.0;
  d = smin(d, w, 0.012);
  float beak = sdRoundCone(p, vec3(0.166, 0.028, 0.0), vec3(0.188, 0.022, 0.0), 0.0045, 0.0015);
  if (beak < d) { d = beak; BIRD_PART = 2.0; }
  if (leaf > 0.5) {
    vec3 q = p - vec3(0.184, 0.022, 0.0);
    q.xy = rot(0.6) * q.xy; q.xz = rot(0.35) * q.xz;
    float lf = sdEllipsoid(q - vec3(0.03, 0.0, 0.0), vec3(0.03, 0.0085, 0.0012));
    vec3 q2 = q - vec3(0.012, 0.004, 0.004); q2.xz = rot(0.6) * q2.xz;
    lf = min(lf, sdEllipsoid(q2 - vec3(0.022, 0.0, 0.0), vec3(0.022, 0.006, 0.001)));
    if (lf < d) { d = lf; BIRD_PART = 3.0; }
  }
  float eye = sdSphere(vec3(p.x, p.y, abs(p.z)) - vec3(0.153, 0.036, 0.016), 0.003);
  if (eye < d + 0.0008) BIRD_PART = 4.0;
  return min(d, eye);
}
vec3 birdNormal(vec3 p, float ph, float leaf, float span) {
  vec2 e = vec2(1.0, -1.0) * 0.0004;
  return normalize(e.xyy * birdSDF(p + e.xyy, ph, leaf, span) + e.yyx * birdSDF(p + e.yyx, ph, leaf, span) + e.yxy * birdSDF(p + e.yxy, ph, leaf, span) + e.xxx * birdSDF(p + e.xxx, ph, leaf, span));
}
// faceted normal: the normal at the nearest point of a 3D Voronoi lattice, so the surface breaks into
// flat planes like a cut or folded sculpture
vec3 facetNormal(vec3 p, float cell, float ph, float leaf, float span) {
  vec3 g = floor(p / cell), best = p; float bd = 1e9;
  for (int k = 0; k < 27; k++) {
    vec3 o = vec3(float(k % 3) - 1.0, float((k / 3) % 3) - 1.0, float(k / 9) - 1.0);
    vec3 c = (g + o + hash33(g + o)) * cell;
    float dd = dot(c - p, c - p);
    if (dd < bd) { bd = dd; best = c; }
  }
  return birdNormal(best, ph, leaf, span);
}
// march a bird placed at 'pos' with heading 'yaw' and bank 'roll'; returns hit distance or -1
float birdMarch(vec3 ro, vec3 rd, vec3 pos, float yaw, float bank, float scale, float ph, float leaf, float span, out vec3 lp, out vec3 lrd) {
  vec3 o = (ro - pos) / scale; vec3 d = rd;
  o.xz = rot(-yaw) * o.xz; d.xz = rot(-yaw) * d.xz;
  o.yz = rot(-bank) * o.yz; d.yz = rot(-bank) * d.yz;
  float tb = length(o) - 0.35;
  float t = max(0.0, tb);
  for (int i = 0; i < 160; i++) {
    float h = birdSDF(o + d * t, ph, leaf, span);
    if (h < 0.0002) { lp = o + d * t; lrd = d; return t * scale; }
    t += h * 0.85;
    if (t > tb + 0.9) break;
  }
  return -1.0;
}
// shade a bird hit: kind 0 = porcelain dove, 1 = obsidian raven
vec3 birdShade(vec3 lp, vec3 lrd, float yaw, float bank, float ph, float leaf, float span, vec3 sunDir, vec3 sunCol, vec3 skyC, float kind) {
  birdSDF(lp, ph, leaf, span);
  float part = BIRD_PART;
  vec3 n = birdNormal(lp, ph, leaf, span);
  // fine feather lines: along the wing and down the body
  float fl = sin((part == 1.0 ? lp.z * 420.0 + lp.x * 90.0 : lp.x * 320.0 + abs(lp.z) * 140.0));
  n = normalize(n + 0.03 * fl * normalize(cross(n, vec3(0.0, 0.0, 1.0)) + 1e-4));
  vec3 L = sunDir; L.xz = rot(-yaw) * L.xz; L.yz = rot(-bank) * L.yz;
  vec3 alb = kind < 0.5 ? vec3(0.9, 0.89, 0.87) : vec3(0.018, 0.018, 0.022);
  float rough = kind < 0.5 ? 0.55 : 0.18;
  if (part == 2.0) { alb = kind < 0.5 ? vec3(0.5, 0.36, 0.34) : vec3(0.03); }
  if (part == 3.0) { alb = vec3(0.12, 0.17, 0.06); rough = 0.4; }
  if (part == 4.0) { alb = vec3(0.01); rough = 0.05; }
  float dif = sat(dot(n, L));
  float wrap = sat((dot(n, L) + 0.4) / 1.4);
  vec3 c = alb * sunCol * mix(dif, wrap, kind < 0.5 ? 0.35 : 0.0) * 0.55;
  c += alb * skyC * (0.6 + 0.4 * n.y) * (kind < 0.5 ? 1.0 : 0.7);
  // porcelain glows a little where light comes through thin wing edges
  if (kind < 0.5 && part == 1.0) c += vec3(1.0, 0.85, 0.7) * sunCol * pow(sat(dot(lrd, L)), 2.0) * 0.12;
  if (part == 3.0) c += vec3(0.4, 0.6, 0.15) * sunCol * pow(sat(dot(lrd, L)), 2.0) * 0.25;
  vec3 h = normalize(L - lrd);
  c += sunCol * pow(sat(dot(n, h)), mix(12.0, 220.0, 1.0 - rough)) * (1.0 - rough) * (kind < 0.5 ? 0.25 : 0.9);
  c += skyC * pow(1.0 - sat(dot(n, -lrd)), 4.0) * (kind < 0.5 ? 0.15 : 0.5);
  return c;
}
`;
