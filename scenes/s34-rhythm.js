// 34 · (instrumental) "All earth's days shall keep their rhythm:"
// A single olive tree on a green hill, still, while days pass over it on the beat: the sun wheels
// across and down, night falls with its stars, dawn comes again. The line is set to the same pulse.
import { keys, ease, grade, linesFrom, clean, clamp01, annotate } from '/song/lib/look.js';
import { cameraPlane } from '/engine.js';

const audio = await fetch('/song/data/audio.json').then((r) => r.json());
const [L1] = linesFrom('All earth');

export default (P) => {
  const beats = audio.beats.filter((b) => b >= P.from - 0.5 && b <= P.to + 0.5);
  const period = beats.length > 8 ? (beats[beats.length - 1] - beats[0]) / (beats.length - 1) * 8 : 3.8;   // one day per two bars
  const b0 = beats[0] ?? P.from;
  return {
    name: 's34-rhythm', from: P.from, to: P.to,
    textSize: [3840, 2160],
    frag: /* glsl */ `
uniform float uDay;      // 0..1 phase of the day: 0 dawn, 0.25 noon, 0.5 dusk, 0.75 midnight
float hill(float x) { return -0.9 + 0.55 * exp(-x * x * 0.04) + 0.08 * fbm(vec2(x * 0.3, 1.0), 4); }
float seg(vec2 p, vec2 a, vec2 b, float r0, float r1) {
  vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba));
  return length(pa - ba * h) - mix(r0, r1, h);
}
// an old olive tree: a gnarled trunk that splits and splits again, twigs ending in silvery clumps
float tree(vec2 p) {
  p -= vec2(0.4, hill(0.4) + 0.04);
  float d = 1e3, leaves = 1e3;
  for (int path = 0; path < 32; path++) {
    vec2 a = vec2(0.0), dir = normalize(vec2(-0.12, 1.0));
    float len = 0.42, r = 0.075;
    int bits = path;
    for (int lvl = 0; lvl < 6; lvl++) {
      float side = (bits & 1) == 1 ? 1.0 : -1.0;
      bits >>= 1;
      float h = hash11(float(path >> (5 - min(lvl, 5))) * 7.3 + float(lvl) * 13.1);
      if (lvl > 0) dir = normalize(rot(side * (0.35 + 0.35 * h)) * dir + vec2(0.0, 0.15));
      vec2 b = a + dir * len * (0.8 + 0.4 * h);
      // a slight crook in every limb
      vec2 m = mix(a, b, 0.5) + vec2(-dir.y, dir.x) * len * 0.12 * (h - 0.5);
      d = min(d, min(seg(p, a, m, r, r * 0.85), seg(p, m, b, r * 0.85, r * 0.7)));
      if (lvl >= 3) leaves = min(leaves, length((p - b) * vec2(1.0, 1.4)) - 0.075);
      a = b; len *= 0.72; r *= 0.66;
    }
    leaves = min(leaves, length((p - a) * vec2(1.0, 1.35)) - 0.1);
  }
  leaves += (fbm(p * 34.0, 5) - 0.5) * 0.11;
  return min(d, leaves);
}
vec3 shade(vec2 fc) {
  vec2 uv = (fc + uJitter - 0.5 * uRes) / uRes.y * 2.4 + vec2(0.2, 0.15);
  float a = uDay * 6.28318;
  vec2 sun = vec2(-cos(a) * 1.1, sin(a) * 0.75 - 0.05);
  float el = sin(a);                                           // sun height
  float dayL = smoothstep(-0.15, 0.25, el);
  float dusk = exp(-el * el * 30.0);
  vec3 skyTop = mix(vec3(0.012, 0.02, 0.05), vec3(0.2, 0.42, 0.78), dayL);
  vec3 skyHor = mix(vec3(0.05, 0.06, 0.11), vec3(0.75, 0.82, 0.9), dayL);
  skyHor = mix(skyHor, vec3(1.2, 0.55, 0.25), dusk * 0.8);
  vec3 c = mix(skyHor, skyTop, sat(uv.y * 1.2 + 0.4));
  // stars at night, wheeling slowly
  vec2 su = rot(uDay * 1.2) * uv * 60.0;
  float s = hash12(floor(su));
  c += vec3(0.9) * step(0.985, s) * smoothstep(0.3, 0.0, length(fract(su) - 0.5)) * (1.0 - dayL) * 1.2;
  // sun and moon
  float ds = length(uv - sun);
  c += vec3(1.6, 1.1, 0.6) * (smoothstep(0.045, 0.035, ds) * 6.0 + exp(-ds * 7.0) * 0.6) * step(-0.2, el);
  vec2 moon = vec2(cos(a) * 1.1, -sin(a) * 0.75 - 0.05);
  float dm = length(uv - moon);
  c += vec3(0.8, 0.85, 0.95) * (smoothstep(0.03, 0.025, dm) * 2.0 + exp(-dm * 12.0) * 0.1) * (1.0 - dayL);
  // the hill and the tree, in silhouette with the sky's rim light
  float h = hill(uv.x) + 0.012 * pow(fbm(vec2(uv.x * 160.0, 0.0), 3), 2.0);
  if (uv.y < h) {
    vec3 g = mix(vec3(0.01, 0.012, 0.01), vec3(0.12, 0.2, 0.06), dayL);
    c = g * (0.8 + 0.2 * fbm(uv * 40.0, 3));
  }
  float td = tree(uv);
  float pw = 1.5 * 2.4 / uRes.y;
  float cov = smoothstep(pw, -pw, td);
  vec3 tc = mix(vec3(0.005), vec3(0.06, 0.08, 0.04), dayL) + vec3(1.0, 0.6, 0.3) * dusk * smoothstep(-0.01, 0.0, td) * 0.0;
  c = mix(c, tc, cov);
  // the gold line: the horizon's rim of light at dawn and dusk
  c += vec3(1.0, 0.62, 0.2) * exp(-abs(uv.y - h) * uRes.y * 0.15) * (0.3 + 1.5 * dusk) * step(h, uv.y + 0.01);
  vec2 tuv = vec2(fc.x / uRes.x, fc.y / uRes.y);
  vec4 tx = texture(uText, tuv);
  c = c * (1.0 - tx.a) + tx.rgb * 1.1;
  return c;
}`,
    uniforms: { uDay: 0 },
    camera() { return { pos: [0, 0, 0], target: [0, 0, 1], fov: 40 }; },
    update(t, u) { u.uDay.value = ((t - b0) / period + 0.02); },
    post(t) { return grade(t, { exposure: 1.0, bloom: 0.12 }); },
    drawText(ctx, t) {
      ctx.font = '500 200px "EB Garamond"'; ctx.letterSpacing = '-1px';
      const ws = L1.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.:]+$/, '') }));
      const tot = ctx.measureText(ws.map((w) => w.s).join(' ')).width;
      let x = 1920 - tot / 2;
      for (const w of ws) {
        const k = ease.out3((t - w.start + 0.1) / 0.4);
        if (k > 0) { ctx.fillStyle = `rgba(255, 246, 232, ${k.toFixed(3)})`; ctx.fillText(w.s, x, 1880); }
        x += ctx.measureText(w.s + ' ').width;
      }
      // the days counted in the gauge voice as they pass
      const d = Math.max(0, Math.floor((t - b0) / period));
      annotate(ctx, `DAY ${370 + d}   ·   AND DAY   ·   AND NIGHT`, 1920, 2040, { size: 40, alpha: 0.65, align: 'center' });
    },
  };
};
