// The words of s05-split, drawn as their own layer over the picture.
// 05 · "The springs of the deep were closed, / heaven's floodgates shut;"
// The lens sits exactly at the water's surface: the gold waterline wavers across the frame, the deep
// below with its springs rising, the sky above with its clouds closing. The first line lives under
// the water, the second in the sky, and each closes like a shutter toward the line as it ends.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01, paintHere, widthHere } from '/song/lib/type.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('The springs of the deep', 'heaven');

const __scene = (P) => ({
  name: 's05-split', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: SEA_GLSL + /* glsl */ `
uniform float uSprings;   // 1 = springs flowing, 0 = closed
uniform float uGates;     // 0 = clouds open, 1 = shut
vec3 deep(vec3 ro, vec3 rd) {
  // murky water lit from above in shifting shafts
  float y = rd.y;
  vec3 c = mix(vec3(0.012, 0.03, 0.036), vec3(0.08, 0.14, 0.15), sat(y * 1.5 + 0.8));
  vec2 sp = vec2(atan(rd.x, rd.z) * 6.0, 0.0);
  float shafts = pow(vnoise(vec2(sp.x * 1.8 + uTime * 0.3, 0.0)), 3.0) * smoothstep(-0.5, 0.2, y);
  c += vec3(0.1, 0.16, 0.16) * shafts * 0.9;
  // springs: columns of bubbles rising from the floor, slowing to nothing as they close
  vec3 acc = vec3(0);
  for (int k = 0; k < 14; k++) {
    float zp = 2.0 + float(k) * 1.1;
    float t = (zp - ro.z) / rd.z;
    if (t <= 0.2) continue;
    vec3 p = ro + rd * t;
    float col = floor(p.x / 1.7);
    if (hash11(col + float(k) * 7.0) > 0.35) continue;
    float cx = (col + 0.5) * 1.7 + (hash11(col * 3.1 + float(k)) - 0.5);
    float rise = uTime * 0.9 + hash11(col + 9.0) * 10.0;
    float yy = p.y + rise;
    float cell = floor(yy / 0.18);
    float bx = cx + (hash11(cell + col) - 0.5) * 0.25 + 0.05 * sin(yy * 6.0);
    vec2 q = vec2(p.x - bx, fract(yy / 0.18) * 0.18 - 0.09);
    float r = 0.012 + 0.02 * hash11(cell * 1.7 + col);
    float alive = step(hash11(cell + col * 5.0), uSprings);
    float d = length(q);
    float pw = t * 2.0 * tan(radians(uFov) * 0.5) / uRes.y;
    float ring = sat(1.0 - abs(d - r) / (pw * 1.5 + 0.003)) + 0.3 * sat((r - d) / pw);
    acc += ring * alive * vec3(0.5, 0.65, 0.66) * 0.4 * exp(-t * 0.08) * step(p.y, -0.1);
  }
  return c + acc;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  // the surface right at the lens: a wavering meniscus
  float meniscus = 0.12 * seaH(ro.xz + vec2(rd.x / max(rd.z, 0.2), 1.0) * 0.6, 3) - ro.y;
  float s = rd.y * 0.6 - meniscus;
  vec3 c;
  if (s < 0.0) {
    c = deep(ro, rd);
  } else {
    float depth;
    c = seaScene(ro, rd, depth);
    // the floodgates: cloud closing over the sky
    vec2 uv = rd.xz / (rd.y + 0.05);
    float cl = fbm(uv * 0.5 + vec2(uTime * 0.03, 0), 5);
    float shut = smoothstep(1.0 - uGates, 1.0 - uGates + 0.25, cl + 0.25 * rd.y);
    c = mix(c, vec3(0.2, 0.22, 0.25) * (0.7 + 0.5 * cl), shut * smoothstep(0.0, 0.1, rd.y));
  }
  // the gold waterline where air meets water
  float px = abs(s) * uRes.y / (2.0 * tan(radians(uFov) * 0.5)) / 0.6;
  c += LINE_GOLD * (exp(-px * px * 0.5) * 2.6 + exp(-px * 0.08) * 0.25) * uLineGlow;
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    vec2 tuv = tp.xy;
    if (s < 0.0) tuv += vec2(sin(tp.y * 40.0 + uTime * 2.0), 0.0) * 0.0015;   // a little bent under water
    c = inkOver(c, tuv);
  }
  return c;
}`,
  uniforms: { ...SEA_UNIFORMS, uNight: 0.2, uWind: 0.15, uSprings: 1, uGates: 0, uSunDir: [0.2, 0.2, 1.0], uSunCol: [0.8, 0.84, 0.9] },
  camera(t) {
    const p = (t - P.from) / (P.to - P.from);
    return { pos: [0, 0.0, keys(t, [[P.from, 0], [P.to, 5]])], target: [0.4 * Math.sin(p * 2), 0.0, 40], fov: 46, roll: 0.02 * Math.sin(t * 0.8) };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) {
    u.uSprings.value = keys(t, [[L1.start, 1], [L1.end, 0.0, ease.inOut3]]);
    u.uGates.value = keys(t, [[L2.start - 0.2, 0.05], [L2.end, 1.05, ease.inOut3]]);
    u.uWarm.value = warmth(t);
  },
  post(t) { return grade(t, { exposure: 1.1, bloom: 0.1 }); },
  drawText(ctx, t) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    // shutter: letters flatten toward the waterline (y = H/2) after their line
    const row = (L, y, size, italic, closeAt, dir) => {
      ctx.font = `${italic ? 'italic ' : ''}500 ${size}px "EB Garamond"`; ctx.letterSpacing = `${-0.01 * size}px`;
      const words = L.words.map((w) => ({ ...w, s: clean(w.w).replace(/[;,.]+$/, '') }));
      const total = widthHere(ctx, words.map((w) => w.s));
      const close = ease.inOut3((t - closeAt) / 0.6);
      let x = (W - total) / 2;
      for (const w of words) {
        const k = ease.out3((t - w.start + 0.1) / 0.4);
        const wd = ctx.measureText(w.s).width;
        if (k > 0 && close < 0.999) {
          ctx.save();
          ctx.translate(0, H / 2); ctx.scale(1, 1 - close); ctx.translate(0, -H / 2);
          paintHere(ctx, w.s, x, y + dir * (1 - k) * 60, k.toFixed(3));
          ctx.restore();
        }
        x += paintHere(ctx, w.s, 0, 0, 0);
      }
    };
    row(L1, H / 2 + 360, 200, false, L1.end + 0.25, 1);
    row(L2, H / 2 - 230, 230, true, L2.end + 0.35, -1);
  },
});

export default (P) => { const s = __scene(P); return { textSize: s.textSize, textPlane: s.textPlane, drawText: s.drawText, shade: 1.0 }; };
