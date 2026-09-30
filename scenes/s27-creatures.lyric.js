// The words of s27-creatures, drawn as their own layer over the picture.
// 27 · "Bring out every creature with you: / birds, beasts, all living flesh, / everything that crawls on earth."
// Outside now, in full morning colour. Down the ark's ramp and across the new grass comes a procession
// of sculpted animals, and birds break out over them. The words are kept like a catalogue: each kind
// is entered in the index on the left as it is sung.
import { keys, ease, grade, linesFrom, clean, clamp01, annotate, SIGNAL, paintHere } from '/song/lib/type.js';
import { GROUND_GLSL, GROUND_UNIFORMS } from '/song/lib/ground.js';
import { ARK_GLSL } from '/song/lib/ark.js';
import { BIRD_GLSL } from '/song/lib/bird.js';
import { cameraPlane } from '/engine.js';

const [L1, L2, L3] = linesFrom('Bring out every creature', 'birds, beasts, all living flesh', 'everything that crawls');

const __scene = (P) => ({
  name: 's27-creatures', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: GROUND_GLSL + ARK_GLSL + BIRD_GLSL + /* glsl */ `
uniform float uWalk;
// the ark sits behind, its door lowered to the ground as a ramp
vec3 arkP(vec3 p) { vec3 q = p - vec3(-70.0, 0.0, 190.0); q.xz = rot(-0.35) * q.xz; return q; }
// a quadruped: body, neck, head and four legs; s = size, k = build (0 stocky .. 1 slender)
float beast(vec3 p, float s, float k, float ph) {
  p /= s;
  float leg = 0.55 + 0.4 * k;
  float d = sdEllipsoid(p - vec3(0.0, leg + 0.25, 0.0), vec3(0.62, 0.3 - 0.06 * k, 0.26 - 0.05 * k));
  vec3 neckTop = vec3(0.7 + 0.1 * k, leg + 0.55 + 0.35 * k, 0.0);
  d = smin(d, sdCapsule(p, vec3(0.45, leg + 0.3, 0.0), neckTop, 0.12 - 0.03 * k), 0.12);
  d = smin(d, sdEllipsoid(p - neckTop - vec3(0.12, 0.0, 0.0), vec3(0.2, 0.1, 0.09)), 0.06);
  for (int i = 0; i < 4; i++) {
    float fx = i < 2 ? 0.42 : -0.42, fz = (i % 2 == 0) ? 0.14 : -0.14;
    float sw = sin(ph + float(i) * 1.6 + (i < 2 ? 0.0 : 3.14)) * 0.18;
    vec3 hip = vec3(fx, leg + 0.1, fz);
    vec3 foot = vec3(fx + sw, 0.0, fz);
    d = smin(d, sdCapsule(p, hip, foot, 0.06 - 0.015 * k), 0.06);
  }
  return d * s;
}
float herdUnused(vec3 p, out float id) {
  float d = 1e9; id = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float along = uWalk * 2.4 - fi * 3.2 + 6.0;             // distance walked down the path
    vec3 pos = vec3(-26.0 + along * 1.0, 0.0, 30.0 - along * 0.25) + vec3(0.0, 0.0, (hash11(fi) - 0.5) * 4.0);
    if (along < 0.0) continue;
    vec3 q = p - pos; q.xz = rot(-0.25) * q.xz;
    float s = 0.8 + 1.4 * hash11(fi * 3.7), k = hash11(fi * 5.3);
    float b = beast(q, s, k, uWalk * 3.0 + fi);
    if (b < d) { d = b; id = fi; }
  }
  return d;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = groundScene(ro, rd, depth);
  // tracks: every kind of foot pressing into the drying ground, trails fanning out from the ark
  if (depth < 1e3) {
    vec3 p = ro + rd * depth;
    float press = 0.0;
    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      float ang = -1.2 + 2.4 * fi / 13.0 + (hash11(fi) - 0.5) * 0.2;
      vec2 dir = vec2(sin(ang), -cos(ang));
      vec2 perp = vec2(-dir.y, dir.x);
      vec2 st = vec2(-12.0, 44.0) + perp * (hash11(fi + 3.0) - 0.5) * 4.0;
      float kind = floor(hash11(fi * 7.1) * 3.0);        // 0 hoof, 1 paw, 2 bird
      float sz = (kind == 2.0 ? 0.35 : 0.6 + 0.8 * hash11(fi * 2.3)) * 2.4;
      float stepL = (kind == 2.0 ? 0.35 : 0.55) * sz * 1.4;
      vec2 q = p.xz - st;
      float sAlong = dot(q, dir);
      float walked = max(0.0, uWalk - fi * 0.35) * (3.5 + hash11(fi) * 2.0);
      if (sAlong < -1.0 || sAlong > walked + 1.0) continue;
      float k0 = floor(sAlong / stepL);
      for (int kk = 0; kk < 2; kk++) {
        float k = k0 + float(kk);
        if (k < 0.0 || k * stepL > walked) continue;
        float side = mod(k, 2.0) < 1.0 ? 1.0 : -1.0;
        float wig = sin(k * stepL * 0.25 + fi) * 1.2;
        vec2 c0 = dir * (k * stepL) + perp * (wig + side * 0.12 * sz);
        vec2 l = vec2(dot(q - c0, perp), dot(q - c0, dir)) / sz;
        float d;
        if (kind == 0.0) d = min(length((l - vec2(0.05, 0.0)) * vec2(1.6, 1.0)) - 0.07, length((l + vec2(0.05, 0.0)) * vec2(1.6, 1.0)) - 0.07);
        else if (kind == 1.0) { d = length(l * vec2(1.0, 1.2)) - 0.06; for (int t2 = 0; t2 < 4; t2++) { float a = -0.9 + 0.6 * float(t2); d = min(d, length(l - vec2(sin(a), cos(a)) * 0.1) - 0.025); } }
        else { d = 1e3; for (int t2 = 0; t2 < 3; t2++) { float a = -0.6 + 0.6 * float(t2); vec2 e = vec2(sin(a), cos(a)); float h = clamp(dot(l, e), 0.0, 0.13); d = min(d, length(l - e * h) - 0.012); } d = min(d, length(l + vec2(0.0, 0.03) - clamp(dot(l + vec2(0, 0.03), vec2(0, -1)), 0.0, 0.05) * vec2(0, -1)) - 0.012); }
        float age = sat((walked - k * stepL) * 2.0);
        press = max(press, smoothstep(0.012, -0.004, d * sz) * age);
      }
    }
    c *= 1.0 - 0.7 * press;
  }
  // ark
  float t = 20.0; bool hit = false;
  for (int i = 0; i < 120; i++) { float d = arkSDF(arkP(ro + rd * t)); if (d < 0.002 * t) { hit = true; break; } t += d; if (t > 200.0) break; }
  if (hit && t < depth) {
    vec3 p = ro + rd * t; vec2 e = vec2(0.02, 0);
    vec3 n = normalize(vec3(arkSDF(arkP(p + e.xyy)) - arkSDF(arkP(p - e.xyy)), arkSDF(arkP(p + e.yxy)) - arkSDF(arkP(p - e.yxy)), arkSDF(arkP(p + e.yyx)) - arkSDF(arkP(p - e.yyx))));
    float r; vec3 alb = arkColor(arkP(p), n, r);
    c = alb * (vec3(0.5, 0.45, 0.4) * (0.5 + 0.5 * n.y) * 0.5) + vec3(1.0, 0.66, 0.3) * pow(1.0 - sat(dot(n, -rd)), 3.0) * 0.4;
    c = mix(c, gSky(normalize(vec3(rd.x, 0.01, rd.z))), 1.0 - exp(-t * 0.006));
    depth = t;
  }
  // birds breaking out over them
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float u = uWalk - 2.0 - fi * 0.7;
    if (u < 0.0) continue;
    vec3 pos = vec3(-30.0 + u * 5.0 + fi * 2.0, 4.0 + u * 1.6 + fi, 40.0 - u * 1.0 - fi * 2.0);
    vec3 lp, lrd;
    float tb = birdMarch(ro, rd, pos, -0.6 + fi * 0.2, 0.1, 2.5, uWalk * 14.0 + fi, 0.0, 1.0, lp, lrd);
    if (tb > 0.0 && tb < depth) { c = birdShade(lp, lrd, -0.6 + fi * 0.2, 0.1, uWalk * 14.0 + fi, 0.0, 1.0, SUN, uSunCol * 0.25, vec3(0.6, 0.7, 0.85), 0.0); depth = tb; }
  }
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  return c;
}`,
  uniforms: { ...GROUND_UNIFORMS, uGreen: 0.72, uWet: 0.25, uGLine: 0.3, uWalk: 0, uSunDir: [0.5, 0.18, 1.0], uSunCol: [9.0, 6.8, 4.4] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    return { pos: [-10 + 3 * p, 6.5 + 1.5 * p, 14 + 4 * p], target: [-11 + 2 * p, 0.0, 36], fov: 50, roll: 0 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) { u.uWalk.value = Math.max(0, t - P.from); },
  post(t) { return grade(t, { exposure: 1.0, saturation: 1.08 }); },
  drawText(ctx, t) {
    // lyric: one line at a time along the bottom
    const lines = [L1, L2, L3];
    const cur = lines.filter((L) => t > L.start - 0.3).pop();
    if (cur) {
      ctx.font = `${cur === L1 ? '' : 'italic '}500 170px "EB Garamond"`; ctx.letterSpacing = '-1px';
      const out = cur === L3 ? 1 : 1 - clamp01((t - (lines[lines.indexOf(cur) + 1].start - 0.35)) / 0.3);
      let x = 220;
      for (const w of cur.words) {
        const s = clean(w.w).replace(/[;,.:]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.4);
        if (k > 0) { paintHere(ctx, s, x, 1940, (k * out).toFixed(3)); }
        x += paintHere(ctx, s, 0, 0, 0);
      }
    }
    // the catalogue: an index entry for every kind named
    const kinds = [
      ['creature', 'EVERY CREATURE'], ['birds', 'BIRDS'], ['beasts', 'BEASTS'], ['living', 'ALL LIVING FLESH'], ['crawls', 'ALL THAT CRAWLS'],
    ];
    const all = [...L1.words, ...L2.words, ...L3.words];
    let row = 0;
    for (const [key, label] of kinds) {
      const w = all.find((x) => clean(x.w).toLowerCase().startsWith(key));
      const k = ease.out3((t - w.start + 0.05) / 0.35);
      if (k <= 0) continue;
      const y = 300 + row * 110;
      annotate(ctx, String(row + 1).padStart(2, '0'), 220, y, { size: 52, alpha: 0.9 * k, color: '255, 255, 255' });
      annotate(ctx, label, 360, y, { size: 52, alpha: 0.95 * k, color: '255, 255, 255' });
      ctx.fillStyle = `rgba(255,255,255,${(0.6 * k).toFixed(3)})`; ctx.fillRect(220, y + 26, 900 * k, 3);
      row++;
    }
  },
});

export default (P) => { const s = __scene(P); return { textSize: s.textSize, textPlane: s.textPlane, drawText: s.drawText, shade: 1.0 }; };
