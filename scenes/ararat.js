// Scene: "the mountain peaks came into view." (month ten, day one)
// Aerial dawn. A sea of cloud lies over the flood; as the camera climbs, the cloud deck sinks and the
// eroded, snow-lined peaks of Ararat break through, the ark small and dark on a high saddle.
import { keys, ease, wordState, smartQuotes, clamp01, cameraPlane } from '/engine.js';
import { anchor } from '/timing.js';

const A = anchor('the mountain peaks came into view');
const FROM = A.from, TO = A.to;

const frag = /* glsl */ `
uniform float uMist;     // top of the cloud deck (km)
const vec3 SUN = normalize(vec3(-0.85, 0.13, 0.42));
const vec3 SUNC = vec3(7.0, 5.0, 3.4);
const vec2 ARK = vec2(-0.55, 13.2);

float terrainRaw(vec2 p, int oct) {
  vec2 q = p * 0.42;
  float a = 0.0, b = 1.0; vec2 d = vec2(0);
  for (int i = 0; i < 14; i++) {
    if (i >= oct) break;
    vec3 n = vnoised(q);
    d += n.yz;
    a += b * n.x / (1.0 + dot(d, d));
    b *= 0.5; q = M2 * q * 2.0;
  }
  return a;
}
// the massif: two summits (Greater and Lesser) rising from the flood around z = 14
float terrain(vec2 p, int oct) {
  float r1 = length((p - vec2(0.8, 16.0)) * vec2(1.0, 1.3));
  float r2 = length((p - vec2(-4.2, 13.0)) * vec2(1.0, 1.2));
  float massif = 2.25 * exp(-r1 * r1 * 0.028) + 1.15 * exp(-r2 * r2 * 0.06);
  float h = terrainRaw(p, oct);
  return massif * (0.4 + 0.75 * h) + 0.3 * h - 0.55;
}

vec2 marchTerrain(vec3 ro, vec3 rd, float tmax) {
  float t = 0.05;
  for (int i = 0; i < 400; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - terrain(p.xz, 9);
    if (h < 0.0006 * t) return vec2(t, 1.0);
    t += h * 0.3;
    if (t > tmax || p.y > 6.0 && rd.y > 0.0) break;
  }
  return vec2(tmax, 0.0);
}

vec3 terrainNormal(vec2 p, float t) {
  float e = max(0.0008, 0.0008 * t);
  float h = terrain(p, 13);
  return normalize(vec3(h - terrain(p + vec2(e, 0), 13), e, h - terrain(p + vec2(0, e), 13)));
}

float terrainShadow(vec3 ro) {
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 48; i++) {
    vec3 p = ro + SUN * t;
    float h = p.y - terrain(p.xz, 6);
    res = min(res, 16.0 * h / t);
    t += clamp(h, 0.02, 0.4);
    if (res < 0.0 || p.y > 3.0) break;
  }
  return smoothstep(0.0, 1.0, res);
}

vec3 sky(vec3 rd) {
  float s = max(dot(rd, SUN), 0.0);
  float y = max(rd.y, 0.0);
  vec3 c = mix(vec3(1.0, 0.68, 0.48), vec3(0.16, 0.27, 0.5), sat(y * 3.2));
  c = mix(c, vec3(0.9, 0.62, 0.45), (1.0 - y) * 0.4 * pow(s, 2.0));
  c += vec3(1.0, 0.6, 0.3) * pow(s, 8.0) * 0.8;
  c += SUNC * pow(s, 900.0) * 30.0;
  // high thin cloud
  vec2 uv = rd.xz / (rd.y + 0.06);
  float ci = smoothstep(0.55, 0.9, fbm(uv * 0.6 + vec2(uTime * 0.004, 0), 5)) * smoothstep(0.0, 0.25, rd.y);
  c = mix(c, vec3(1.2, 0.85, 0.7) * (0.8 + 1.4 * pow(s, 4.0)), ci * 0.5);
  return c;
}

// cloud deck density (km)
float cloud(vec3 p) {
  float top = uMist + 0.12 * (fbm(p.xz * 0.35, 3) - 0.5);
  float hgt = sat((top - p.y) / 0.25) * sat((p.y + 0.3) / 0.3);
  if (hgt <= 0.0) return 0.0;
  vec3 q = p * vec3(1.2, 2.2, 1.2) + vec3(uTime * 0.012, 0, uTime * 0.006);
  float n = fbm(q, 5);
  return sat((n - 0.42 + (hgt - 1.0) * 0.4) * 5.0) * 1.0;
}

vec4 clouds(vec3 ro, vec3 rd, float tHit, float jit) {
  // slab between y = -0.3 and uMist + 0.1
  float y1 = uMist + 0.1, y0 = -0.3;
  float t0 = (y1 - ro.y) / rd.y, t1 = (y0 - ro.y) / rd.y;
  if (t0 > t1) { float tt = t0; t0 = t1; t1 = tt; }
  t0 = max(t0, 0.0); t1 = min(t1, min(tHit, 40.0));
  if (t1 <= t0) return vec4(0, 0, 0, 1);
  const int N = 48;
  float dt = (t1 - t0) / float(N);
  vec3 L = vec3(0); float T = 1.0;
  float mu = dot(rd, SUN);
  float phase = mix(0.08, 0.6 * pow(max(mu, 0.0), 6.0) + 0.1, 0.7);
  for (int i = 0; i < N; i++) {
    float t = t0 + (float(i) + jit) * dt;
    vec3 p = ro + rd * t;
    float d = cloud(p);
    if (d > 0.01) {
      float ds = cloud(p + SUN * 0.06);
      float lit = exp(-ds * 3.5) * (0.35 + 0.65 * terrainShadowCheap(p));
      float ambient = 0.35 + 0.65 * sat((p.y + 0.3) / (uMist + 0.4));
      vec3 c = SUNC * lit * phase * 1.3 + vec3(0.55, 0.62, 0.78) * ambient * 0.9;
      float a = 1.0 - exp(-d * dt * 22.0);
      L += T * a * c;
      T *= 1.0 - a;
      if (T < 0.01) break;
    }
  }
  return vec4(L, T);
}

vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  vec2 h = marchTerrain(ro, rd, 60.0);
  vec3 col;
  float tHit = h.x;
  // flood water under the clouds
  float tw = rd.y < 0.0 ? (-0.25 - ro.y) / rd.y : 1e9;
  if (tw < tHit) {
    vec3 p = ro + rd * tw;
    vec3 n = normalize(vec3((vnoise(p.xz * 40.0 + uTime * 0.3) - 0.5) * 0.08, 1.0, (vnoise(p.xz * 40.0 + 9.0) - 0.5) * 0.08));
    float fr = 0.02 + 0.98 * pow(1.0 - sat(dot(n, -rd)), 5.0);
    col = mix(vec3(0.02, 0.035, 0.045), sky(reflect(rd, n)), fr);
    tHit = tw;
  } else if (h.y > 0.5) {
    vec3 p = ro + rd * h.x;
    vec3 n = terrainNormal(p.xz, h.x);
    float sh = terrainShadow(p + n * 0.002);
    float dif = sat(dot(n, SUN));
    // rock, scree and snow
    float strata = vnoise(vec2(p.y * 60.0, p.x * 0.5));
    vec3 rock = mix(vec3(0.16, 0.12, 0.10), vec3(0.30, 0.24, 0.20), strata);
    rock = mix(rock, vec3(0.09, 0.075, 0.07), smoothstep(0.7, 0.4, n.y) * 0.6);
    float snow = smoothstep(0.62, 0.85, n.y + 0.2 * (fbm(p.xz * 20.0, 3) - 0.5) + (p.y - 0.9) * 0.35);
    snow *= smoothstep(0.35, 0.9, p.y);
    vec3 alb = mix(rock, vec3(0.86, 0.88, 0.92), snow);
    float occ = sat(0.35 + 0.65 * n.y) * (0.6 + 0.4 * sat((terrain(p.xz, 4) - p.y + 0.08) * -8.0 + 1.0));
    col = alb * SUNC * dif * sh * 0.3;
    col += alb * vec3(0.45, 0.55, 0.78) * occ * 0.5;                       // skylight
    col += alb * vec3(0.9, 0.55, 0.35) * sat(-dot(n.xz, SUN.xz)) * 0.06;  // bounce
    col += vec3(1.0, 0.9, 0.8) * snow * pow(sat(dot(reflect(rd, n), SUN)), 30.0) * sh * 1.6;
    // the ark: a long dark timber hull on the saddle
    vec3 a = vec3(ARK.x, terrain(ARK, 9) + 0.009, ARK.y);
    vec3 q = p - a; q.xz = rot(0.5) * q.xz;
    float ab = sdBox(q, vec3(0.068, 0.012, 0.011));
    if (ab < 0.004) {
      float plank = 0.6 + 0.4 * step(0.5, fract(q.y * 700.0));
      col = vec3(0.06, 0.04, 0.03) * plank * (0.4 + dif * sh * 2.5);
    }
  } else {
    col = sky(rd);
    tHit = 80.0;
  }
  // aerial perspective
  float fogAmt = h.y > 0.5 || tw < 1e8 ? 1.0 - exp(-tHit * 0.02) : 0.0;
  vec3 fogC = mix(vec3(0.55, 0.62, 0.78), vec3(1.2, 0.85, 0.6), pow(max(dot(rd, SUN), 0.0), 3.0));
  col = mix(col, fogC, fogAmt * 0.85);
  vec4 c = clouds(ro, rd, tHit, jit);
  col = col * c.a + c.rgb;

  // the lyric plane
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    vec4 tx = texture(uText, tp.xy);
    col = col * (1.0 - tx.a) + tx.rgb * 1.5;
  }
  return col;
}
`;

