// The words of s13-raven, drawn as their own layer over the picture.
// 13 · "He sent a raven out; / it flew until the earth was dry, / and did not come back."
// From just off the ark's side, a black obsidian raven beats away low over the grey water toward the
// horizon. Each word is left hanging where the bird was when it was sung, a wake of words that thins
// and fades as the raven becomes a speck and is gone.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01, project, paintHere } from '/song/lib/type.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { BIRD_GLSL } from '/song/lib/bird.js';
import { cameraPlane } from '/engine.js';

const lines = linesFrom('He sent a raven out', 'it flew until the earth was dry', 'and did not come back');
const words = lines.flatMap((l, li) => l.words.map((w) => ({ ...w, li })));

const __scene = (P) => {
  const turn = lines[2].start - 0.3;
  const birdPos = (t) => {
    const u = t - P.from;
    const x = -3.2 + 3.1 * u;
    const away = Math.max(0, t - turn);
    return [x + 2.5 * away, 1.9 + 0.12 * Math.sin(u * 1.9) + 0.4 * away, 1.0 - 9.0 * away * (1 + 0.5 * away)];
  };
  const camera = (t) => {
    const u = t - P.from;
    return { pos: [-2.0 + 1.9 * u, 1.55, 7.5], target: [-2.0 + 1.9 * u + 1.2, 1.9, -10], fov: 40, roll: 0.01 * Math.sin(u) };
  };
  return {
    name: 's13-raven', from: P.from, to: P.to,
    textSize: [3840, 2160],
    frag: SEA_GLSL + BIRD_GLSL + /* glsl */ `
uniform vec3 uBird;
uniform float uYaw, uPh;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  vec3 lp, lrd;
  float tb = birdMarch(ro, rd, uBird, uYaw, 0.0, 1.35, uPh, 0.0, 1.0, lp, lrd);
  if (tb > 0.0 && tb < depth) {
    vec3 bc = birdShade(lp, lrd, uYaw, 0.0, uPh, 0.0, 1.0, SUN, uSunCol * 1.4, skyCol(vec3(0, 1, 0)), 1.0);
    float fog = 1.0 - exp(-tb * 0.004);
    c = mix(bc, skyCol(rd), fog);
  }
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  return c;
}`,
    uniforms: { ...SEA_UNIFORMS, uNight: 0.3, uWind: 0.15, uBird: [0, 2, 3], uYaw: -1.35, uPh: 0, uSunDir: [0.3, 0.2, -1.0], uSunCol: [0.8, 0.83, 0.88] },
    camera,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const b = birdPos(t), b2 = birdPos(t + 0.05);
      u.uBird.value.set(...b);
      u.uYaw.value = -Math.atan2(b2[2] - b[2], b2[0] - b[0]);
      u.uPh.value = (t - P.from) * 2.6 * 6.2831;
      u.uWarm.value = warmth(t);
    },
    post(t) { return grade(t, { exposure: 1.0 }); },
    drawText(ctx, t) {
      const cam = camera(t);
      ctx.letterSpacing = '-1px';
      const lineEnd = [-1e9, -1e9, -1e9];
      for (const w of words) {
        const k = ease.out3((t - w.start + 0.05) / 0.35);
        if (k <= 0) continue;
        // where the bird was when the word was sung, seen from where the camera is now
        const b = birdPos(w.start);
        const s = project(cam, [b[0] - 0.1, b[1] + 0.55 - 0.42 * w.li, b[2]]);
        if (s.z < 0.5) continue;
        const size = Math.max(70, Math.min(300, 1700 / s.z));
        const fade = w.li === 2 ? 1 - clamp01((t - (w.end + 0.4)) / 1.4) : 1 - clamp01((t - (lines[w.li].end + 1.6)) / 1.2);
        ctx.font = `${w.li === 1 ? 'italic ' : ''}500 ${size.toFixed(0)}px "EB Garamond"`;
        // never let a word run into the one before it on its line
        const x = Math.max(s.x, lineEnd[w.li] + size * 0.35);
        lineEnd[w.li] = x + paintHere(ctx, clean(w.w).replace(/[;, .]+$/, ''), x, s.y, (k * fade).toFixed(3)) - size * 0.3;
      }
    },
  };
};

export default (P) => { const s = __scene(P); return { textSize: s.textSize, textPlane: s.textPlane, drawText: s.drawText, shade: 1.0 }; };
