// 03 · "every herd and creeping thing / that shared the ark with him."
// Tracking along the ark's timber flank above the swell. The words are carved into the planks as
// they are sung, and take the grey light in their cut edges.
import { keys, ease, grade, warmth, linesFrom, clean } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';

const [L1, L2] = linesFrom('every herd and creeping thing', 'that shared the ark with him');
// the text canvas covers the hull from x = -4 to 16 m, y = 0.6 to 5.6 m
const X0 = -4, X1 = 20, Y0 = 0.6, Y1 = 6.6;

export default (P) => ({
  name: 's03-hull', from: P.from, to: P.to,
  textSize: [8192, 2048],
  frag: SEA_GLSL + /* glsl */ `
const float HZ = 0.0;           // hull face plane (z), bulging slightly toward the camera at mid height
float hullZ(float y) { return HZ + 0.25 * sin(clamp(y / 8.0, 0.0, 1.0) * 3.14159) ; }
vec3 textUV(vec3 p) { return vec3((p.x - (${X0.toFixed(1)})) / ${(X1 - X0).toFixed(1)}, (p.y - ${Y0.toFixed(1)}) / ${(Y1 - Y0).toFixed(1)}, 0.0); }

float plankGrain(vec2 q, float board) {
  return fbm(vec2(q.x * 0.7 + board * 7.1, q.y * 30.0 + board), 5);
}

vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  // hull: march against z = hullZ(y) (a gentle curve), up to its gunwale at y = 8.5
  float t = (HZ - ro.z) / rd.z;
  for (int i = 0; i < 4; i++) { vec3 q = ro + rd * t; t = (hullZ(q.y) - ro.z) / rd.z; }
  vec3 p = ro + rd * t;
  if (t > 0.0 && t < depth && p.y < 8.5 && p.y > -2.0) {
    // clinker planks: each strake overlaps the one below it
    float h = 0.52;
    float board = floor(p.y / h);
    float fy = fract(p.y / h);
    float lap = smoothstep(0.0, 0.035, fy) * (0.55 + 0.45 * fy);
    vec3 n = normalize(vec3(0.0, -0.35 * (1.0 - fy) - 0.9 * (1.0 - smoothstep(0.0, 0.05, fy)), 1.0));
    float g = plankGrain(p.xy, board);
    float butt = smoothstep(0.994, 0.998, fract(p.x / 9.7 + hash11(board)));
    vec3 alb = mix(vec3(0.028, 0.024, 0.021), vec3(0.085, 0.07, 0.058), g * g * 1.4);
    alb *= 0.75 + 0.5 * hash11(board + 2.0);
    // rain has run down the pitch in long streaks
    float streak = fbm(vec2(p.x * 9.0, p.y * 0.25), 4);
    alb *= 0.7 + 0.6 * streak;
    // wales: heavy timbers along the hull every 2.6 m
    float wy = abs(fract(p.y / 2.6) - 0.5) * 2.6;
    float wale = smoothstep(0.16, 0.12, wy);
    n = normalize(mix(n, vec3(0.0, sign(fract(p.y / 2.6) - 0.5) * 0.8, 0.6), wale * smoothstep(0.08, 0.14, wy)));
    alb = mix(alb, vec3(0.05, 0.04, 0.034) * (0.8 + 0.4 * g), wale);
    alb = mix(alb, vec3(0.02), butt);
    // wet at the waterline and salt-bleached above it
    float wet = smoothstep(1.2, 0.0, p.y - seaH(p.xz, 3));
    alb = mix(alb * 1.25 + vec3(0.03, 0.035, 0.035) * smoothstep(1.5, 4.0, p.y) * g, alb * 0.55, wet);
    // carved words: the text's alpha is the depth of the cut; its gradient bends the normal
    vec3 uv = textUV(p);
    float cut = 0.0;
    if (all(greaterThan(uv.xy, vec2(0))) && all(lessThan(uv.xy, vec2(1)))) {
      vec2 e = vec2(1.0 / 8192.0, 1.0 / 2048.0) * 1.5;
      cut = texture(uText, uv.xy).a;
      float cx = texture(uText, uv.xy + vec2(e.x, 0)).a - texture(uText, uv.xy - vec2(e.x, 0)).a;
      float cy = texture(uText, uv.xy + vec2(0, e.y)).a - texture(uText, uv.xy - vec2(0, e.y)).a;
      n = normalize(n + vec3(cx, -cy, 0.0) * 1.6);
    }
    vec3 sky = vec3(0.62, 0.66, 0.7);
    vec3 key = normalize(vec3(-0.85, 0.45, 0.28));        // raking light along the strakes
    float kd = sat(dot(n, key));
    float diff = 0.12 + 0.25 * sat(n.y + 0.6);
    vec3 col = alb * (sky * diff + vec3(1.25, 1.2, 1.12) * pow(kd, 1.5) * 3.2) * lap;
    // the cut exposes paler inner wood, lit on its upper edge
    col = mix(col, vec3(0.66, 0.6, 0.52) * (0.35 + 0.9 * kd + 0.3 * diff), cut * 0.9);
    float spec = pow(sat(dot(reflect(rd, n), key)), 40.0) * (0.35 + wet * 0.8) * (0.6 + 0.8 * streak);
    col += vec3(0.8, 0.84, 0.9) * spec;
    float fog = 1.0 - exp(-t * 0.02);
    c = mix(col, skyCol(normalize(vec3(rd.x, 0.02, rd.z))), fog);
  }
  return c;
}`,
  uniforms: { ...SEA_UNIFORMS, uNight: 0.18, uWind: 0.3, uLineGlow: 0.0, uSunDir: [-0.4, 0.2, 1.0], uSunCol: [0.8, 0.83, 0.88] },
  camera(t) {
    const p = (t - P.from) / (P.to - P.from);
    const x = keys(t, [[P.from, -3.2], [P.to, 14.5]], (x) => x);
    const pos = [x, 1.1 + 0.5 * Math.sin(p * 2.0), 8.8 + 0.8 * p];
    return { pos, target: [x + 3.6, 3.4, 0], fov: 42, roll: 0.015 * Math.sin(t * 0.6) };
  },
  textPlane() { return { c: [0, 0, 0], ax: [1, 0, 0], ay: [0, 1, 0], hs: [1, 1] }; },
  update(t, u) { u.uWarm.value = warmth(t); },
  post(t) { return grade(t, { exposure: 1.05, vignette: 0.6 }); },
  drawText(ctx, t) {
    // canvas x: 8192 px across 20 m, y: 2048 px across 5 m (y up in the world, down on the canvas)
    const px = (x) => ((x - X0) / (X1 - X0)) * 8192, py = (y) => (1 - (y - Y0) / (Y1 - Y0)) * 2048;
    const carve = (L, x, y, size, italic) => {
      ctx.font = `${italic ? 'italic ' : ''}500 ${size}px "EB Garamond"`;
      ctx.letterSpacing = `${-0.01 * size}px`;
      let cx = px(x);
      for (const w of L.words) {
        const s = clean(w.w).replace(/[,;:.]+$/, '');
        const k = ease.out3((t - w.start + 0.05) / Math.max(0.2, Math.min(0.5, w.end - w.start)));
        if (k > 0) { ctx.fillStyle = `rgba(255,255,255,${k.toFixed(3)})`; ctx.fillText(s, cx, py(y)); }
        cx += ctx.measureText(s + ' ').width;
      }
    };
    carve(L1, 0.2, 3.35, 380, false);
    carve(L2, 6.8, 1.35, 380, true);
  },
});
