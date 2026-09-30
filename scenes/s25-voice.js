// 25 · "the earth was dry. / The Lord God spoke to Noe:"
// Stillness. A wide, low frame over the dried plain; nothing moves but the light. As "The Lord God"
// is sung, a column of warm light stands up from the horizon, and the name arrives in the sacred
// register: small capitals, widely spaced, slow.
import { keys, ease, grade, linesFrom, clean, clamp01, paintHere, widthHere } from '/song/lib/look.js';
import { GROUND_GLSL, GROUND_UNIFORMS } from '/song/lib/ground.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('the earth was dry', 'The Lord God spoke to Noe');

export default (P) => ({
  name: 's25-voice', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: GROUND_GLSL + /* glsl */ `
uniform float uRay;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = groundScene(ro, rd, depth);
  // the column of light over the horizon
  float col = exp(-abs(rd.x) * 9.0) * smoothstep(-0.01, 0.02, rd.y) * exp(-max(rd.y, 0.0) * 1.6);
  c += vec3(1.2, 0.95, 0.65) * col * uRay * 1.6;
  if (depth < 1e3) c += vec3(1.0, 0.8, 0.55) * exp(-abs(rd.x) * 6.0) * uRay * 0.15;
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  return c;
}`,
  uniforms: { ...GROUND_UNIFORMS, uWet: 0.0, uGLine: 0.0, uGreen: 0.15, uRay: 0, uSunDir: [0.0, 0.08, 1.0], uSunCol: [7, 5.6, 3.8] },
  camera(t) {
    const p = (t - P.from) / (P.to - P.from);
    return { pos: [0, 1.6, 0 + 1.2 * p], target: [0, 1.95, 40], fov: 38, roll: 0 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) { u.uRay.value = ease.inOut3((t - (L2.start - 0.5)) / 3.5); },
  post(t) { return grade(t, { exposure: 0.95, bloom: 0.12 }); },
  drawText(ctx, t) {
    // line 1, quiet and small, low on the frame
    const out1 = 1 - clamp01((t - (L2.start - 0.6)) / 0.6);
    ctx.font = 'italic 500 170px "EB Garamond"'; ctx.letterSpacing = '0px';
    let x = 1920 - ctx.measureText('the earth was dry').width / 2;
    for (const w of L1.words) {
      const s = clean(w.w).replace(/[;,.]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.5);
      if (k > 0) { paintHere(ctx, s, x, 1560, (k * out1).toFixed(3)); }
      x += paintHere(ctx, s, 0, 0, 0);
    }
    // the sacred register: "The Lord God" in widely spaced small capitals, then the rest in italic
    const name = L2.words.slice(0, 3), rest = L2.words.slice(3);
    ctx.font = '500 200px "EB Garamond"'; ctx.fontVariantCaps = 'all-small-caps'; ctx.letterSpacing = '60px';
    const txt = name.map((w) => clean(w.w)).join('  ');
    const k = ease.out3((t - name[0].start + 0.1) / 1.4);
    if (k > 0) {
      const parts = name.map((w) => clean(w.w));
      const w = widthHere(ctx, parts) + 120 * (parts.length - 1);
      let nx = 1920 - w / 2;
      for (const p of parts) nx += paintHere(ctx, p, nx, 560, k.toFixed(3), p.toLowerCase() === 'the' ? '242, 196, 104' : undefined) + 120;
    }
    ctx.fontVariantCaps = 'normal';
    ctx.font = 'italic 500 160px "EB Garamond"'; ctx.letterSpacing = '0px';
    const rtxt = rest.map((w) => clean(w.w).replace(/[;,.:]+$/, ''));
    let rx = 1920 - widthHere(ctx, rtxt) / 2;
    rest.forEach((w, i) => {
      const kk = ease.out3((t - w.start + 0.1) / 0.5);
      if (kk > 0) { paintHere(ctx, rtxt[i], rx, 1560, kk.toFixed(3)); }
      rx += paintHere(ctx, rtxt[i], 0, 0, 0);
    });
  },
});
