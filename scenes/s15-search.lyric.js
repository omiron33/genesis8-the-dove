// The words of s15-search, drawn as their own layer over the picture.
// 15 · "The dove found no place to rest; / water still covered all the earth."
// Straight down from high above: nothing but water to every edge. A tiny white dove circles over it,
// her shadow on the swell, and the words drift apart across the water with nowhere to settle.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01, project, gauge, paintHere, widthHere } from '/song/lib/type.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { BIRD_GLSL } from '/song/lib/bird.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('The dove found no place', 'water still covered');

const __scene = (P) => {
  const H = 11;
  const birdPos = (t) => {
    const a = (t - P.from) * 0.55;
    return [Math.cos(a) * 2.2, 5.0, Math.sin(a) * 2.2];
  };
  const camera = (t) => {
    const p = (t - P.from) / (P.to - P.from);
    const h = H + 7 * p;
    return { pos: [0.001, h, 0], target: [0, 0, 0.0001], fov: 44, roll: 0.25 * p };
  };
  return {
    name: 's15-search', from: P.from, to: P.to,
    textSize: [3840, 2160],
    frag: SEA_GLSL + BIRD_GLSL + /* glsl */ `
uniform vec3 uBird; uniform float uYaw, uPh, uBank;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  // the dove's shadow on the water
  if (depth < 1e3) {
    vec3 p = ro + rd * depth;
    vec3 lp2, lrd2;
    float sh = birdMarch(p + vec3(0, 0.01, 0), SUN, uBird, uYaw, uBank, 1.0, uPh, 0.0, 1.0, lp2, lrd2);
    if (sh > 0.0) c *= 0.55;
  }
  vec3 lp, lrd;
  float tb = birdMarch(ro, rd, uBird, uYaw, uBank, 1.0, uPh, 0.0, 1.0, lp, lrd);
  if (tb > 0.0 && tb < depth) c = birdShade(lp, lrd, uYaw, uBank, uPh, 0.0, 1.0, SUN, uSunCol * 1.5, skyCol(vec3(0, 1, 0)) * 1.1, 0.0);
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  return c;
}`,
    uniforms: { ...SEA_UNIFORMS, uNight: 0.15, uWind: 0.25, uBird: [0, 4, 3], uYaw: 0, uPh: 0, uBank: 0, uSunDir: [0.35, 1.0, 0.25], uSunCol: [1.1, 1.05, 1.0], uLineGlow: 0 },
    camera,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const b = birdPos(t), b2 = birdPos(t + 0.05);
      u.uBird.value.set(...b);
      u.uYaw.value = -Math.atan2(b2[2] - b[2], b2[0] - b[0]);
      u.uBank.value = -0.45;
      u.uPh.value = (t - P.from) * 2.2 * 6.2831;
      u.uWarm.value = warmth(t);
    },
    post(t) { return grade(t, { exposure: 1.05 }); },
    drawText(ctx, t) {
      gauge(ctx, t, 150, 180, { alpha: 0.7, size: 44 });
      // the phrase is set in order, then its words slowly drift apart: nowhere to settle
      const rows = [[L1, 860, 190, false], [L2, 1300, 170, true]];
      for (const [L, y, px, it] of rows) {
        ctx.font = `${it ? 'italic ' : ''}500 ${px}px "EB Garamond"`; ctx.letterSpacing = '-1px';
        const ws = L.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.]+$/, '') }));
        const sp = ctx.measureText(' ').width;
        const vw = (x) => paintHere(ctx, x, 0, 0, 0) - sp * 1.05;
      const total = widthHere(ctx, ws.map((w) => w.s));
        let x = 1920 - total / 2;
        ws.forEach((w, i) => {
          const k = ease.out3((t - w.start + 0.1) / 0.4);
          const wd = vw(w.s);
          const cx = x + wd / 2 - 1920;
          const spread = 1 + 0.35 * ease.inOut3((t - L.end) / 3.0);
          const dy = 60 * Math.sin(i * 2.1 + 1.0) * ease.inOut3((t - L.end) / 3.0);
          if (k > 0) {
            paintHere(ctx, w.s, 1920 + cx * spread - wd / 2, y + dy, (k * (1 - clamp01((t - (P.to - 0.5)) / 0.5))).toFixed(3));
          }
          x += wd + sp;
        });
      }
    },
  };
};

export default (P) => { const s = __scene(P); return { textSize: s.textSize, textPlane: s.textPlane, drawText: s.drawText, shade: 1.0 }; };
