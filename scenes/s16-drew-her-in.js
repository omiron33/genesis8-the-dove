// 16 · "She came back to Noe in the ark. / He reached and drew her in, / held her close inside."
// Inside, facing the open window. The dove flies back out of the grey and lands on the sill;
// she is drawn in from the sill, and the hatch lowers around her. A small lamp warms the timber:
// the first warm light of the film. The words gather in from the edges and close together.
import { keys, ease, grade, warmth, linesFrom, clean, clamp01 } from '/song/lib/look.js';
import { HOLD_GLSL, HOLD_UNIFORMS } from '/song/lib/hold.js';
import { BIRD_GLSL } from '/song/lib/bird.js';
import { cameraPlane } from '/engine.js';

const [L1, L2, L3] = linesFrom('She came back to Noe', 'He reached and drew her in', 'held her close inside');

export default (P) => {
  const land = L1.end - 0.2, reach = L2.start - 0.2, drawn = L2.end + 0.3;
  const sill = [3.92, 2.14, 22.05];
  const birdPos = (t) => {
    if (t < land) {
      const u = (land - t);
      return [sill[0] + 1.4 * u, sill[1] + 0.35 * u + 0.03 * Math.sin(u * 7), sill[2] - 0.5 * u];
    }
    const k = ease.inOut3((t - reach - 0.6) / (drawn - reach));
    return [sill[0] - 0.75 * k, sill[1] - 0.05 * k + 0.02, sill[2] - 0.2 * k];
  };
  return {
    name: 's16-drew-her-in', from: P.from, to: P.to,
    textSize: [3840, 2160],
    frag: HOLD_GLSL + BIRD_GLSL + /* glsl */ `
uniform vec3 uBird; uniform float uYaw, uPh, uFold, uHand, uSpan;
// a hand and forearm, silhouetted: reaching from the lower left toward the sill
float hand(vec3 p) {
  vec3 base = mix(vec3(2.4, 1.1, 20.6), vec3(3.45, 1.9, 21.8), uHand);
  vec3 wrist = base + vec3(0.25, 0.2, 0.15);
  float d = sdRoundCone(p, base - vec3(0.5, 0.4, 0.35), wrist, 0.058, 0.04);
  vec3 q = (p - wrist) / 1.45;
  float palm = sdEllipsoid(q - vec3(0.08, 0.02, 0.02), vec3(0.075, 0.03, 0.06)) * 1.45;
  d = smin(d, palm, 0.03);
  for (int i = 0; i < 4; i++) {
    float o = (float(i) - 1.5) * 0.022;
    vec3 f0 = vec3(0.14, 0.03, 0.02 + o);
    vec3 f1 = f0 + vec3(0.06, -0.012 * (1.0 - uFold) + 0.02 * uFold, 0.0);
    vec3 f2 = f1 + vec3(0.04 - 0.03 * uFold, -0.02 - 0.03 * uFold, 0.0);
    d = smin(d, min(sdCapsule(q, f0, f1, 0.011), sdCapsule(q, f1, f2, 0.0095)), 0.012);
  }
  d = smin(d, sdCapsule(q, vec3(0.03, 0.0, 0.06), vec3(0.09, 0.03, 0.1), 0.012), 0.015);
  return d * 1.0;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 5.13) * 77.0);
  float depth;
  vec3 c = holdScene(ro, rd, jit, depth);
  if (false) {
    float t = 0.1; bool hit = false;
    for (int i = 0; i < 100; i++) { float h = hand(ro + rd * t); if (h < 0.001) { hit = true; break; } t += h; if (t > depth) break; }
    if (hit && t < depth) {
      vec3 p = ro + rd * t;
      vec2 e = vec2(0.001, 0);
      vec3 n = normalize(vec3(hand(p + e.xyy) - hand(p - e.xyy), hand(p + e.yxy) - hand(p - e.yxy), hand(p + e.yyx) - hand(p - e.yyx)));
      vec3 l = uLampPos - p;
      float rim = pow(1.0 - sat(dot(n, -rd)), 3.0);
      c = vec3(0.025, 0.018, 0.014) + vec3(1.0, 0.6, 0.3) * uLamp * 0.05 * sat(dot(n, normalize(l))) / (dot(l, l) + 0.2)
        + vec3(0.9, 0.92, 1.0) * rim * 0.35 * sat(dot(n, vec3(1, 0.2, 0)));
      depth = t;
    }
  }
  vec3 lp, lrd;
  float tb = birdMarch(ro, rd, uBird, uYaw, 0.0, 1.0, uPh, 0.0, uSpan, lp, lrd);
  if (tb > 0.0 && tb < depth) {
    vec3 bc = birdShade(lp, lrd, uYaw, 0.0, uPh, 0.0, uSpan, SUN, uSunCol * 0.18, vec3(0.5, 0.52, 0.55), 0.0);
    vec3 l = uLampPos - uBird;
    bc += vec3(1.0, 0.62, 0.3) * uLamp * 0.25 / (dot(l, l) + 0.3);
    c = bc;
  }
  return c;
}`,
    uniforms: { ...HOLD_UNIFORMS, uWin: 1, uSeams: 0.3, uFill: 0.12, uLamp: 0, uLampPos: [2.3, 1.55, 20.9], uSunDir: [0.85, 0.42, 0.22], uSunCol: [6, 6, 6.2],
      uBird: [4, 2, 22], uYaw: 0, uPh: 0, uFold: 0, uHand: 0, uSpan: 1 },
    camera(t) {
      const p = ease.inOut3((t - P.from) / (P.to - P.from));
      return { pos: [1.35 + 0.5 * p, 2.35 - 0.1 * p, 19.9 + 0.5 * p], target: [3.9, 2.25 - 0.1 * p, 22.1], fov: 42 - 6 * p, roll: 0.0 };
    },
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.4, aspect: 16 / 9 }); },
    update(t, u) {
      const b = birdPos(t), b2 = birdPos(t + 0.05);
      u.uBird.value.set(...b);
      const dx = b2[0] - b[0], dz = b2[2] - b[2];
      u.uYaw.value = t < land ? -Math.atan2(dz, dx) : Math.PI * 0.95;
      // wings beat in flight, then fold to the body once she lands
      const fold = ease.out3((t - land) / 0.4);
      u.uPh.value = t < land ? (t - P.from) * 2.4 * 6.2831 : Math.PI + 0.2 * fold;
      u.uSpan.value = 1 - 0.5 * fold;
      u.uHand.value = ease.inOut3((t - reach) / 1.0) * (1 - 0.35 * ease.inOut3((t - drawn) / 1.2));
      u.uFold.value = ease.inOut3((t - (reach + 0.9)) / 0.6);
      u.uLamp.value = 6 * ease.inOut3((t - (L1.start)) / 6.0);
      u.uWin.value = 1 - 0.8 * ease.inOut3((t - (L3.start - 0.3)) / 2.2);
    },
    post(t) { return grade(t, { exposure: keys(t, [[P.from, 1.25], [P.to, 1.1]]), saturation: 1.02 }); },
  };
};
