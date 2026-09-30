// 33 · "even from youth. / I will not strike down all life again / as I have done."
// Down from the edge of the world to its surface: green country at sunrise, and the gold line is now
// simply the horizon. The words are laid along it, and the line draws itself out under each one.
import { keys, ease, grade, linesFrom, clean, clamp01, SIGNAL, paintHere, widthHere } from '/song/lib/look.js';
import { GROUND_GLSL, GROUND_UNIFORMS } from '/song/lib/ground.js';
import { cameraPlane } from '/engine.js';

const [L1, L2, L3] = linesFrom('even from youth', 'I will not strike down', 'as I have done');

export default (P) => ({
  name: 's33-horizon', from: P.from, to: P.to,
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
  uniforms: { ...GROUND_UNIFORMS, uGreen: 0.85, uWet: 0.1, uGLine: 1.4, uSunDir: [-0.45, 0.02, 1.0], uSunCol: [9, 6.2, 3.4] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    return { pos: [0, 14 - 12.4 * ease.out3(Math.min(1, p * 1.4)), 0], target: [0, 1.6 + 2.0 * p - 6.0 * (1 - Math.min(1, p * 1.4)), 60], fov: 40, roll: 0 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) { u.uSunDir.value.set(-0.45, 0.02 + 0.06 * ease.inOut3((t - P.from) / (P.to - P.from)), 1.0); },
  post(t) { return grade(t, { exposure: 1.0, saturation: 1.1, bloom: 0.1 }); },
  drawText(ctx, t) {
    // lines sit just above the horizon (the frame's centre line once the camera is down)
    const lines = [[L1, 'italic 500'], [L2, '500'], [L3, 'italic 500']];
    lines.forEach(([L, style], i) => {
      const next = lines[i + 1]?.[0];
      const out = next ? 1 - clamp01((t - (next.start - 0.4)) / 0.4) : 1 - clamp01((t - (P.to - 0.6)) / 0.6);
      if (out <= 0 || t < L.start - 0.4) return;
      ctx.font = `${style} 170px "EB Garamond"`; ctx.fontVariantCaps = 'all-small-caps'; ctx.letterSpacing = '22px';
      const ws = L.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.:”]+$/, '') }));
      const tot = widthHere(ctx, ws.map((w) => w.s));
      let x = Math.max(160, 1500 - tot);
      for (const w of ws) {
        const k = ease.out3((t - w.start + 0.1) / 0.6);
        const wd = ctx.measureText(w.s).width;
        if (k > 0) {
          paintHere(ctx, w.s, x, 940, (k * out).toFixed(3));
          ctx.fillStyle = `rgba(${SIGNAL}, ${(0.9 * k * out).toFixed(3)})`; ctx.fillRect(x, 980, wd * k, 5);
        }
        x += ctx.measureText(w.s + '  ').width;
      }
      ctx.fontVariantCaps = 'normal';
    });
  },
});
