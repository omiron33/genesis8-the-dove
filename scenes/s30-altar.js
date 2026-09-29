// 30 · "Noe built an altar to the Lord. / From every clean beast and bird / he offered whole burnt offerings."
// On the new grass, in the gold of the morning, an altar of rough stones is built one stone per
// measured beat. On "burnt offerings" the fire takes, and its first smoke begins to rise.
import { keys, ease, grade, linesFrom, clean, clamp01 } from '/song/lib/look.js';
import { GROUND_GLSL, GROUND_UNIFORMS } from '/song/lib/ground.js';
import { cameraPlane } from '/engine.js';

const audio = await fetch('/song/data/audio.json').then((r) => r.json());
const [L1, L2, L3] = linesFrom('Noe built an altar', 'From every clean beast', 'he offered whole burnt');
const burnt = L3.words.find((w) => w.w.startsWith('burnt'));

export default (P) => {
  // one stone on each strong beat from "built" until the offerings
  const beats = audio.beats.filter((b) => b > L1.words[1].start - 0.05 && b < burnt.start - 0.3);
  const drops = [];
  for (let i = 0; i < 12; i++) drops.push(beats[Math.min(beats.length - 1, Math.floor(i * beats.length / 12))] ?? (L1.start + i * 0.5));
  return {
    name: 's30-altar', from: P.from, to: P.to,
    textSize: [3840, 2160],
    frag: GROUND_GLSL + /* glsl */ `
uniform float uDrop[12];   // time each stone was set (song seconds)
uniform float uFire;       // 0..1 the fire's strength
float ease3(float x) { return 1.0 - pow(1.0 - x, 3.0); }
float stone(vec3 p, int i) {
  float fi = float(i);
  int course = i / 5;
  int k = i - course * 5;
  vec3 c = course == 0 ? vec3(-0.9 + 0.45 * float(k), 0.22, 0.0)
         : course == 1 ? vec3(-0.68 + 0.45 * float(k), 0.64, 0.05)
         : vec3(-0.2 + 0.4 * float(k), 1.02, 0.0);
  c.z += (hash11(fi * 3.1) - 0.5) * 0.12;
  float fall = 1.0 - ease3(sat((uTime - uDrop[i]) / 0.28));
  c.y += fall * 1.6;
  if (uTime < uDrop[i] - 0.0) return 1e3;
  vec3 q = p - c;
  q.xz = rot(hash11(fi) * 0.5 - 0.25) * q.xz;
  float d = sdBox(q, vec3(0.2 + 0.05 * hash11(fi + 1.0), 0.19, 0.3 + 0.05 * hash11(fi + 2.0))) - 0.015;
  return d + (vnoise(p * 7.0 + fi) - 0.5) * 0.03 + (vnoise(p * 31.0) - 0.5) * 0.008;
}
float altar(vec3 p) { float d = 1e3; for (int i = 0; i < 12; i++) d = min(d, stone(p, i)); return d; }
vec3 aNormal(vec3 p) { vec2 e = vec2(0.003, 0); return normalize(vec3(altar(p + e.xyy) - altar(p - e.xyy), altar(p + e.yxy) - altar(p - e.yxy), altar(p + e.yyx) - altar(p - e.yyx))); }
// fire: flame density rising from the top of the altar
float flame(vec3 p) {
  vec3 q = p - vec3(0.0, 1.25, 0.0);
  if (q.y < -0.1 || q.y > 1.6) return 0.0;
  float r = length(q.xz + 0.12 * vec2(sin(q.y * 4.0 + uTime * 5.0), cos(q.y * 3.0 + uTime * 4.0)) * q.y) / (0.62 - 0.3 * q.y);
  vec3 f = q * vec3(3.0, 1.6, 3.0) - vec3(0.0, uTime * 3.2, 0.0);
  float n = fbm(f, 4);
  return sat((1.0 - r) * 1.1 + (n - 0.5) * 2.4 - q.y * 0.9) * uFire;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = groundScene(ro, rd, depth);
  float t = 0.5; bool hit = false;
  for (int i = 0; i < 120; i++) { float d = altar(ro + rd * t); if (d < 0.001) { hit = true; break; } t += d * 0.8; if (t > depth || t > 30.0) break; }
  if (hit && t < depth) {
    vec3 p = ro + rd * t; vec3 n = aNormal(p);
    vec3 alb = mix(vec3(0.28, 0.25, 0.21), vec3(0.46, 0.41, 0.34), fbm(p * 6.0, 4));
    alb *= 0.8 + 0.4 * vnoise(p * 40.0);
    float dif = sat(dot(n, SUN));
    c = alb * (uSunCol * dif * 0.3 + vec3(0.5, 0.6, 0.78) * (0.5 + 0.5 * n.y) * 0.45);
    vec3 fl = vec3(0.0, 1.5, 0.0) - p;
    c += alb * vec3(1.0, 0.5, 0.2) * uFire * 2.5 * sat(dot(n, normalize(fl))) / (dot(fl, fl) + 0.3);
    depth = t;
  }
  // flames, in front of everything they overlap
  if (uFire > 0.001) {
    vec3 L = vec3(0); float T = 1.0;
    float t0 = max(0.0, length(ro - vec3(0, 1.8, 0)) - 2.5), dt = 0.08;
    for (int i = 0; i < 64; i++) {
      float tt = t0 + float(i) * dt;
      if (tt > depth) break;
      float d = flame(ro + rd * tt);
      if (d > 0.01) {
        vec3 fc2 = mix(vec3(3.0, 0.9, 0.2), vec3(4.5, 3.2, 1.4), d);
        L += T * fc2 * d * dt * 6.0;
        T *= exp(-d * dt * 4.0);
      }
    }
    c = c * T + L;
  }
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    vec4 tx = texture(uText, tp.xy);
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    vec3 ink = mix(vec3(1.05, 1.0, 0.94), vec3(0.05, 0.045, 0.04), smoothstep(0.42, 0.52, lum));
    c = mix(c, ink, tx.a);
  }
  return c;
}`,
    uniforms: { ...GROUND_UNIFORMS, uGreen: 0.62, uWet: 0, uGLine: 0.35, uFire: 0, uDrop: drops, uSunDir: [-0.5, 0.22, -0.8], uSunCol: [7, 5.2, 3.4] },
    camera(t) {
      const p = ease.inOut3((t - P.from) / (P.to - P.from));
      const a = -0.35 + 0.5 * p;
      return { pos: [Math.sin(a) * 5.2, 1.6 + 0.3 * p, -Math.cos(a) * 5.2], target: [1.4, 1.0 + 0.4 * p, 0.3], fov: 40, roll: 0 };
    },
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) { u.uFire.value = ease.inOut3((t - (burnt.start - 0.1)) / 1.2); },
    post(t) { return grade(t, { exposure: 0.9, bloom: 0.14, threshold: 1.0, saturation: 1.08 }); },
    drawText(ctx, t) {
      const rows = [[L1, 330, 180, false], [L2, 1750, 160, true], [L3, 1950, 160, true]];
      for (const [L, y, px, it] of rows) {
        ctx.font = `${it ? 'italic ' : ''}500 ${px}px "EB Garamond"`; ctx.letterSpacing = '-1px';
        let x = 220;
        for (const w of L.words) {
          const s = clean(w.w).replace(/[;,.:]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.4);
          if (k > 0) { ctx.fillStyle = `rgba(255,255,255,${k.toFixed(3)})`; ctx.fillText(s, x, y); }
          x += ctx.measureText(s + ' ').width;
        }
      }
    },
  };
};
