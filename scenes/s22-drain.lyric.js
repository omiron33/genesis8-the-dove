// The words of s22-drain, drawn as their own layer over the picture.
// 22 · "the waters had ebbed from earth."  (the loudest build of the song)
// A fast, low flight over the land as it surfaces: the flood drains away in every valley, the gold
// tide lines racing down the slopes after it, the first green coming up behind. "earth" arrives
// huge and holds while the sun breaks through.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01, gauge, paintHere } from '/song/lib/type.js';
import { MOUNTAIN_GLSL, MOUNTAIN_UNIFORMS } from '/song/lib/mountain.js';
import { HORIZON_GLSL } from '/song/scenes/s10-deck.js';
import { cameraPlane } from '/engine.js';

const [L1] = linesFrom('the waters had ebbed from earth');
const earth = L1.words[L1.words.length - 1];

const __scene = (P) => ({
  name: 's22-drain', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: MOUNTAIN_GLSL + HORIZON_GLSL + /* glsl */ `
uniform float uLineGlow;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = mountainScene(ro, rd, jit, depth);
  if (depth > 70.0) c += horizonLine(rd, uLineGlow);
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  return c;
}`,
  uniforms: { ...MOUNTAIN_UNIFORMS, uMist: -1, uWater: 0.2, uTide: 1.4, uRings: 0.03, uArkOn: 1, uLineGlow: 0.6, uSunDir: [-0.95, 0.28, 0.55], uSunCol: [6.5, 5.6, 4.6] },
  camera(t) {
    const p = (t - P.from) / (P.to - P.from);
    const e = ease.inOut3(p);
    return { pos: [5.2 - 2.4 * e, 0.75 - 0.2 * e + 0.08 * Math.sin(p * 5), -3.0 + 9.0 * e], target: [-0.6, 0.5 + 0.2 * e, 15.0], fov: keys(t, [[P.from, 44], [P.to, 36]]), roll: 0.06 * Math.sin(p * 3.1) - 0.03 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.3, aspect: 16 / 9 }); },
  update(t, u) {
    u.uWater.value = keys(t, [[P.from, 0.25], [P.to, -0.3]], ease.inOut3);
    u.uGreen.value = keys(t, [[P.from, 0.0], [P.to, 0.7]]);
    u.uWarm.value = warmth(t) + 0.1;
    const sun = ease.inOut3((t - earth.start) / 2.5);
    u.uSunCol.value.set(5.5 + 3 * sun, 4.8 + 2.4 * sun, 3.9 + 1.2 * sun);
  },
  post(t) { return grade(t, { exposure: 1.0, bloom: 0.1 }); },
  drawText(ctx, t) {
    gauge(ctx, t, 150, 180, { alpha: 0.75, size: 44 });
    const pre = L1.words.slice(0, -1);
    ctx.font = '500 200px "EB Garamond"'; ctx.letterSpacing = '-1px';
    let x = 200;
    for (const w of pre) {
      const s = clean(w.w); const k = ease.out3((t - w.start + 0.1) / 0.4);
      if (k > 0) { paintHere(ctx, s, x, 1980, k.toFixed(3)); }
      x += paintHere(ctx, s, 0, 0, 0);
    }
    // "earth": set very large, low, widening its tracking through the held note
    const k = ease.out3((t - earth.start + 0.1) / 0.6);
    if (k > 0) {
      const track = 10 + 50 * ease.inOut3((t - earth.start) / (earth.end - earth.start));
      ctx.font = 'italic 500 620px "EB Garamond"'; ctx.letterSpacing = `${track}px`;
      const s = clean(earth.w).replace(/[.]+$/, '');
      const w = ctx.measureText(s).width;
      paintHere(ctx, s, 1920 - w / 2, 1380 + (1 - k) * 60, k.toFixed(3));
    }
  },
});

export default (P) => { const s = __scene(P); return { textSize: s.textSize, textPlane: s.textPlane, drawText: s.drawText, shade: 1.0 }; };
