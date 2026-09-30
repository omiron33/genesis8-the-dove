// 35 · "seedtime, harvest, cold and heat, / summer, spring, day and night—"
// Hard cuts on the words: the same field seen in each of the seasons the promise names, one world per
// word. The word itself stands large across its world for exactly as long as it is sung.
import { keys, ease, grade, linesFrom, clean, clamp01, annotate, paintHere, widthHere } from '/song/lib/look.js';
import { GROUND_GLSL, GROUND_UNIFORMS } from '/song/lib/ground.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('seedtime', 'summer, spring');
const words = [...L1.words, ...L2.words];
const kinds = { seedtime: 0, harvest: 1, cold: 2, heat: 3, summer: 4, spring: 5, day: 6, night: 7 };

export default (P) => {
  const nouns = words.filter((w) => kinds[clean(w.w).toLowerCase().replace(/[^a-z]/g, '')] !== undefined);
  const seasonAt = (t) => {
    let k = 0;
    for (const w of nouns) if (t >= w.start - 0.08) k = kinds[clean(w.w).toLowerCase().replace(/[^a-z]/g, '')];
    return k;
  };
  return {
    name: 's35-seasons', from: P.from, to: P.to,
    textSize: [3840, 2160],
    frag: GROUND_GLSL + /* glsl */ `
uniform float uSeason;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  int s = int(uSeason + 0.5);
  if (s == 3) rd = normalize(rd + vec3(0.0, 0.0015 * sin(fc.y * 0.08 + uTime * 12.0) * smoothstep(0.05, -0.02, rd.y + 0.02), 0.0));   // heat shimmer
  float depth;
  vec3 c = groundScene(ro, rd, depth);
  if (depth < 1e3) {
    vec3 p = ro + rd * depth;
    float fog = 1.0 - exp(-depth * 0.004);
    vec3 alb;
    if (s == 0) {        // seedtime: fresh furrows of dark earth
      float f = 0.5 + 0.5 * sin(p.x * 9.0 + fbm(p.xz * 0.5, 2));
      alb = mix(vec3(0.07, 0.05, 0.035), vec3(0.2, 0.14, 0.09), f) * (0.8 + 0.3 * fbm(p.xz * 12.0, 3));
      c = mix(alb * vec3(1.6, 1.5, 1.4), gSky(normalize(vec3(rd.x, 0.001, rd.z))), fog);
    } else if (s == 1) { // harvest: standing wheat, gold in low sun
      float stalk = fbm(vec2(p.x * 40.0, p.z * 4.0), 4);
      alb = mix(vec3(0.5, 0.33, 0.1), vec3(0.95, 0.72, 0.32), stalk);
      c = mix(alb * uSunCol * 0.12, gSky(normalize(vec3(rd.x, 0.001, rd.z))), fog);
    } else if (s == 2) { // cold: snow
      alb = vec3(0.86, 0.9, 0.96) * (0.9 + 0.1 * fbm(p.xz * 3.0, 3));
      c = mix(alb * vec3(0.9, 0.95, 1.05) * 1.1, vec3(0.8, 0.85, 0.92), fog);
    } else if (s == 3) { // heat: bleached, cracked
      c = mix(c * vec3(1.35, 1.2, 1.0) + 0.1, vec3(1.3, 1.2, 1.05), fog);
    } else if (s == 5) { // spring: green with blossom
      vec2 bc = floor(p.xz * 6.0);
      float bl = step(0.9, hash12(bc)) * smoothstep(0.22, 0.12, length(fract(p.xz * 6.0) - 0.5 - (hash22(bc) - 0.5) * 0.4)) * step(0.3, fbm(p.xz * 0.3, 3));
      c = mix(c, vec3(1.3, 1.05, 1.1), bl * (1.0 - fog));
    } else if (s == 7) { // night
      c *= vec3(0.05, 0.07, 0.14);
    }
  } else {
    if (s == 2) c = mix(vec3(0.8, 0.84, 0.9), vec3(0.55, 0.62, 0.72), sat(rd.y * 2.0));
    if (s == 3) c = mix(vec3(1.5, 1.35, 1.1), vec3(0.95, 0.92, 0.9), sat(rd.y * 2.0));
    if (s == 7) {
      c = mix(vec3(0.03, 0.04, 0.09), vec3(0.005, 0.008, 0.02), sat(rd.y * 2.0));
      vec2 su = rd.xy / (rd.z + 0.3) * 80.0;
      c += vec3(0.9) * step(0.985, hash12(floor(su))) * smoothstep(0.3, 0.0, length(fract(su) - 0.5));
    }
  }
  // snowfall in the cold
  if (s == 2) {
    for (int k = 0; k < 10; k++) {
      float zp = 2.0 + float(k) * 1.5; float t = (zp - ro.z) / rd.z; if (t <= 0.0) continue;
      vec3 p = ro + rd * t; vec2 q = vec2(p.x + 0.3 * sin(uTime + float(k)), p.y + uTime * 0.8) / 0.25;
      vec2 cc = floor(q); if (hash12(cc + float(k)) > 0.3) continue;
      float d = length(fract(q) - 0.5 - (hash22(cc) - 0.5) * 0.6);
      c += vec3(0.9) * smoothstep(0.06, 0.02, d) * exp(-t * 0.1);
    }
  }
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    c = inkOver(c, tp.xy);
  }
  return c;
}`,
    uniforms: { ...GROUND_UNIFORMS, uSeason: 0, uGreen: 1, uWet: 0, uGLine: 0.3 },
    camera(t) {
      const s = seasonAt(t);
      const yaw = [0.0, 0.5, -0.4, 0.9, -0.8, 0.3, -0.2, 0.6][s];
      const h = [1.2, 1.4, 1.6, 1.3, 1.7, 1.1, 1.5, 1.4][s];
      const drift = (t - P.from) * 0.4;
      return { pos: [drift, h, 0], target: [drift + Math.sin(yaw) * 30, h - 0.6, Math.cos(yaw) * 30], fov: 46, roll: 0 };
    },
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const s = seasonAt(t);
      u.uSeason.value = s;
      const sun = [[0.3, 0.3, 1], [-0.6, 0.08, 1], [0.2, 0.25, 1], [0.1, 0.9, 0.4], [0.3, 0.7, 1], [0.4, 0.5, 1], [0.0, 0.8, 0.6], [0.0, -0.3, 1]][s];
      const col = [[5, 5, 5.2], [9, 6, 3], [5, 5.4, 6.2], [10, 9, 7.5], [8, 7.6, 7], [7.5, 7.2, 6.8], [8, 8, 8], [0.4, 0.5, 0.8]][s];
      u.uSunDir.value.set(...sun); u.uSunCol.value.set(...col);
      u.uGreen.value = [0.0, 0.3, 0.0, 0.0, 1, 1, 0.9, 0.9][s];
    },
    post(t) { const s = seasonAt(t); return grade(t, { exposure: [1.0, 1.0, 1.0, 0.95, 1.0, 1.0, 1.0, 1.4][s], saturation: 1.08 }); },
    drawText(ctx, t) {
      // the current word, large; "and" small beneath it
      const cur = words.filter((w) => t >= w.start - 0.08).pop();
      if (!cur) return;
      const s = clean(cur.w).replace(/[;,.:—”]+$/, '');
      const small = s.toLowerCase() === 'and';
      const k = ease.out5((t - cur.start + 0.08) / 0.25);
      ctx.font = `${small ? 'italic 500 200px' : 'italic 500 520px'} "EB Garamond"`; ctx.letterSpacing = small ? '0px' : '-6px';
      const w = widthHere(ctx, [s]);
      const inks = { seedtime: '196, 150, 98', harvest: '246, 196, 92', cold: '196, 228, 250', heat: '255, 150, 70', summer: '150, 214, 96', spring: '255, 190, 214', day: '255, 244, 206', night: '176, 196, 255' };
      paintHere(ctx, s, 1920 - w / 2, small ? 1560 : 1700, k, inks[s.toLowerCase()]);
      // the running list of the promise, small, along the top
      const said = words.filter((w) => t >= w.start - 0.08).map((w) => clean(w.w).replace(/[;,.:—”]+$/, '').toUpperCase());
      annotate(ctx, said.join('  '), 1920, 220, { size: 40, alpha: 0.7, align: 'center', color: '255, 255, 255' });
    },
  };
};
