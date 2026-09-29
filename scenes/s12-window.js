// 12 · "After forty days, Noe opened / the window he had made in the ark."
// Inside the dark hold. On "opened" the hatch swings up and a bar of daylight crosses the air to the
// floor. The second line is carried by that light: the window projects it onto the boards.
import { keys, ease, grade, warmth, linesFrom, clean, gauge, clamp01 } from '/song/lib/look.js';
import { HOLD_GLSL, HOLD_UNIFORMS } from '/song/lib/hold.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('After forty days', 'the window he had made');
const opened = L1.words.find((w) => w.w.startsWith('opened'));

export default (P) => ({
  name: 's12-window', from: P.from, to: P.to,
  textSize: [3840, 4320],
  frag: HOLD_GLSL + /* glsl */ `
uniform vec3 uBeamC, uBeamX;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 5.13) * 77.0);
  float depth;
  vec3 c = holdScene(ro, rd, jit, depth);
  // words standing in the air across the beam: they exist only where the window's light reaches them
  vec3 bp = planeUV(ro, rd, uBeamC, uBeamX, vec3(0, 1, 0), vec2(1.5, 0.75));
  if (bp.z > 0.0 && bp.z < depth && all(greaterThan(bp.xy, vec2(0))) && all(lessThan(bp.xy, vec2(1)))) {
    vec3 q = ro + rd * bp.z;
    float lit = holdShadow(q, SUN) * uWin;
    float a = texture(uText, vec2(bp.x, bp.y * 0.5)).a;
    c += a * (lit * vec3(1.35, 1.25, 1.1) * 1.6 + 0.03);
  }
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    vec4 tx = texture(uText, vec2(tp.x, 0.5 + tp.y * 0.5));   // upper half of the canvas
    c = c * (1.0 - tx.a) + tx.rgb * 1.2;
  }
  return c;
}`,
  uniforms: { ...HOLD_UNIFORMS, uGobo: 0, uSeams: 0.4, uSunDir: [0.85, 0.42, 0.22], uSunCol: [9, 8.8, 8.6], uFill: 0.3, uBeamC: [2.35, 1.85, 21.5], uBeamX: [-0.87, 0, 0.48] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    return { pos: [-1.9 + 0.9 * p, 2.2 - 0.2 * p, 15.6 + 1.5 * p], target: [2.0, 1.9, 22.0], fov: 48, roll: 0.02 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.5, aspect: 16 / 9 }); },
  update(t, u) {
    u.uWin.value = ease.inOut3((t - (opened.start - 0.1)) / 1.1);
  },
  post(t) { return grade(t, { exposure: keys(t, [[P.from, 2.2], [opened.start, 2.0], [opened.start + 1.2, 1.0]]), bloom: 0.1 }); },
  drawText(ctx, t) {
    // upper half (rows 0..2160): line 1 across the top of the frame
    const W = 3840;
    ctx.font = '500 170px "EB Garamond"'; ctx.letterSpacing = '-1px';
    let x = 200;
    const out = 1 - clamp01((t - (L2.start + 0.5)) / 0.8);
    for (const w of L1.words) {
      const s = clean(w.w).replace(/[;,.]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.4);
      if (k > 0) { ctx.fillStyle = `rgba(246, 240, 230, ${(k * out).toFixed(3)})`; ctx.fillText(s, x, 420); }
      x += ctx.measureText(s + ' ').width;
    }
    gauge(ctx, t, 200, 180, { alpha: 0.7 * out, size: 40 });
    // lower half (rows 2160..4320): what the window carries, white on transparent = light
    ctx.save(); ctx.translate(0, 2160);
    ctx.font = 'italic 500 360px "EB Garamond"'; ctx.letterSpacing = '-3px';
    const rows = [L2.words.slice(0, 3), L2.words.slice(3)];
    rows.forEach((ws, ri) => {
      const txt = ws.map((w) => clean(w.w).replace(/[;,.]+$/, ''));
      const total = ctx.measureText(txt.join(' ')).width;
      let xx = (W - total) / 2;
      ws.forEach((w, i) => {
        const k = ease.out3((t - w.start + 0.1) / 0.35);
        if (k > 0) { ctx.fillStyle = `rgba(255,255,255,${k.toFixed(3)})`; ctx.fillText(txt[i], xx, 950 + ri * 460); }
        xx += ctx.measureText(txt[i] + ' ').width;
      });
    });
    ctx.restore();
  },
});
