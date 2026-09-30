// 26 · "Come out of the ark, / you, your wife, your sons, / and your sons' wives with you."
// The great door lowers into a ramp and morning pours in along the floor. The words stand in the
// doorway, cut from the dark against the green land outside, as the camera walks toward the light.
import { keys, ease, grade, linesFrom, clean, clamp01, paintHere, widthHere } from '/song/lib/look.js';
import { HOLD_GLSL, HOLD_UNIFORMS } from '/song/lib/hold.js';

const [L1, L2, L3] = linesFrom('Come out of the ark', 'you, your wife, your sons', 'and your sons');

export default (P) => ({
  name: 's26-door', from: P.from, to: P.to,
  textSize: [4096, 1536],
  frag: HOLD_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 5.13) * 77.0);
  float depth;
  vec3 c = holdScene(ro, rd, jit, depth);
  // the words stand just inside the doorway: dark letters against the morning
  vec3 tp = planeUV(ro, rd, vec3(0.0, 2.35, ZD - 1.4), vec3(-1, 0, 0), vec3(0, 1, 0), vec2(2.4, 0.9));
  if (tp.z > 0.0 && tp.z < depth + 0.5 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    vec4 tx = texture(uText, tp.xy);
    c = mix(c, vec3(0.012, 0.01, 0.009), tx.a);
  }
  return c;
}`,
  uniforms: { ...HOLD_UNIFORMS, uLand: 1, uSeams: 1, uFill: 0.12, uSunDir: [0.18, 0.42, 1.0], uSunCol: [9.0, 7.6, 5.8] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    return { pos: [0.7 - 0.7 * p, 1.6 + 0.1 * p, 15.0 + 15.5 * p], target: [0.1 * (1 - p), 2.2, 40], fov: keys(t, [[P.from, 44], [P.to, 38]]), roll: 0.02 * (1 - p) };
  },
  update(t, u) { u.uOpen.value = keys(t, [[P.from, 0.12], [L1.start, 0.14], [L1.end + 0.4, 1.0, ease.inOut3]]); },
  post(t) { return grade(t, { exposure: keys(t, [[P.from, 2.4], [L1.start + 0.3, 2.0], [L1.end + 0.5, 1.0, ease.inOut3]]), bloom: 0.12, saturation: 1.08 }); },
  drawText(ctx, t) {
    const rows = [[L1, 520, '600 330px', 0], [L2, 900, 'italic 500 210px', 0], [L3, 1230, 'italic 500 190px', 0]];
    for (const [L, y, font] of rows) {
      ctx.font = `${font} "EB Garamond"`; ctx.letterSpacing = '-2px';
      const ws = L.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.:]+$/, '') }));
      const total = widthHere(ctx, ws.map((w) => w.s));
      let x = (4096 - total) / 2;
      for (const w of ws) {
        const k = ease.out3((t - w.start + 0.1) / 0.4);
        if (k > 0) { paintHere(ctx, w.s, x, y + (1 - k) * 26, k.toFixed(3)); }
        x += paintHere(ctx, w.s, 0, 0, 0);
      }
    }
  },
});
