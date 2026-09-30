// The words of s28-teem, drawn as their own layer over the picture.
// 28 · "Let them teem and multiply; / let them fill the earth."
// A blue morning over the green land. One bird, then two, four, a hundred: the flock doubles on the
// beat until a murmuration fills the sky. The word "multiply" multiplies with it, filling the frame
// in a widening field before the last line settles.
import { keys, ease, grade, linesFrom, clean, clamp01, paintHere, widthHere } from '/song/lib/type.js';
import { GROUND_GLSL, GROUND_UNIFORMS } from '/song/lib/ground.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('Let them teem and multiply', 'let them fill the earth');
const mult = L1.words.find((w) => w.w.startsWith('multiply'));

const __scene = (P) => ({
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
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
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
  drawText(ctx, t) {
    // the multiplying word: one copy, then copies doubling outward in a field
    const k = clamp01((t - mult.start) / (L2.start - mult.start + 0.8));
    const n = t < mult.start ? 0 : Math.min(128, Math.floor(Math.pow(2, 1 + k * 7)));
    ctx.font = 'italic 500 150px "EB Garamond"'; ctx.letterSpacing = '0px';
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, r = 150 * Math.sqrt(i) ;
      const x = 1920 + Math.cos(a) * r * 1.7, y = 900 + Math.sin(a) * r;
      const fade = (i === 0 ? 1 : 0.8) * (1 - clamp01((t - (L2.start + 0.2)) / 0.6) * (i === 0 ? 0.3 : 1));
      ctx.fillStyle = `rgba(255,255,255,${fade.toFixed(3)})`;
      const w = ctx.measureText('multiply').width;
      ctx.fillText('multiply', x - w / 2, y);
    }
    const row = (L, y, px, italic, alpha) => {
      ctx.font = `${italic ? 'italic ' : ''}500 ${px}px "EB Garamond"`; ctx.letterSpacing = '-1px';
      const ws = L.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.:”]+$/, '') }));
      const tot = widthHere(ctx, ws.map((w) => w.s));
      let x = 1920 - tot / 2;
      for (const w of ws) {
        const kk = ease.out3((t - w.start + 0.1) / 0.4);
        if (kk > 0 && !(L === L1 && w === ws[ws.length - 1] && n > 0)) { paintHere(ctx, w.s, x, y, (kk * alpha).toFixed(3)); }
        x += paintHere(ctx, w.s, 0, 0, 0);
      }
    };
    row(L1, 2020, 170, false, 1 - clamp01((t - (L2.start - 0.3)) / 0.4));
    row(L2, 2020, 190, true, 1);
  },
});

export default (P) => { const s = __scene(P); return { textSize: s.textSize, textPlane: s.textPlane, drawText: s.drawText, shade: 1.0 }; };