// cheap shadow of the massif on the cloud deck
const fragWithHelpers = frag.replace('vec4 clouds(', `float terrainShadowCheap(vec3 p) {
  float res = 1.0, t = 0.05;
  for (int i = 0; i < 10; i++) { vec3 q = p + SUN * t; float h = q.y - terrain(q.xz, 4); res = min(res, 10.0 * h / t); t += max(h, 0.15); }
  return sat(res);
}
vec4 clouds(`);

export default {
  name: 'ararat', from: FROM, to: TO,
  textSize: [4096, 1024],
  frag: fragWithHelpers,
  uniforms: { uMist: 0.6 },
  camera(t) {
    const pos = keys(t, [[FROM, [2.6, 1.55, -2.5]], [TO, [1.4, 1.85, 2.2], ease.inOut3]]);
    const target = keys(t, [[FROM, [-0.4, 1.0, 14.5]], [TO, [-0.8, 1.25, 14.5], ease.inOut3]]);
    return { pos, target, fov: keys(t, [[FROM, 34], [TO, 28]]), roll: keys(t, [[FROM, -0.03], [TO, 0.01]]) };
  },
  textPlane(t, cam) { return cameraPlane(cam, { x: -0.45, y: 0.62, width: 0.46, dist: 0.3, aspect: 4 }); },
  update(t, u) { u.uMist.value = keys(t, [[FROM, 1.25], [A.lines[0].start, 1.12], [A.lines[0].end + 0.2, 0.5, ease.inOut3], [TO, 0.42]]); },
  post(t) { return { exposure: 1.0, bloom: 0.07, threshold: 1.4, grain: 0.022, vignette: 0.4, ca: 0.2, saturation: 1.0, contrast: 1.03 }; },
  drawText(ctx, t) {
    const L = A.lines[0];
    ctx.font = '500 250px "EB Garamond"';
    ctx.letterSpacing = '-2px';
    let x = 0;
    for (const w of L.words) {
      const s = smartQuotes(w.w).replace(/[.,;]$/, '');
      const st = wordState(w, t);
      ctx.fillStyle = `rgba(255, 246, 236, ${st.a.toFixed(3)})`;
      ctx.fillText(s, x, 620 + (1 - st.on) * 26);
      x += ctx.measureText(s + ' ').width;
    }
    ctx.font = '500 56px "Inter Tight"'; ctx.letterSpacing = '14px';
    ctx.fillStyle = 'rgba(255, 240, 225, 0.7)';
    ctx.fillText('GENESIS 8 : 5   \u00b7   MONTH TEN, DAY ONE', 8, 300);
  },
};
