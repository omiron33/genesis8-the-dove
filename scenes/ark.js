// Clip — "Come out of the ark, / you, your wife, your sons,"
// The dark timber hold. The great door at the end lowers into a ramp; morning pours in along the
// floor and through the seams of the roof planks, and the camera walks toward the light.
import { keys, ease, wordState, smartQuotes, clamp01 } from '/engine.js';
import { anchor } from '/timing.js';

const A = anchor('Come out of the ark', 'you, your wife, your sons');
const FROM = A.from, TO = A.to;

const frag = /* glsl */ `
uniform float uOpen;   // door angle 0 (shut) .. 1 (lowered to a ramp)
const vec3 SUN = normalize(vec3(0.18, 0.42, 1.0));
const vec3 SUNC = vec3(9.0, 7.4, 5.6);
// hold interior: x in [-4, 4], y in [0, 5.2], z in [-6, 40]
const float ZD = 40.0;

float planksAlong(vec3 p, float w, float gap) { // seams of planks running along z, rows across x
  float c = mod(p.x + 20.0, w) - w * 0.5;
  return abs(c) - (w * 0.5 - gap);
}

vec2 map(vec3 p) {
  // shell of the hold: timber 0.35 m thick
  float inner = -sdBox(p - vec3(0, 2.6, 17.0), vec3(4.0, 2.6, 23.0));
  float d = max(inner, sdBox(p - vec3(0, 2.6, 17.0), vec3(4.35, 2.95, 23.35)));
  float m = 1.0;
  // roof planks with thin seams that let light through
  float seam = planksAlong(p, 0.28, 0.006 + 0.012 * step(0.8, hash11(floor((p.x + 20.0) / 0.28))));
  float slot = max(abs(p.y - 5.38) - 0.4, -seam);
  d = max(d, -slot);
  // ribs: frames every 1.6 m along walls and roof
  float zc = mod(p.z + 0.8, 1.6) - 0.8;
  float rib = max(sdBox(vec3(p.x, p.y - 2.6, zc), vec3(4.0, 2.6, 0.14)), -sdBox(vec3(p.x, p.y - 2.4, zc), vec3(3.62, 2.42, 1.0)));
  rib = max(rib, p.z - (ZD - 0.4));
  // cross beams under the roof and a central keelson on the floor
  float beam = sdBox(vec3(p.x, p.y - 4.55, zc), vec3(4.0, 0.16, 0.12));
  beam = max(beam, p.z - (ZD - 0.4));
  float post = sdBox(vec3(abs(p.x) - 1.9, p.y - 2.3, mod(p.z + 1.6, 3.2) - 1.6), vec3(0.13, 2.3, 0.13));
  post = max(post, p.z - (ZD - 1.2));
  float solid = min(rib, min(beam, post));
  if (solid < d) { d = solid; m = 2.0; }
  // the door opening in the end wall
  float hole = sdBox(p - vec3(0, 2.1, ZD), vec3(2.2, 2.1, 0.8));
  if (-hole > d && p.z > ZD - 0.5) { d = max(d, -hole); }
  // door leaf hinged at the sill, swinging outward and down
  vec3 q = p - vec3(0, 0.0, ZD + 0.05);
  float ang = uOpen * 1.45;
  q.yz = rot(ang) * q.yz;
  float leaf = sdBox(q - vec3(0, 2.1, 0.09), vec3(2.25, 2.12, 0.09));
  if (leaf < d) { d = leaf; m = 3.0; }
  // the ground outside
  float g = p.y + 0.9 + 0.3 * fbm(p.xz * 0.05, 3) - 0.9 * smoothstep(40.0, 60.0, p.z) * 0.0;
  if (p.z > ZD + 0.3 && g < d) { d = g; m = 4.0; }
  return vec2(d, m);
}

vec2 march(vec3 ro, vec3 rd) {
  float t = 0.01; float m = 0.0;
  for (int i = 0; i < 200; i++) {
    vec2 h = map(ro + rd * t);
    if (abs(h.x) < 0.0005 * t) { m = h.y; break; }
    t += h.x * 0.9;
    if (t > 200.0) break;
  }
  return vec2(t, m);
}
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.001;
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);
}
float shadow(vec3 ro, vec3 rd) {
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 48; i++) {
    vec3 p = ro + rd * t;
    if (p.y > 5.8 || p.z > ZD + 0.6) break;
    float h = map(p).x;
    res = min(res, 24.0 * h / t);
    t += clamp(h, 0.005, 0.5);
    if (res < 0.001) break;
  }
  return sat(res);
}
float ao(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 5; i++) { float h = 0.04 * float(i * i); o += (h - map(p + n * h).x) * s; s *= 0.65; }
  return sat(1.0 - 1.4 * o);
}

vec3 outside(vec3 rd) {
  float y = rd.y;
  vec3 c = mix(vec3(1.6, 1.35, 1.1), vec3(0.55, 0.72, 1.0), sat(y * 2.0));
  c += SUNC * pow(max(dot(rd, SUN), 0.0), 200.0) * 4.0;
  // washed hills and a green valley floor after the flood
  float az = atan(rd.x, rd.z);
  float ridge = 0.035 + 0.05 * fbm(vec2(az * 3.0, 1.0), 5) + 0.03 * fbm(vec2(az * 9.0, 4.0), 4);
  float hill = smoothstep(ridge + 0.002, ridge - 0.002, rd.y);
  vec3 hc = mix(vec3(0.62, 0.72, 0.78), vec3(0.95, 0.96, 0.92), sat(rd.y / ridge));
  c = mix(c, hc * 1.1, hill * 0.85);
  float near = smoothstep(0.0, -0.08, rd.y);
  c = mix(c, vec3(0.38, 0.46, 0.26) * 1.4 + 0.2 * fbm(rd.xz / (rd.y - 0.01) * 0.5, 4), near);
  return c * 0.75;
}

// timber: grain runs along the board's long axis
vec3 wood(vec3 p, vec3 n, float m) {
  vec3 a = abs(n);
  float across, along;
  if (m == 1.0) {
    if (a.y > 0.5) { across = p.x; along = p.z; }         // floor and roof boards run fore and aft
    else if (a.x > 0.5) { across = p.y; along = p.z; }    // side strakes run fore and aft
    else { across = p.y; along = p.x; }
  } else {
    if (a.z > 0.5) { across = p.x; along = p.y; }
    else if (a.x > 0.5) { across = p.z; along = p.y; }
    else { across = p.z; along = p.x; }
    if (p.y > 4.3 && a.y < 0.5) { across = p.y; along = p.x; }
  }
  float w = m == 1.0 ? 0.28 : 0.3;
  float board = floor(across / w);
  float bh = hash11(board * 1.37 + m * 11.0);
  float warp = fbm(vec2(across * 6.0, along * 0.35 + bh * 20.0), 3);
  float fib = fbm(vec2(across * 55.0 + bh * 40.0, along * 1.6 + warp * 2.0), 4);
  float rings = 0.5 + 0.5 * sin(across * 140.0 + warp * 22.0 + bh * 50.0);
  vec3 c = mix(vec3(0.19, 0.115, 0.065), vec3(0.34, 0.215, 0.12), fib * 0.7 + rings * 0.18);
  c *= 0.75 + 0.45 * bh;
  // pitch, worn off where feet and hands touch
  float pitch = smoothstep(0.45, 0.75, fbm(vec2(along * 0.4, across * 0.8) + p.y * 0.3, 4)) * 0.55;
  c = mix(c, vec3(0.035, 0.026, 0.02), pitch);
  // board seams
  float e = abs(fract(across / w) - 0.5) * w;
  float seam = smoothstep(w * 0.5 - 0.004, w * 0.5 - 0.012, e);
  // treenails
  float nail = smoothstep(0.012, 0.008, length(vec2(e - w * 0.3, mod(along, 1.6) - 0.8)));
  return c * (0.25 + 0.75 * seam);
}

vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 5.13) * 77.0);
  vec2 h = march(ro, rd);
  vec3 col = vec3(0);
  float tHit = h.x;
  if (h.y < 0.5 || (h.y > 3.5)) {
    if (h.y > 3.5) {
      vec3 p = ro + rd * h.x;
      vec3 n = calcNormal(p);
      vec3 alb = mix(vec3(0.30, 0.26, 0.18), vec3(0.22, 0.30, 0.12), smoothstep(0.4, 0.7, fbm(p.xz * 0.3, 4)));
      col = alb * SUNC * sat(dot(n, SUN)) * 0.18 + alb * vec3(0.6, 0.75, 1.0) * 0.35;
      col = mix(col, outside(rd) * 0.9, 1.0 - exp(-max(h.x - 20.0, 0.0) * 0.02));
    } else { col = outside(rd); tHit = 1e3; }
  } else {
    vec3 p = ro + rd * h.x;
    vec3 n = calcNormal(p);
    vec3 alb = wood(p, n, h.y);
    float sh = shadow(p + n * 0.003, SUN);
    float dif = sat(dot(n, SUN));
    float oc = ao(p, n);
    // light entering through the doorway: sky light falls off with distance from the opening
    float doorLight = uOpen * exp(-(ZD - p.z) * 0.09) * (0.35 + 0.65 * sat(dot(n, vec3(0, 0.3, 1.0))));
    col = alb * SUNC * dif * sh * 0.8;
    col += alb * vec3(1.0, 0.92, 0.82) * doorLight * 2.2 * oc;
    col += alb * vec3(0.9, 0.72, 0.55) * 0.16 * oc * (0.5 + 0.5 * sat(n.y + 0.5));                                    // faint bounce
    // warm bounce from lit floor patches
    col += alb * vec3(0.8, 0.55, 0.35) * uOpen * 0.35 * sat(n.y * -1.0 + 0.2) * exp(-(ZD - p.z) * 0.12);
    float sp = pow(sat(dot(reflect(rd, n), SUN)), 24.0) * 0.08;
    col += SUNC * sp * sh;
  }

  // light in the air: shafts from the roof seams and the doorway
  const int N = 36;
  float tEnd = min(tHit, 60.0), dt = tEnd / float(N);
  vec3 L = vec3(0); float T = 1.0;
  float mu = dot(rd, SUN);
  float phase = 0.08 + 0.9 * pow(max(mu, 0.0), 8.0);
  for (int i = 0; i < N; i++) {
    float t = (float(i) + jit) * dt;
    vec3 p = ro + rd * t;
    if (p.z > ZD + 0.3) break;
    float dens = 0.018 + 0.03 * fbm(p * 0.9 + vec3(0, uTime * 0.08, uTime * 0.05), 3);
    float v = shadow(p, SUN);
    float door = uOpen * exp(-(ZD - p.z) * 0.2) * 0.06;
    L += T * (SUNC * v * phase * 2.2 + vec3(1.0, 0.9, 0.8) * door) * dens * dt;
    T *= exp(-dens * dt * 0.8);
  }
  col = col * T + L;
  // the lyric, standing in the doorway
  vec3 tp = planeUV(ro, rd, vec3(0.0, 2.5, ZD - 1.6), vec3(-1, 0, 0), vec3(0, 1, 0), vec2(2.6, 0.65));
  if (tp.z > 0.0 && tp.z < tHit && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    vec4 tx = texture(uText, tp.xy);
    // letters are cut from the dark: a silhouette against the morning, rimmed by it
    col = col * (1.0 - tx.a) + tx.rgb * 0.02;
    
  }

  return col;
}
`;

