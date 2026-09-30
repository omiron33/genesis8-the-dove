// 07 · "After one hundred fifty days / they had fallen; the ark came to rest,"
// A counter rolls to 150 like the drum of a gauge while the camera rises over the calming sea and
// the ark far below; on "rest" the counter locks and the whole frame settles.
import { keys, ease, grade, warmth, linesFrom, clean, annotate, clamp01, SIGNAL, paintHere } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('After one hundred fifty days', 'they had fallen');
const rest = L2.words.find((w) => w.w.startsWith('rest')).start;

export default (P) => ({
  name: 's07-days', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: SEA_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  return c;
}`,
  uniforms: { ...SEA_UNIFORMS, uNight: 0.5, uWind: 0.1, uArkDist: 480, uLineGlow: 0.7, uSunDir: [0.4, 0.18, 1.0], uSunCol: [0.85, 0.87, 0.9] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (rest + 0.8 - P.from));
    const settle = Math.exp(-Math.max(0, t - rest) * 3) * Math.sin(Math.max(0, t - rest) * 9) * 0.6;
    const pos = [-40 + 25 * p, 10 + 40 * p + settle, 40 * p];
    return { pos, target: [110, -10, 480], fov: keys(t, [[P.from, 38], [P.to, 30]]), roll: 0.02 * (1 - p) };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) { u.uWarm.value = warmth(t); u.uWind.value = keys(t, [[P.from, 0.2], [rest, 0.02]]); },
  post(t) { return grade(t, { exposure: 1.0, vignette: 0.55 }); },
  drawText(ctx, t) {
    const H = ctx.canvas.height;
    // the counter drum: three wheels, the ones wheel smeared when it spins fast
    const val = (tt) => 1 + 149 * ease.out5((tt - (L1.start - 0.2)) / (L1.end - L1.start + 1.2));
    const v = val(t), dv = Math.abs(val(t + 1 / 60) - v);
    const size = 760, x0 = 200, y0 = 1150;
    ctx.font = `800 ${size}px "Inter Tight"`; ctx.letterSpacing = '-20px';
    const cw = ctx.measureText('0').width - 12;
    const show = clamp01((t - (L1.start - 0.6)) / 0.4);
    const wheel = (value, i, blur) => {
      const x = x0 + i * cw;
      ctx.save(); ctx.beginPath(); ctx.rect(x - 10, y0 - size * 0.78, cw + 20, size * 0.84); ctx.clip();
      const n = blur > 0.25 ? 6 : 1;
      for (let s = 0; s < n; s++) {
        const vv = value + (n > 1 ? (s / (n - 1) - 0.5) * Math.min(blur, 1) : 0);
        const d = Math.floor(vv), f = vv - d;
        ctx.fillStyle = `rgba(246, 240, 230, ${(show / n).toFixed(3)})`;
        ctx.fillText(String(((d % 10) + 10) % 10), x, y0 - f * size * 0.9);
        ctx.fillText(String((((d + 1) % 10) + 10) % 10), x, y0 + (1 - f) * size * 0.9);
      }
      ctx.restore();
    };
    wheel(Math.floor(v / 100) + Math.max(0, (v % 100) - 99), 0, 0);
    wheel(Math.floor(v / 10) + Math.max(0, (v % 10) - 9), 1, dv / 10);
    wheel(v, 2, dv);
    annotate(ctx, 'DAYS', x0 + 8, y0 - size * 0.84, { size: 54, alpha: 0.8 * show });
    // the line under the counter is the waterline, and it locks on "rest"
    const lock = ease.out3((t - rest) / 0.5);
    ctx.fillStyle = `rgba(${SIGNAL}, ${(0.35 + 0.65 * lock) * show})`;
    ctx.fillRect(x0, y0 + 70, cw * 3 * (0.3 + 0.7 * lock), 6);
    // the sung lines, in the lyric voice beside and below
    const row = (L, x, y, px, italic) => {
      ctx.font = `${italic ? 'italic ' : ''}500 ${px}px "EB Garamond"`; ctx.letterSpacing = `${-0.01 * px}px`;
      for (const w of L.words) {
        const s = clean(w.w).replace(/[;,.]+$/, '');
        const k = ease.out3((t - w.start + 0.1) / 0.4);
        if (k > 0) { paintHere(ctx, s, x, y + (1 - k) * 30, k.toFixed(3)); }
        x += paintHere(ctx, s, 0, 0, 0);
      }
    };
    row(L1, x0 + cw * 3 + 120, y0 - 380, 150, false);
    row(L2, x0, y0 + 520, 170, true);
    void H;
  },
});
