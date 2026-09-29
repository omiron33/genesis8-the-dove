// Clip — "At evening she came back, / an olive leaf held in her beak."
// Slow motion, evening light. A white dove flies low over the grey, withdrawing water toward us,
// backlit so the light comes through her wing feathers; the camera drifts round to find the leaf.
import { keys, ease, wordState, smartQuotes, clamp01, cameraPlane } from '/engine.js';
import { anchor } from '/timing.js';

const A = anchor('At evening she came back', 'an olive leaf held in her beak');
const FROM = A.from, TO = A.to;

const frag = /* glsl */ `
uniform float uAperture, uFocus;
const vec3 SUN = normalize(vec3(-0.35, 0.11, -0.93));
const vec3 SUNC = vec3(6.5, 3.9, 2.2);
const float FLAP = 1.35;       // wingbeats per second (slow motion)
const float SPEED = 1.1;       // apparent flight speed over the water, m/s (slow motion)

float gFeather;   // id of the closest feather part, for shading

// flattened ellipsoid feather from base b along unit dir d, lying in the plane with normal n
float feather(vec3 p, vec3 b, vec3 d, vec3 n, float len, float wid, float thk) {
  vec3 q = p - b; vec3 s = cross(d, n);
  vec3 l = vec3(dot(q, d) - len * 0.5, dot(q, n), dot(q, s));
  // slight camber and a rounded tip
  l.y -= 0.12 * wid * (1.0 - pow(2.0 * l.z / wid, 2.0));
  return sdEllipsoid(l, vec3(len * 0.5, thk, wid * 0.5));
}

float wing(vec3 p, float side, float ph) {
  float up = sin(ph);
  float spread = 0.05 + 0.95 * up;                 // rotation of the wing about the body axis
  float fold = 0.55 * sat(-cos(ph)) * sat(-up + 0.4); // hand tucks on the upstroke
  vec3 sh = vec3(0.035, 0.03, 0.045 * side);
  vec3 span = normalize(vec3(-0.12 - 0.25 * fold, sin(spread) * 0.9, cos(spread) * side));
  vec3 wrist = sh + span * 0.12;
  vec3 hand = normalize(vec3(-0.35 - 0.9 * fold, sin(spread * 1.25 - 0.1) * 0.9, cos(spread * 1.25 - 0.1) * side));
  vec3 tip = wrist + hand * 0.14;
  vec3 back = vec3(-1, 0, 0);
  vec3 n = normalize(cross(span, back)) * side;
  if (n.y < 0.0) n = -n;
  // bounding
  float bb = sdCapsule(p, sh, tip, 0.2);
  if (bb > 0.05) return bb;
  float d = sdRoundCone(p, sh, wrist, 0.022, 0.014);
  d = smin(d, sdRoundCone(p, wrist, tip - hand * 0.05, 0.014, 0.008), 0.01);
  gFeather = 0.0;
  // secondaries along the arm, pointing back
  for (int i = 0; i < 7; i++) {
    float u = (float(i) + 0.5) / 7.0;
    vec3 b = mix(sh + span * 0.02, wrist, u);
    vec3 dir = normalize(back * 1.0 + span * (0.1 + 0.25 * u));
    float f = feather(p, b, dir, n, 0.105 - 0.01 * u, 0.034, 0.0028);
    if (f < d) { d = f; gFeather = 1.0 + u; }
  }
  // primaries fanning from the hand
  for (int i = 0; i < 9; i++) {
    float u = float(i) / 8.0;
    vec3 b = mix(wrist, tip, u * 0.85);
    vec3 dir = normalize(mix(back + span * 0.3, hand * 1.4 + back * 0.15, pow(u, 0.8)));
    float len = mix(0.11, 0.17, sin(u * 2.8));
    float f = feather(p, b, dir, n, len, mix(0.032, 0.022, u), 0.0025);
    if (f < d) { d = f; gFeather = 2.0 + u; }
  }
  // coverts: a smooth layer over the arm and hand
  float cov = feather(p, sh - back * 0.01, normalize(span + back * 0.25), n, 0.2, 0.07, 0.009);
  if (cov < d) gFeather = 0.5;
  d = smin(d, cov, 0.008);
  return d;
}

vec3 rotY(vec3 p, float a) { p.xz = rot(a) * p.xz; return p; }
float gPart; // 0 body, 1 wing, 2 beak, 3 leaf, 4 eye
float dove(vec3 p, float ph) {
  p.y -= 0.012 * sin(ph + 1.2);                      // body lifts with each beat
  float d = sdEllipsoid(p - vec3(-0.02, 0.0, 0.0), vec3(0.13, 0.05, 0.055));
  d = smin(d, sdEllipsoid(p - vec3(0.055, -0.01, 0.0), vec3(0.07, 0.052, 0.052)), 0.03);    // breast
  d = smin(d, sdEllipsoid(p - vec3(0.118, 0.022, 0.0), vec3(0.035, 0.03, 0.028)), 0.03);   // neck
  d = smin(d, sdEllipsoid(p - vec3(0.15, 0.034, 0.0), vec3(0.03, 0.025, 0.023)), 0.02);    // head
  // tail fan
  for (int i = 0; i < 5; i++) {
    float u = (float(i) - 2.0) / 2.0;
    d = smin(d, feather(p, vec3(-0.11, 0.005, 0.0), normalize(vec3(-1.0, 0.03, u * 0.3)), vec3(0, 1, 0), 0.14, 0.046, 0.007), 0.01);
  }
  gPart = 0.0;
  float w = min(wing(p, 1.0, ph), wing(p, -1.0, ph));
  if (w < d) gPart = 1.0;
  d = smin(d, w, 0.012);
  float beak = sdRoundCone(p, vec3(0.172, 0.03, 0.0), vec3(0.19, 0.025, 0.0), 0.0055, 0.002);
  if (beak < d) { d = beak; gPart = 2.0; }
  // the olive leaf, held crosswise
  vec3 q = p - vec3(0.188, 0.024, 0.0);
  q.xy = rot(0.6) * q.xy; q.xz = rot(0.35) * q.xz;
  float leaf = sdEllipsoid(q - vec3(0.03, 0.0, 0.0), vec3(0.03, 0.0085, 0.0012));
  leaf = min(leaf, sdEllipsoid(rotY(q - vec3(0.012, 0.004, 0.004), 0.6) - vec3(0.022, 0.0, 0.0), vec3(0.022, 0.006, 0.001)));
  leaf = min(leaf, sdCapsule(q, vec3(-0.004, 0, 0), vec3(0.004, 0, 0), 0.0012));
  if (leaf < d) { d = leaf; gPart = 3.0; }
  float eye = sdSphere(vec3(p.x, p.y, abs(p.z)) - vec3(0.158, 0.04, 0.019), 0.0035);
  if (eye < d + 0.001) { gPart = 4.0; }
  return min(d, eye);
}

float gPh;
float map(vec3 p) { return dove(p, gPh); }

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.0004;
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}
float shadowD(vec3 ro, vec3 rd) {
  float res = 1.0, t = 0.003;
  for (int i = 0; i < 40; i++) { float h = map(ro + rd * t); res = min(res, 18.0 * h / t); t += clamp(h, 0.002, 0.03); if (res < 0.01 || t > 0.5) break; }
  return sat(res);
}
// how much material lies along the light direction (for translucency)
float thickness(vec3 p, vec3 dir) {
  float s = 0.0;
  for (int i = 1; i <= 5; i++) { float h = 0.004 * float(i); s += max(-map(p + dir * h), 0.0); }
  return s * 60.0;
}

vec3 sky(vec3 rd) {
  float s = max(dot(rd, SUN), 0.0), y = rd.y;
  vec3 c = mix(vec3(1.1, 0.55, 0.3), vec3(0.28, 0.3, 0.44), sat(y * 2.5 + 0.1));
  c += vec3(1.3, 0.55, 0.22) * pow(s, 6.0) * 0.9 + SUNC * pow(s, 700.0) * 25.0;
  // long bands of evening cloud
  vec2 uv = rd.xz / max(rd.y + 0.04, 0.02);
  float cl = smoothstep(0.5, 0.85, fbm(uv * vec2(0.25, 0.9) + vec2(0.0, uTime * 0.01), 6));
  c = mix(c, mix(vec3(0.35, 0.28, 0.32), vec3(1.6, 0.8, 0.45), pow(s, 3.0)), cl * smoothstep(0.0, 0.08, y) * 0.8);
  // far mountains, just risen from the water
  float az = atan(rd.x, -rd.z);
  float ridge = 0.012 + 0.03 * fbm(vec2(az * 4.0, 3.0), 5);
  c = mix(c, mix(vec3(0.3, 0.25, 0.3), c, 0.55), smoothstep(ridge + 0.001, ridge - 0.001, y) * step(0.0, y));
  return c;
}

vec3 water(vec3 ro, vec3 rd) {
  float t = (-0.9 - ro.y) / rd.y;
  vec3 p = ro + rd * t;
  vec2 w = p.xz + vec2(uTime * SPEED, 0.0);    // the water slides under a bird flying toward +x
  float e = 0.02;
  float h0 = fbm(w * 1.6 + vec2(0, uTime * 0.15), 5) + 0.4 * fbm(w * 7.0 - uTime * 0.2, 3);
  float hx = fbm((w + vec2(e, 0)) * 1.6 + vec2(0, uTime * 0.15), 5) + 0.4 * fbm((w + vec2(e, 0)) * 7.0 - uTime * 0.2, 3);
  float hz = fbm((w + vec2(0, e)) * 1.6 + vec2(0, uTime * 0.15), 5) + 0.4 * fbm((w + vec2(0, e)) * 7.0 - uTime * 0.2, 3);
  float amp = 0.035 * exp(-t * 0.03);
  vec3 n = normalize(vec3((h0 - hx) / e * amp, 1.0, (h0 - hz) / e * amp));
  vec3 r = reflect(rd, n);
  float fr = 0.02 + 0.98 * pow(1.0 - sat(dot(n, -rd)), 5.0);
  vec3 c = mix(vec3(0.05, 0.055, 0.06), sky(r), fr);
  c += SUNC * pow(sat(dot(r, SUN)), 400.0) * 12.0;   // glitter
  return mix(c, sky(rd), 1.0 - exp(-t * 0.012));
}

vec3 shade(vec2 fc) {
  // thin-lens camera: the jitter also picks a point on the aperture
  vec2 pp = (2.0 * (fc + uJitter) - uRes) / uRes.y;
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  float f = 1.0 / tan(radians(uFov) * 0.5);
  vec3 rd0 = normalize(pp.x * uu + pp.y * vv + f * ww);
  vec3 fp = uCamPos + rd0 * (uFocus / dot(rd0, ww));
  float ang = hash12(uJitter * 91.7 + 3.1) * 6.2831, rad = sqrt(hash12(uJitter * 37.3 + 1.7));
  vec3 ro = uCamPos + (uu * cos(ang) + vv * sin(ang)) * rad * uAperture;
  vec3 rd = normalize(fp - ro);

  gPh = uTime * FLAP * 6.2831;
  vec3 col = rd.y < -0.004 ? water(ro, rd) : sky(rd);

  // march the bird
  float t = 0.05; bool hit = false;
  float tb = length(ro) - 0.4;
  if (tb < 6.0) {
    t = max(t, tb);
    for (int i = 0; i < 180; i++) {
      float h = map(ro + rd * t);
      if (h < 0.00015 * t) { hit = true; break; }
      t += h * 0.85;
      if (t > tb + 0.9) break;
    }
  }
  if (hit) {
    vec3 p = ro + rd * t;
    map(p);
    float part = gPart, fid = gFeather;
    vec3 n = calcNormal(p);
    vec3 alb = vec3(0.86, 0.85, 0.83);
    float rough = 0.7;
    if (part == 1.0) {
      // barbs: fine striation across each feather, and a faint grey on the flight feathers
      alb *= 0.93 + 0.07 * sin(dot(p, vec3(1.0, 0.4, 0.7)) * 900.0 + fid * 30.0);
      alb = mix(alb, vec3(0.7, 0.71, 0.74), step(2.0, fid) * 0.35 * fract(fid));
    }
    if (part == 0.0) {
      // contour feathers: soft overlapping rows over the body
      vec2 fu = vec2(p.x * 95.0, p.z * 80.0 + p.y * 40.0);
      vec2 cell = floor(fu); vec2 fr = fract(fu) - 0.5;
      fr.x += 0.5 * mod(cell.y, 2.0);
      float sc = smoothstep(0.55, 0.2, length(fr * vec2(1.0, 1.4)));
      vec3 bump = vec3(-0.35 * sc, 0.0, fr.y * 0.3 * sc);
      n = normalize(n + (bump - n * dot(n, bump)) * 0.35);
      alb *= 0.94 + 0.06 * sc;
    }
    if (part == 2.0) { alb = vec3(0.42, 0.33, 0.32); rough = 0.4; }
    if (part == 3.0) { alb = vec3(0.10, 0.13, 0.05); rough = 0.35; }
    if (part == 4.0) { alb = vec3(0.02); rough = 0.05; }
    float sh = shadowD(p + n * 0.001, SUN);
    float dif = sat(dot(n, SUN));
    // light passing through thin feathers and the leaf
    float thin = part == 1.0 || part == 3.0 ? exp(-thickness(p - n * 0.001, -SUN) * 0.35) : 0.0;
    float back = pow(sat(dot(rd, SUN)), 1.5) * thin;
    vec3 transC = part == 3.0 ? vec3(0.45, 0.6, 0.15) : vec3(1.0, 0.72, 0.5);
    col = alb * SUNC * dif * sh * 0.5;
    col += alb * transC * SUNC * back * 0.5 * (0.3 + 0.7 * sh);
    col += alb * vec3(0.32, 0.34, 0.46) * (0.5 + 0.5 * n.y) * 0.55;              // sky fill
    col += alb * vec3(0.45, 0.3, 0.2) * sat(-n.y + 0.3) * 0.5;                   // warm water bounce
    float fres = pow(1.0 - sat(dot(n, -rd)), 4.0);
    col += SUNC * fres * sh * 0.08 * (1.0 - rough);
    vec3 hv = normalize(SUN - rd);
    col += SUNC * pow(sat(dot(n, hv)), mix(16.0, 300.0, 1.0 - rough)) * (1.0 - rough) * sh * 0.6;
    // sheen at the silhouette where evening light grazes the plumage
    col += vec3(1.0, 0.7, 0.45) * pow(1.0 - sat(dot(n, -rd)), 3.0) * sat(dot(-rd, SUN) * -1.0 + 0.3) * 0.0;
  }

  // lyric plane
  vec3 tp = planeUV(uCamPos, rd0, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    vec4 tx = texture(uText, tp.xy);
    col = col * (1.0 - tx.a) + tx.rgb * 1.4;
  }
  return col;
}
`;