export default {
  name: 'ark', from: FROM, to: TO,
  textSize: [4096, 1024],
  frag,
  uniforms: { uOpen: 0 },
  camera(t) {
    const pos = keys(t, [[FROM, [0.9, 1.55, 14.0]], [TO, [0.0, 1.7, 29.0], ease.inOut3]]);
    const target = keys(t, [[FROM, [0.2, 2.1, 40.0]], [TO, [0.0, 2.2, 40.0], ease.inOut3]]);
    return { pos, target, fov: keys(t, [[FROM, 44], [TO, 40]]), roll: keys(t, [[FROM, 0.025], [TO, 0.0]]) };
  },
  update(t, u) { u.uOpen.value = keys(t, [[FROM, 0.1], [A.lines[0].start, 0.13], [A.lines[0].end, 1.0, ease.inOut3]]); },
  post(t) { return { exposure: keys(t, [[FROM, 2.6], [A.lines[0].start + 0.3, 2.2], [A.lines[0].end, 1.0, ease.inOut3]]), bloom: 0.12, threshold: 1.1, grain: 0.03, vignette: 0.55, ca: 0.35, saturation: 0.95, contrast: 1.05 }; },
  drawText(ctx, t) {
    const W = ctx.canvas.width;
    const rows = [[A.lines[0], '600 330px "EB Garamond"', 430], [A.lines[1], 'italic 500 200px "EB Garamond"', 800]];
    ctx.letterSpacing = '-2px';
    for (const [L, font, y] of rows) {
      ctx.font = font;
      const ws = L.words.map((w) => ({ ...w, s: smartQuotes(w.w).replace(/[“”"]/g, '') }));
      const total = ctx.measureText(ws.map((w) => w.s).join(' ')).width;
      let x = (W - total) / 2;
      for (const w of ws) {
        const st = wordState(w, t);
        ctx.fillStyle = `rgba(0, 0, 0, ${st.a.toFixed(3)})`;
        ctx.fillText(w.s, x, y + (1 - st.on) * 26);
        x += ctx.measureText(w.s + ' ').width;
      }
    }
  },
};
