// 20 · "He waited seven more days, / then sent the dove out once more. / She did not return again."
// A still, wide frame over warming water. The dove flies away from us toward the gold line of the
// horizon until she is gone; the camera does not follow. The last line thins letter by letter into
// the sky.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01, gauge, paintHere, widthHere, voiceStyle } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { BIRD_GLSL } from '/song/lib/bird.js';
import { cameraPlane } from '/engine.js';

const [L1, L2, L3] = linesFrom('He waited seven more days', 'then sent the dove out once more', 'She did not return again');

export default (P) => {
  const go = L2.words.find((w) => w.w.startsWith('dove')).start - 0.4;
  const birdPos = (t) => {
    const u = Math.max(0, t - go);
    return [0.4 + 0.3 * u, 1.9 + 0.35 * u + 0.05 * Math.sin(u * 2.0), 2.0 + 3.2 * u + 0.9 * u * u];
  };
  return {
    name: 's20-departure', from: P.from, to: P.to,
    textSize: [3840, 2160],
    frag: SEA_GLSL + BIRD_GLSL + /* glsl */ `
uniform vec3 uBird; uniform float uYaw, uPh, uShow;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  if (uShow > 0.5) {
    vec3 lp, lrd;
    float tb = birdMarch(ro, rd, uBird, uYaw, 0.0, 1.0, uPh, 0.0, 1.0, lp, lrd);
    if (tb > 0.0 && tb < depth) {
      vec3 bc = birdShade(lp, lrd, uYaw, 0.0, uPh, 0.0, 1.0, SUN, uSunCol * 1.8, skyCol(vec3(0, 1, 0)) * 1.1, 0.0);
      c = mix(bc, skyCol(rd), 1.0 - exp(-tb * 0.01));
    }
  }
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  return c;
}`,
    uniforms: { ...SEA_UNIFORMS, uNight: 0.0, uWind: 0.08, uBird: [0, 2, 2], uYaw: 0, uPh: 0, uShow: 0, uSunDir: [0.5, 0.12, 1.0], uSunCol: [1.3, 1.05, 0.8], uLineGlow: 1.2 },
    camera(t) {
      const p = (t - P.from) / (P.to - P.from);
      return { pos: [0, 1.4, -2.0 + 0.4 * p], target: [0, 1.75, 40], fov: 42, roll: 0 };
    },
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const b = birdPos(t), b2 = birdPos(t + 0.05);
      u.uBird.value.set(...b);
      u.uYaw.value = -Math.atan2(b2[2] - b[2], b2[0] - b[0]);
      u.uPh.value = (t - P.from) * 2.2 * 6.2831;
      u.uShow.value = t > go - 0.8 ? 1 : 0;
      u.uWarm.value = warmth(t) + 0.1;
    },
    post(t) { return grade(t, { exposure: 1.0 }); },
    drawText(ctx, t) {
      gauge(ctx, t, 150, 180, { alpha: 0.7, size: 44 });
      const set = (L, y, px, italic, alpha, dissolve) => {
        ctx.font = `${italic ? 'italic ' : ''}500 ${px}px "EB Garamond"`; ctx.letterSpacing = '0px';
        const ws = L.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.]+$/, '') }));
        const sp = ctx.measureText(' ').width;
        const total = widthHere(ctx, ws.map((w) => w.s));
        let x = 1920 - total / 2;
        let ci = 0;
        for (const w of ws) {
          const k = ease.out3((t - w.start + 0.1) / 0.45);
          const vs = voiceStyle(w.s, px, italic);
          ctx.font = vs.font; ctx.fontVariantCaps = vs.caps; ctx.letterSpacing = vs.track;
          for (const ch of w.s) {
            const cw = ctx.measureText(ch).width;
            // dissolve: each letter lifts and thins, one after another, after the line
            const d = dissolve ? ease.inOut3((t - (L.end + 0.6 + ci * 0.06)) / 1.4) : 0;
            const a = k * alpha * (1 - d);
            if (a > 0.003) { ctx.fillStyle = `rgba(${vs.color}, ${a.toFixed(3)})`; ctx.fillText(ch, x, y - d * 160); }
            x += cw; ci++;
          }
          ctx.font = `${italic ? 'italic ' : ''}500 ${px}px "EB Garamond"`; ctx.fontVariantCaps = 'normal'; ctx.letterSpacing = '0px';
          x += sp * 1.05;
        }
      };
      const hand = (L, t0) => 1 - clamp01((t - t0) / 0.5);
      set(L1, 1580, 170, false, hand(L1, L2.start - 0.3), false);
      set(L2, 1580, 170, false, hand(L2, L3.start - 0.3) * (t > L2.start - 0.4 ? 1 : 0), false);
      if (t > L3.start - 0.4) set(L3, 1580, 210, true, 1, true);
    },
  };
};
