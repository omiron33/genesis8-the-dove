// 32 · "I will not curse the earth again / for what humanity has done. / The human heart leans toward evil"
// The whole earth from far above at sunrise: its curve, the thin atmosphere lit gold along the limb
// (the waterline become the edge of the world), land and sea below with no flood on them. God's
// words are set in the sacred register, one line at a time, slow and wide.
import { keys, ease, grade, linesFrom, clean, clamp01, paintHere, widthHere } from '/song/lib/look.js';
import { cameraPlane } from '/engine.js';

const [L1, L2, L3] = linesFrom('I will not curse the earth', 'for what humanity has done', 'The human heart leans');

export default (P) => ({
  name: 's32-vow', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: /* glsl */ `
const float R = 6.371;           // planet radius (thousands of km)
const vec3 SUNV = normalize(vec3(0.97, 0.03, 0.22));
vec2 sph(vec3 ro, vec3 rd, float r) {
  float b = dot(ro, rd), c = dot(ro, ro) - r * r, h = b * b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h); return vec2(-b - h, -b + h);
}
vec3 surface(vec3 n) {
  // continents and sea, cloud bands over them
  vec3 q = n * 9.0;
  float land = smoothstep(0.52, 0.56, fbm(q + vec3(1.3, 0.2, 4.1), 6));
  vec3 sea = mix(vec3(0.02, 0.06, 0.12), vec3(0.03, 0.1, 0.16), fbm(q * 3.0, 3));
  vec3 ground = mix(vec3(0.16, 0.2, 0.08), vec3(0.36, 0.3, 0.2), fbm(q * 4.0 + 7.0, 4));
  vec3 c = mix(sea, ground, land);
  float cl = smoothstep(0.5, 0.75, fbm(q * vec3(2.2, 5.0, 2.2) + vec3(uTime * 0.01, 0, 0), 6));
  return mix(c, vec3(0.9, 0.92, 0.95), cl * 0.85);
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  vec3 col = vec3(0.004, 0.005, 0.009);
  // a few stars
  vec3 sd = floor(rd * 300.0);
  float st = hash13(sd);
  if (st > 0.9985) col += vec3(0.8) * smoothstep(0.35, 0.0, length(fract(rd * 300.0) - 0.5)) * (st - 0.9985) * 500.0;
  vec2 hp = sph(ro, rd, R);
  vec2 ha = sph(ro, rd, R + 0.09);
  if (hp.x > 0.0) {
    vec3 p = ro + rd * hp.x; vec3 n = normalize(p);
    float dif = sat(dot(n, SUNV) * 1.2 + 0.05);
    vec3 s = surface(n);
    col = s * dif * vec3(1.6, 1.45, 1.3);
    // sunlight glinting on the sea near the terminator
    col += vec3(1.4, 1.0, 0.6) * pow(sat(dot(reflect(rd, n), SUNV)), 60.0) * 0.6 * dif;
    // haze towards the limb
    float lim = pow(1.0 - sat(dot(n, -rd)), 3.0);
    col = mix(col, vec3(0.35, 0.55, 0.9) * (0.2 + dif), lim * 0.6);
  }
  if (ha.x > 0.0 || ha.y > 0.0) {
    // the atmosphere: thin blue by day, a gold line where the sun is coming up
    float t0 = max(ha.x, 0.0), t1 = hp.x > 0.0 ? hp.x : ha.y;
    vec3 mid = ro + rd * (0.5 * (t0 + t1));
    float thick = (t1 - t0);
    vec3 n = normalize(mid);
    float day = sat(dot(n, SUNV) * 3.0 + 0.3);
    float edge = sat(dot(n, SUNV) * 8.0 + 0.5) * (1.0 - sat(dot(n, SUNV) * 3.0));
    float hgt = sat((length(ro + rd * max(t0, (t0 + t1) * 0.5)) - R) / 0.09);
    // the lowest band of air lit gold: the waterline become the edge of the world
    vec3 airC = mix(vec3(1.0, 0.6, 0.2) * 1.6, vec3(0.25, 0.5, 1.0), smoothstep(0.05, 0.45, hgt));
    col += airC * thick * 1.2 * day;
  }
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    col = inkOver(col, tp.xy);
  }
  return col;
}`,
  uniforms: {},
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    const pos = [0.0, 7.3 + 0.12 * p, 0.3 * p];
    return { pos, target: [pos[0] + 1.0, pos[1] - 0.34 + 0.06 * p, pos[2] + 0.12 + 0.1 * p], fov: 46, roll: 0.04 - 0.06 * p };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.2, aspect: 16 / 9 }); },
  post(t) { return grade(t, { exposure: 1.0, bloom: 0.1, vignette: 0.6 }); },
  drawText(ctx, t) {
    const lines = [L1, L2, L3];
    lines.forEach((L, i) => {
      const next = lines[i + 1];
      const out = next ? 1 - clamp01((t - (next.start - 0.5)) / 0.6) : 1;
      if (out <= 0 || t < L.start - 0.4) return;
      ctx.font = '500 150px "EB Garamond"'; ctx.fontVariantCaps = 'all-small-caps'; ctx.letterSpacing = '26px';
      const ws = L.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.:“”]+$/, '').replace(/^“/, '') }));
      const tot = widthHere(ctx, ws.map((w) => w.s));
      let x = 1920 - tot / 2;
      for (const w of ws) {
        const k = ease.out3((t - w.start + 0.1) / 0.8);
        if (k > 0) { paintHere(ctx, w.s, x, 560, (k * out).toFixed(3)); }
        x += ctx.measureText(w.s + '  ').width;
      }
      ctx.fontVariantCaps = 'normal';
    });
  },
});
