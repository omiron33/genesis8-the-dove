// 04 · "God sent a wind across the earth; / the waters began to fall."
// A gust front races across the sea toward us; spray streaks through the frame. The first line
// blows in letter by letter like spray; the second line settles, each word dropping on its sung start.
import { keys, ease, grade, warmth, linesFrom, clean, gauge, clamp01 } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('God sent a wind', 'the waters began to fall');

export default (P) => ({
  name: 's04-wind', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: SEA_GLSL + /* glsl */ `
uniform float uSpray;
// streaks of spray on world-fixed sheets across the view, blown along +x
vec3 spray(vec3 ro, vec3 rd) {
  vec3 acc = vec3(0);
  for (int k = 0; k < 18; k++) {
    float zp = 1.5 + float(k) * 0.9;
    float t = (zp - ro.z) / rd.z;
    if (t <= 0.2) continue;
    vec3 p = ro + rd * t;
    if (p.y > 3.5 || p.y < -0.5) continue;
    vec2 q = vec2(p.x - uTime * (9.0 + float(k)), p.y);
    vec2 cell = vec2(0.9, 0.07);
    vec2 c = floor(q / cell);
    float r = hash12(c + float(k) * 13.1);
    if (r > 0.12 * uSpray) continue;
    vec2 f = fract(q / cell) - 0.5;
    f.y += (hash12(c + 3.3) - 0.5) * 0.6;
    float len = 0.25 + 0.2 * hash12(c + 1.1);
    float d = length(vec2(max(abs(f.x) - len, 0.0) * cell.x, f.y * cell.y));
    float pw = t * 2.0 * tan(radians(uFov) * 0.5) / uRes.y;
    float a = sat((0.004 + pw - d) / (pw * 1.5));
    acc += a * vec3(0.8, 0.84, 0.88) * 0.35 * exp(-p.y * 0.8) * (0.5 + hash12(c));
  }
  return acc;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  c += spray(ro, rd);
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    vec4 tx = texture(uText, tp.xy);
    c = c * (1.0 - tx.a) + tx.rgb * 1.25;
  }
  return c;
}`,
  uniforms: { ...SEA_UNIFORMS, uNight: 0.25, uWind: 0.3, uSpray: 0, uSunDir: [-0.5, 0.08, 1.0], uSunCol: [0.75, 0.8, 0.86] },
  camera(t) {
    const p = (t - P.from) / (P.to - P.from);
    const pos = [keys(t, [[P.from, -6], [P.to, 10]], (x) => x), 1.6 + 0.25 * Math.sin(t * 1.3), 0];
    return { pos, target: [pos[0] + 6, 1.0, 30], fov: 44, roll: -0.03 + 0.02 * Math.sin(t * 0.9) - 0.03 * p };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) {
    u.uWind.value = keys(t, [[P.from, 0.3], [L1.words[3].start, 0.95], [L2.start, 1.0], [P.to, 0.6]]);
    u.uGust.value = keys(t, [[P.from, -200], [L1.end, 60]], (x) => x);
    u.uSpray.value = keys(t, [[P.from, 0.1], [L1.words[3].start, 1.0], [L2.end, 0.6], [P.to, 0.3]]);
    u.uWarm.value = warmth(t);
  },
  post(t) { return grade(t, { exposure: 1.0, ca: 0.45 }); },
  drawText(ctx, t) {
    const W = ctx.canvas.width;
    gauge(ctx, t, 150, 180, { alpha: 0.72, size: 44 });
    // line 1: each letter is carried in on the wind from the left and resolves in place
    ctx.font = '500 250px "EB Garamond"'; ctx.letterSpacing = '0px';
    let x = 240; const y = 900;
    L1.words.forEach((w) => {
      const s = clean(w.w).replace(/[;,.]+$/, '');
      for (let i = 0; i < s.length; i++) {
        const ch = s[i]; const cw = ctx.measureText(ch).width;
        const k = ease.out5((t - (w.start - 0.25 + i * 0.03)) / 0.55);
        if (k > 0) {
          const j = Math.sin(i * 12.9 + w.start * 7.0);
          ctx.fillStyle = `rgba(246, 240, 230, ${(k * (1 - clamp01((t - (L2.start + 1.8)) / 0.5))).toFixed(3)})`;
          ctx.fillText(ch, x + (1 - k) * (700 + 300 * j), y + (1 - k) * 120 * j);
        }
        x += cw;
      }
      x += ctx.measureText(' ').width;
    });
    // line 2: words fall into place from above, the water line's first drop
    ctx.font = 'italic 500 210px "EB Garamond"';
    let x2 = 420; const y2 = 1260;
    L2.words.forEach((w) => {
      const s = clean(w.w).replace(/[;,.]+$/, '');
      const k = ease.out3((t - w.start + 0.1) / 0.45);
      if (k > 0) { ctx.fillStyle = `rgba(246, 240, 230, ${k.toFixed(3)})`; ctx.fillText(s, x2, y2 - (1 - k) * 90); }
      x2 += ctx.measureText(s + ' ').width;
    });
    void W;
  },
});