export default {
  name: 'dove', from: FROM, to: TO,
  textSize: [4096, 1024],
  frag,
  uniforms: { uAperture: 0.007, uFocus: 0.9 },
  camera(t) {
    // orbit from in front-left of the bird round to its side, low over the water
    const a = keys(t, [[FROM, 1.95], [TO, 1.05, ease.inOut3]]);
    const r = keys(t, [[FROM, 1.9], [A.lines[1].start, 1.35], [TO, 1.25, ease.inOut3]]);
    const pos = [Math.cos(a) * r + 0.02, keys(t, [[FROM, -0.03], [TO, 0.05]]), Math.sin(a) * r];
    const target = [0.06, 0.02, 0.0];
    return { pos, target, fov: 30, roll: keys(t, [[FROM, 0.04], [TO, -0.03]]) };
  },
  update(t, u) {
    const cam = this.camera(t);
    u.uFocus.value = Math.hypot(cam.pos[0] - 0.08, cam.pos[1], cam.pos[2]);
  },
  textPlane(t, cam) { return cameraPlane(cam, { x: -0.36, y: 0.55, width: 0.6, dist: 0.2, aspect: 4 }); },
  post(t) { return { exposure: 1.0, bloom: 0.1, threshold: 1.1, grain: 0.028, vignette: 0.5, ca: 0.3, saturation: 1.0, contrast: 1.04 }; },
  drawText(ctx, t) {
    const L = A.lines[t < A.lines[1].start - 0.15 ? 0 : 1];
    const out = L === A.lines[0] ? 1 - ease.inOut3((t - (A.lines[1].start - 0.4)) / 0.25) : 1;
    ctx.font = '500 56px "Inter Tight"'; ctx.letterSpacing = '14px';
    ctx.fillStyle = `rgba(255, 236, 220, ${(0.72 * out).toFixed(3)})`;
    ctx.fillText('GENESIS 8 : 11', 8, 150);
    ctx.font = `${L === A.lines[1] ? 'italic ' : ''}500 230px "EB Garamond"`;
    ctx.letterSpacing = '-2px';
    let x = 0;
    for (const w of L.words) {
      const s = smartQuotes(w.w).replace(/[,.;]$/, '');
      const st = wordState(w, t);
      ctx.fillStyle = `rgba(255, 244, 232, ${(st.a * out).toFixed(3)})`;
      ctx.fillText(s, x, 520 + (1 - st.on) * 24);
      x += ctx.measureText(s + ' ').width;
    }
  },
};
