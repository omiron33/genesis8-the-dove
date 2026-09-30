// 19 · "Noe knew the waters had withdrawn."
// The olive leaf, very close, lit through from behind by the evening: its midrib and veins glow.
// The line is written along the midrib, word by word, as if the leaf itself carried the news.
import { keys, ease, grade, linesFrom, clean, clamp01, widthHere, paintHere } from '/song/lib/type.js';

const [L1] = linesFrom('Noe knew the waters had withdrawn');

export default (P) => ({
  name: 's19-leaf', from: P.from, to: P.to,
  textSize: [4096, 1024],
  frag: /* glsl */ `
uniform float uTurn;
// the leaf lies in a plane through the origin; u runs along the midrib (0..1), v across it
const vec3 LO = vec3(-0.06, 0.0, 0.0);
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  // background: the evening sky, far out of focus, with soft discs of light off the water
  vec2 sp = (fc - 0.5 * uRes) / uRes.y;
  vec3 bg = mix(vec3(1.05, 0.72, 0.46), vec3(0.36, 0.34, 0.4), sat(sp.y + 0.55));
  for (int i = 0; i < 14; i++) {
    vec2 c = vec2(hash11(float(i) * 3.1) - 0.5, hash11(float(i) * 7.7) * 0.35 - 0.45) * vec2(1.8, 1.0);
    c.x += 0.02 * sin(uTime * 0.3 + float(i));
    float r = 0.03 + 0.05 * hash11(float(i) + 1.3);
    float d = length(sp - c);
    bg += vec3(1.2, 0.8, 0.45) * smoothstep(r, r * 0.85, d) * 0.12 * (0.5 + hash11(float(i) + 9.0));
  }
  vec3 col = bg;
  // the leaf plane, turning slowly
  vec3 ax = normalize(vec3(cos(uTurn), 0.12, sin(uTurn) * 0.4));
  vec3 ay0 = normalize(vec3(-0.1, 1.0, 0.35));
  vec3 n = normalize(cross(ax, ay0));
  vec3 ay = normalize(cross(n, ax));
  float dn = dot(rd, n);
  float t = dot(LO - ro, n) / dn;
  if (t > 0.0) {
    vec3 p = ro + rd * t - LO;
    float u = dot(p, ax) / 0.12;              // leaf 12 cm long
    float v = dot(p, ay) / 0.12;
    float bend = 0.04 * sin(u * 3.0);
    float half_ = 0.15 * pow(max(sin(clamp(u, 0.0, 1.0) * 3.14159), 0.0), 0.75);
    float edge = half_ - abs(v - bend);
    float pw = fwidth(edge) + 1e-5;
    float inside = smoothstep(-pw, pw, edge) * step(0.0, u) * step(u, 1.0);
    if (inside > 0.0) {
      float vv = v - bend;
      // veins: the midrib and pairs of laterals sweeping toward the tip
      float mid = exp(-abs(vv) * 180.0);
      float lat = 0.0;
      for (int k = 1; k < 11; k++) {
        float u0 = float(k) * 0.085;
        float along = u - u0 - abs(vv) * 1.6;
        lat = max(lat, exp(-abs(along) * 160.0) * smoothstep(0.0, 0.01, abs(vv)) * step(u0, u));
      }
      float cells = voronoiEdge(vec2(u * 60.0, vv * 60.0)).x;
      vec3 leafC = mix(vec3(0.12, 0.17, 0.06), vec3(0.24, 0.3, 0.1), 0.5 + 0.5 * fbm(vec2(u, vv) * 18.0, 3));
      // lit through from behind: light glows in the thin tissue, the veins read brighter
      vec3 trans = leafC * vec3(2.3, 2.1, 1.3) * (0.85 + 0.15 * smoothstep(0.0, 0.05, cells));
      trans += vec3(0.8, 0.85, 0.45) * (mid * 0.7 + lat * 0.3);
      // the lyric along the midrib, pale as the veins
      vec2 tuv = vec2(u * 1.04 - 0.02, 0.5 + vv / 0.15 * 0.5 * 1.1);
      float tx = texture(uText, tuv).a;
      trans = mix(trans, vec3(0.03, 0.05, 0.01), tx * 0.95);
      trans *= 0.75 + 0.25 * smoothstep(0.0, 0.05, edge);        // the rim is thicker and darker
      trans *= 0.85 + 0.3 * (0.5 + 0.5 * vv / 0.15);             // light falling across the blade
      col = mix(col, trans, inside);
    }
  }
  return col;
}`,
  uniforms: { uTurn: 0 },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    return { pos: [0.0 + 0.01 * p, 0.01, 0.165 - 0.025 * p], target: [0.0, 0.0, 0.0], fov: 36, roll: -0.05 + 0.08 * p };
  },
  update(t, u) { u.uTurn.value = -0.12 + 0.18 * ease.inOut3((t - P.from) / (P.to - P.from)); },
  post(t) { return grade(t, { exposure: 0.95, saturation: 1.1, vignette: 0.65 }); },
  drawText(ctx, t) {
    ctx.font = 'italic 500 225px "EB Garamond"'; ctx.letterSpacing = '0px';
    const ws = L1.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.]+$/, '') }));
    const total = widthHere(ctx, ws.map((w) => w.s));
    let x = (4096 - total) / 2;
    for (const w of ws) {
      const k = ease.out3((t - w.start + 0.1) / 0.4);
      if (k > 0) paintHere(ctx, w.s, x, 590, k, '255, 255, 255');
      x += paintHere(ctx, w.s, 0, 0, 0);
    }
  },
});
