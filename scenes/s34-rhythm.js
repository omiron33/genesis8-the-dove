// 34 · (instrumental) "All earth's days shall keep their rhythm:"
// A single olive tree on a green hill, still, while days pass over it on the beat: the sun wheels
// across and down, night falls with its stars, dawn comes again. The line is set to the same pulse.
import { keys, ease, grade, linesFrom, clean, clamp01 } from '/song/lib/look.js';
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
  float h = hill(uv.x);
  // grass blades standing along the ridge: thin tapering spikes, swaying a little
  float bx = uv.x * 260.0;
  float bid = floor(bx), bf = fract(bx) - 0.5;
  float bh = (0.006 + 0.02 * pow(hash11(bid), 2.0)) * (0.6 + 0.4 * fbm(vec2(uv.x * 3.0, 2.0), 2));
  float lean = (hash11(bid + 7.0) - 0.5) * 0.6 + 0.15 * sin(uTime * 1.3 + uv.x * 4.0);
  float by = (uv.y - h) / bh;
  float blade = (by > 0.0 && by < 1.0) ? step(abs(bf - lean * by), 0.18 * (1.0 - by)) : 0.0;
  float hh = h + 0.004 * fbm(vec2(uv.x * 90.0, 0.0), 3);
  if (uv.y < hh || blade > 0.0) {
    float depthK = sat((hh - uv.y) / 0.5);                    // lower on screen = nearer
    vec2 gp = vec2(uv.x * (6.0 + 30.0 * depthK), uv.y * 40.0);
    // clumps, blade streaks and patches of light through the meadow
    float clump = fbm(gp * 0.7, 4);
    float streak = vnoise(vec2(uv.x * (400.0 + 900.0 * depthK), uv.y * 30.0));
    vec3 gDay = mix(vec3(0.07, 0.13, 0.03), vec3(0.28, 0.36, 0.08), clump);
    gDay = mix(gDay, vec3(0.42, 0.44, 0.16), smoothstep(0.65, 0.9, fbm(gp * 0.25 + 3.0, 3)) * 0.5);   // dry seed heads
    gDay *= 0.7 + 0.45 * streak;
    gDay *= 0.75 + 0.35 * smoothstep(0.0, 0.2, hh - uv.y + 0.05 * clump);                          // shade below the crest
    // warm rim where the low sun grazes the crest at dawn and dusk
    gDay += vec3(1.0, 0.55, 0.2) * dusk * exp(-(hh - uv.y) * 60.0) * 0.5;
    vec3 gNight = vec3(0.008, 0.012, 0.02) * (0.7 + 0.5 * streak);
    c = mix(gNight, gDay, dayL);
    c = mix(c, skyHor * 0.6, (1.0 - depthK) * 0.15 * dayL);                                           // a little haze on the far slope
  }
  float td = tree(uv);
  float pw = 1.5 * 2.4 / uRes.y;
  float cov = smoothstep(pw, -pw, td);
  vec3 tc = mix(vec3(0.005), vec3(0.06, 0.08, 0.04), dayL) + vec3(1.0, 0.6, 0.3) * dusk * smoothstep(-0.01, 0.0, td) * 0.0;
  c = mix(c, tc, cov);
  // the gold line: the horizon's rim of light at dawn and dusk
  c += vec3(1.0, 0.62, 0.2) * exp(-abs(uv.y - h) * uRes.y * 0.15) * (0.3 + 1.5 * dusk) * step(h, uv.y + 0.01);
  return c;
}`,
    uniforms: { uDay: 0 },
    camera() { return { pos: [0, 0, 0], target: [0, 0, 1], fov: 40 }; },
    update(t, u) { u.uDay.value = ((t - b0) / period + 0.02); },
    post(t) { return grade(t, { exposure: 1.0, bloom: 0.12 }); },
  };
};
