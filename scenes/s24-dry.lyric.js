// The words of s24-dry, drawn as their own layer over the picture.
// 24 · "and saw the ground was dry. / In month two, on day twenty-seven,"
// From the ark's roof the camera tilts from the horizon down onto the ground: cracked silt, drying in
// the sun. The date is set as a ledger entry in the gauge voice, ruled with the gold line.
import { keys, ease, grade, linesFrom, clean, clamp01, annotate, SIGNAL, paintHere } from '/song/lib/type.js';
import { GROUND_GLSL, GROUND_UNIFORMS } from '/song/lib/ground.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('and saw the ground was dry', 'In month two');

const __scene = (P) => ({
  name: 's24-dry', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: GROUND_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = groundScene(ro, rd, depth);
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  return c;
}`,
  uniforms: { ...GROUND_UNIFORMS, uWet: 0.35, uGLine: 0.7 },
  camera(t) {
    const tilt = ease.inOut3((t - (L1.start - 0.3)) / 3.2);
    const p = (t - P.from) / (P.to - P.from);
    return { pos: [0, 14 - 2 * p, -2 + 3 * p], target: [0, 14 - 16 * tilt - 2 * p, 30 - 12 * tilt], fov: 44, roll: 0 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) { u.uWet.value = keys(t, [[P.from, 0.4], [P.to, 0.05]]); u.uGLine.value = 0.7 * (1 - ease.inOut3((t - L1.end) / 2)); },
  post(t) { return grade(t, { exposure: 1.0 }); },
  drawText(ctx, t) {
    const row = (L, x, y, px, italic) => {
      ctx.font = `${italic ? 'italic ' : ''}500 ${px}px "EB Garamond"`; ctx.letterSpacing = '-1px';
      for (const w of L.words) {
        const s = clean(w.w).replace(/[;,.]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.4);
        if (k > 0) { paintHere(ctx, s, x, y + (1 - k) * 30, k.toFixed(3)); }
        x += paintHere(ctx, s, 0, 0, 0);
      }
    };
    row(L1, 220, 600, 230, false);
    // the ledger entry
    const k = ease.out3((t - L2.start + 0.1) / 0.5);
    if (k > 0) {
      ctx.fillStyle = `rgba(${SIGNAL}, ${(0.9 * k).toFixed(3)})`; ctx.fillRect(220, 1560, 1400 * k, 5);
      row(L2, 220, 1500, 160, true);
      annotate(ctx, 'MONTH 2   ·   DAY 27   ·   THE GROUND IS DRY', 220, 1660, { size: 48, alpha: 0.85 * k });
    }
  },
});

export default (P) => { const s = __scene(P); return { textSize: s.textSize, textPlane: s.textPlane, drawText: s.drawText, shade: 1.0 }; };
