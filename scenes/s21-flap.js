// 21 · "In Noe's six hundred first year, / first month, the first day,"
// A split-flap board over the dawn water: the year, month and day flip through their figures and lock
// on the words that name them, and the gauge beneath reads the flood gone.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01, annotate, SIGNAL } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('In Noe', 'first month, the first day');
const find = (L, s) => L.words.find((w) => clean(w.w).toLowerCase().startsWith(s));

export default (P) => ({
  name: 's21-flap', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: SEA_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    vec4 tx = texture(uText, tp.xy);
    c = c * (1.0 - tx.a) + tx.rgb * 1.15;
  }
  return c;
}`,
  uniforms: { ...SEA_UNIFORMS, uNight: 0.0, uWind: 0.06, uSunDir: [0.0, 0.03, 1.0], uSunCol: [1.6, 1.1, 0.7], uLineGlow: 1.3 },
  camera(t) {
    const p = (t - P.from) / (P.to - P.from);
    return { pos: [0, 0.9 + 0.3 * p, 0], target: [0, 0.95 + 0.3 * p, 50], fov: 36, roll: 0 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) { u.uWarm.value = warmth(t) + 0.15; },
  post(t) { return grade(t, { exposure: 0.95 }); },
  drawText(ctx, t) {
    // the board: dark flaps with pale figures
    const cells = [
      { v: '6', at: find(L1, 'six').start }, { v: '0', at: find(L1, 'hundred').start }, { v: '1', at: find(L1, 'first').start },
      { gap: true },
      { v: '0', at: find(L2, 'month').start - 0.2 }, { v: '1', at: find(L2, 'month').start },
      { gap: true },
      { v: '0', at: find(L2, 'day').start - 0.2 }, { v: '1', at: find(L2, 'day').start },
    ];
    const fw = 260, fh = 380, gapW = 120;
    const total = cells.reduce((a, c) => a + (c.gap ? gapW : fw + 18), 0);
    let x = 1920 - total / 2; const y = 520;
    const show = ease.out3((t - (P.from + 0.1)) / 0.5);
    ctx.font = '700 300px "Inter Tight"'; ctx.letterSpacing = '0px';
    for (const c of cells) {
      if (c.gap) { ctx.fillStyle = `rgba(${SIGNAL}, ${(0.8 * show).toFixed(3)})`; ctx.fillRect(x + gapW / 2 - 8, y + fh / 2 - 8, 16, 16); x += gapW; continue; }
      // before its word, the flap keeps flipping through figures; a flip takes 90 ms
      const flipping = t < c.at;
      const n = Math.floor(Math.max(0, t - P.from) / 0.09);
      const f = (Math.max(0, t - P.from) / 0.09) % 1;
      const digit = flipping ? String((n * 7 + x) % 10 | 0) : c.v;
      const next = flipping ? String(((n + 1) * 7 + x) % 10 | 0) : c.v;
      ctx.fillStyle = `rgba(22, 26, 30, ${(0.88 * show).toFixed(3)})`;
      ctx.fillRect(x, y, fw, fh);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, fw, fh); ctx.clip();
      ctx.fillStyle = `rgba(246, 240, 230, ${show.toFixed(3)})`;
      const w = ctx.measureText(digit).width;
      ctx.fillText(digit, x + (fw - w) / 2, y + fh * 0.5 + 105);
      if (flipping) {
        // the falling top half of the next figure
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, fw, fh / 2); ctx.clip();
        ctx.translate(0, y + fh / 2); ctx.scale(1, Math.abs(Math.cos(f * Math.PI)) + 0.001); ctx.translate(0, -(y + fh / 2));
        ctx.fillStyle = 'rgba(30, 34, 40, 1)'; ctx.fillRect(x, y, fw, fh / 2);
        ctx.fillStyle = `rgba(246, 240, 230, ${show.toFixed(3)})`;
        ctx.fillText(f < 0.5 ? digit : next, x + (fw - ctx.measureText(next).width) / 2, y + fh * 0.5 + 105);
        ctx.restore();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y + fh / 2 - 2, fw, 4);   // the hinge line
      x += fw + 18;
    }
    const lx = 1920 - total / 2;
    annotate(ctx, 'YEAR', lx, y - 40, { size: 44, alpha: 0.85 * show, color: '30, 38, 46' });
    annotate(ctx, 'MONTH', lx + 3 * (fw + 18) + gapW, y - 40, { size: 44, alpha: 0.85 * show, color: '30, 38, 46' });
    annotate(ctx, 'DAY', lx + 5 * (fw + 18) + 2 * gapW, y - 40, { size: 44, alpha: 0.85 * show, color: '30, 38, 46' });
    // the sung lines beneath the board
    const row = (L, yy, px, italic) => {
      ctx.font = `${italic ? 'italic ' : ''}500 ${px}px "EB Garamond"`; ctx.letterSpacing = '-1px';
      const ws = L.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.]+$/, '') }));
      const tot = ctx.measureText(ws.map((w) => w.s).join(' ')).width;
      let xx = 1920 - tot / 2;
      for (const w of ws) {
        const k = ease.out3((t - w.start + 0.1) / 0.4);
        if (k > 0) { ctx.fillStyle = `rgba(250, 240, 226, ${k.toFixed(3)})`; ctx.fillText(w.s, xx, yy); }
        xx += ctx.measureText(w.s + ' ').width;
      }
    };
    row(L1, 1640, 160, false);
    row(L2, 1850, 160, true);
  },
});
