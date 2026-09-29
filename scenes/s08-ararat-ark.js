// 08 · "in month seven, day twenty-seven, / on Ararat's mountains."
// The ark has come to rest on a high saddle, the flood still just below it. The camera orbits the
// hull; the date is stamped in the gauge voice as the words arrive, the mountain's name in the lyric voice.
import { keys, ease, grade, warmth, linesFrom, clean, annotate, clamp01, SIGNAL } from '/song/lib/look.js';
import { MOUNTAIN_GLSL, MOUNTAIN_UNIFORMS } from '/song/lib/mountain.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('in month seven', 'on Ararat');

export default (P) => ({
  name: 's08-ararat-ark', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: MOUNTAIN_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = mountainScene(ro, rd, jit, depth);
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    vec4 tx = texture(uText, tp.xy);
    c = c * (1.0 - tx.a) + tx.rgb * 1.2;
  }
  return c;
}`,
  uniforms: { ...MOUNTAIN_UNIFORMS, uRel: 1, uWater: -0.03, uTide: 1, uMist: -1, uSunDir: [-0.6, 0.38, 0.5], uSunCol: [8.5, 8.5, 8.8] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    const a = 4.25 + 0.75 * p;
    const r = 0.52 - 0.16 * p;
    return { pos: [Math.cos(a) * r, 0.24 - 0.09 * p, Math.sin(a) * r], target: [0, 0.004, 0], fov: 32, roll: 0.02 - 0.03 * p };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.05, aspect: 16 / 9 }); },
  update(t, u) { u.uWarm.value = warmth(t); u.uWater.value = keys(t, [[P.from, -0.02], [P.to, -0.035]]); },
  post(t) { return grade(t, { exposure: 1.0 }); },
  drawText(ctx, t) {
    // the date, stamped: each figure punches in on its word
    const find = (s) => L1.words.find((w) => w.w.toLowerCase().startsWith(s));
    const stamp = (label, value, x, y, w) => {
      const k = ease.out5((t - w.start + 0.05) / 0.25);
      if (k <= 0) return;
      annotate(ctx, label, x, y - 250, { size: 48, alpha: 0.8 * k });
      ctx.font = '800 300px "Inter Tight"'; ctx.letterSpacing = '-8px';
      ctx.fillStyle = `rgba(246, 240, 230, ${k.toFixed(3)})`;
      const sc = 1 + (1 - k) * 0.25;
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.fillText(value, 0, 0); ctx.restore();
      ctx.fillStyle = `rgba(${SIGNAL}, ${(0.9 * k).toFixed(3)})`; ctx.fillRect(x, y + 40, 300 * k, 5);
    };
    stamp('MONTH', '07', 180, 560, find('seven'));
    stamp('DAY', '27', 700, 560, find('twenty'));
    // the lyric line itself, small, beneath the figures
    ctx.font = '500 120px "EB Garamond"'; ctx.letterSpacing = '-1px';
    let x = 180;
    for (const w of L1.words) {
      const s = clean(w.w).replace(/[,;.]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.4);
      if (k > 0) { ctx.fillStyle = `rgba(246, 240, 230, ${(0.85 * k).toFixed(3)})`; ctx.fillText(s, x, 800); }
      x += ctx.measureText(s + ' ').width;
    }
    // the mountain's name, large, low across the frame
    ctx.font = 'italic 500 260px "EB Garamond"'; ctx.letterSpacing = '-3px';
    let x2 = 180;
    for (const w of L2.words) {
      const s = clean(w.w).replace(/[,;.]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.5);
      if (k > 0) { ctx.fillStyle = `rgba(246, 240, 230, ${k.toFixed(3)})`; ctx.fillText(s, x2, 1700 + (1 - k) * 40); }
      x2 += ctx.measureText(s + ' ').width;
    }
  },
});
