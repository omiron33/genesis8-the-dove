// 36 · "none shall cease." and the close.
// The opening sea again, now calm and warm at sunrise: the gold waterline has settled for good as the
// horizon. The promise's last words in the sacred register, then the title, then the light goes.
import { keys, ease, grade, linesFrom, clean, clamp01, annotate, paintHere, widthHere } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { cameraPlane } from '/engine.js';

const [L1] = linesFrom('none shall cease');

export default (P) => ({
  name: 's36-cease', from: P.from, to: P.to,
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
  uniforms: { ...SEA_UNIFORMS, uNight: 0.0, uWind: 0.04, uWarm: 1, uLine: 1.2, uLineGlow: 1.3, uSunDir: [0.0, 0.035, 1.0], uSunCol: [2.4, 1.4, 0.6] },
  camera(t) {
    const p = (t - P.from) / (P.to - P.from);
    return { pos: [0, 2.2 + 1.2 * p, 0], target: [0, 2.0 + 1.2 * p, 60], fov: 40 - 4 * p, roll: 0 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) { u.uSunDir.value.set(0.0, 0.02 + 0.05 * ease.inOut3((t - P.from) / (P.to - P.from)), 1.0); },
  post(t) { return grade(t, { exposure: keys(t, [[P.from, 1.0], [P.to - 2.2, 1.0], [P.to - 0.2, 0.0, ease.inOut3]]), bloom: 0.1 }); },
  drawText(ctx, t) {
    const out = 1 - clamp01((t - (L1.end + 2.5)) / 1.2);
    ctx.font = '500 190px "EB Garamond"'; ctx.fontVariantCaps = 'all-small-caps'; ctx.letterSpacing = '40px';
    const ws = L1.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.:”]+$/, '') }));
    const tot = widthHere(ctx, ws.map((w) => w.s));
    let x = 1920 - tot / 2;
    for (const w of ws) {
      const k = ease.out3((t - w.start + 0.1) / 0.8);
      if (k > 0) { paintHere(ctx, w.s, x, 760, (k * out).toFixed(3)); }
      x += ctx.measureText(w.s + '   ').width;
    }
    ctx.fontVariantCaps = 'normal';
    // end title
    const e = clamp01((t - (L1.end + 3.4)) / 1.5) * (1 - clamp01((t - (P.to - 2.4)) / 1.6));
    if (e > 0) {
      annotate(ctx, 'GENESIS  8', 1920, 700, { size: 60, alpha: 0.85 * e, align: 'center', tracking: 0.5, color: '255, 255, 255' });
      ctx.font = 'italic 500 200px "EB Garamond"'; ctx.letterSpacing = '-2px';
      ctx.fillStyle = `rgba(255,255,255,${e.toFixed(3)})`;
      const w = ctx.measureText('The Dove').width;
      ctx.fillText('The Dove', 1920 - w / 2, 930);
    }
  },
});
