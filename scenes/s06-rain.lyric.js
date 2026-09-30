// The words of s06-rain, drawn as their own layer over the picture.
// 06 · "the rain from heaven was held back. / The waters ebbed from all the earth."
// Rain falls, then stops in mid-air on "held back". The camera drifts forward through the hanging
// drops, each a tiny lens with the sky upside down in it. On the second line the words ebb: they
// sink a little and the gauge's level drops.
import { keys, ease, grade, warmth, linesFrom, clean, gauge, clamp01, paintHere, widthHere } from '/song/lib/type.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';

const [L1, L2] = linesFrom('the rain from heaven', 'The waters ebbed');

// distance the rain has fallen: fast, then braking to a stop at "held back"
function fallen(t) {
  const stop = L1.words[L1.words.length - 2].start;   // "held"
  const v0 = 8.0, brake = 0.7;
  if (t < stop) return v0 * t;
  const d = Math.min(t - stop, brake);
  return v0 * stop + v0 * (d - (d * d) / (2 * brake));
}

const __scene = (P) => ({
  name: 's06-rain', from: P.from, to: P.to,
  textSize: [4096, 2048],
  frag: SEA_GLSL + /* glsl */ `
uniform float uFall;      // metres the rain has fallen
uniform float uFallV;     // current fall speed (streak length)
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  // the lyric hangs among the drops
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && tp.z < depth && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  // drops composite over everything, nearer ones on top
  vec3 acc = vec3(0); float cover = 0.0;
  for (int k = 39; k >= 0; k--) {
    float zp = floor(ro.z / 0.3) * 0.3 + 0.3 * float(k + 1);
    float t = (zp - ro.z) / rd.z;
    if (t <= 0.08 || t > depth) continue;
    vec3 p = ro + rd * t;
    vec2 cell = vec2(0.22, 0.34);
    vec2 q = vec2(p.x, p.y + uFall + float(k) * 0.137);
    vec2 cc = floor(q / cell);
    float h = hash12(cc + zp * 17.0);
    if (h > 0.75) continue;
    vec2 o = (hash22(cc + zp * 3.0) - 0.5) * cell * 0.7;
    vec2 f = q - (cc + 0.5) * cell - o;
    float r = 0.004 + 0.005 * pow(hash12(cc + 5.0), 2.0);
    float len = uFallV * 0.004;
    vec2 g = vec2(f.x, max(abs(f.y) - len, 0.0));
    float d = length(g);
    float pw = t * 2.0 * tan(radians(uFov) * 0.5) / uRes.y;
    float a = sat((r + pw * 0.7 - d) / (pw * 1.4));
    if (a <= 0.0) continue;
    vec2 lp = vec2(f.x, f.y / (1.0 + len / r)) / max(r, 1e-4);
    vec3 inside = skyCol(normalize(vec3(-lp.x * 0.5, -lp.y * 0.6 + 0.1, 1.0))) * 0.85;
    float rim = smoothstep(0.55, 1.0, length(lp));
    vec3 dc = mix(inside, vec3(0.05, 0.06, 0.07), rim * 0.8) + vec3(1.2) * pow(sat(1.0 - length(lp - vec2(-0.35, 0.4)) * 3.0), 2.0);
    float fade = exp(-t * 0.1) * smoothstep(0.08, 0.35, t);
    c = mix(c, dc, a * fade);
  }
  return c;
}`,
  uniforms: { ...SEA_UNIFORMS, uNight: 0.3, uWind: 0.12, uFall: 0, uFallV: 8, uSunDir: [0.1, 0.15, 1.0], uSunCol: [0.75, 0.8, 0.86] },
  camera(t) {
    const z = keys(t, [[P.from, 0], [P.to, 3.6]], ease.inOut3);
    return { pos: [0.3 * Math.sin(t * 0.3), 1.35, z], target: [0, 1.25, z + 10], fov: 40, roll: 0.0 };
  },
  textPlane(t, cam) { const z = cam.pos[2]; return { c: [0, 1.3, z + 3.4], ax: [-1, 0, 0], ay: [0, 1, 0], hs: [2.0, 1.0] }; },
  update(t, u) {
    u.uFall.value = fallen(t);
    const e = 1 / 120;
    u.uFallV.value = (fallen(t + e) - fallen(t - e)) / (2 * e);
    u.uWarm.value = warmth(t);
  },
  post(t) { return grade(t, { exposure: 1.05 }); },
  drawText(ctx, t) {
    gauge(ctx, t, 60, 110, { alpha: 0.7, size: 36 });
    const row = (L, y, size, italic, sink) => {
      ctx.font = `${italic ? 'italic ' : ''}500 ${size}px "EB Garamond"`; ctx.letterSpacing = `${-0.01 * size}px`;
      const words = L.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.]+$/, '') }));
      const total = widthHere(ctx, words.map((w) => w.s));
      let x = (4096 - total) / 2;
      for (const w of words) {
        const k = ease.out3((t - w.start + 0.1) / 0.4);
        // ebbing: after it is sung each word slowly settles lower, like water going down
        const ebb = sink ? ease.inOut3((t - w.end) / 2.5) * 70 : 0;
        if (k > 0) { paintHere(ctx, w.s, x, y + (1 - k) * -40 + ebb, k.toFixed(3)); }
        x += paintHere(ctx, w.s, 0, 0, 0);
      }
    };
    const out = 1 - clamp01((t - (L2.start - 0.5)) / 0.4);
    if (out > 0) { ctx.globalAlpha = out; row(L1, 640, 230, false, false); ctx.globalAlpha = 1; }
    if (t > L2.start - 0.5) row(L2, 700, 230, true, true);
  },
});

export default (P) => { const s = __scene(P); return { textSize: s.textSize, textPlane: s.textPlane, drawText: s.drawText, shade: 1.0 }; };
