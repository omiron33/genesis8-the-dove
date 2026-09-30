// 25 · "the earth was dry. / The Lord God spoke to Noe:"
// Stillness. A wide, low frame over the dried plain; nothing moves but the light. As "The Lord God"
// is sung, a column of warm light stands up from the horizon, and the name arrives in the sacred
// register: small capitals, widely spaced, slow.
import { keys, ease, grade, linesFrom, clean, clamp01 } from '/song/lib/look.js';
import { GROUND_GLSL, GROUND_UNIFORMS } from '/song/lib/ground.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('the earth was dry', 'The Lord God spoke to Noe');

export default (P) => ({
  name: 's25-voice', from: P.from, to: P.to,
  textSize: [3840, 2160],
  frag: GROUND_GLSL + /* glsl */ `
uniform float uRay;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = groundScene(ro, rd, depth);
  // the column of light over the horizon
  float col = exp(-abs(rd.x) * 9.0) * smoothstep(-0.01, 0.02, rd.y) * exp(-max(rd.y, 0.0) * 1.6);
  c += vec3(1.2, 0.95, 0.65) * col * uRay * 1.6;
  if (depth < 1e3) c += vec3(1.0, 0.8, 0.55) * exp(-abs(rd.x) * 6.0) * uRay * 0.15;
  return c;
}`,
  uniforms: { ...GROUND_UNIFORMS, uWet: 0.0, uGLine: 0.0, uGreen: 0.15, uRay: 0, uSunDir: [0.0, 0.08, 1.0], uSunCol: [7, 5.6, 3.8] },
  camera(t) {
    const p = (t - P.from) / (P.to - P.from);
    return { pos: [0, 1.6, 0 + 1.2 * p], target: [0, 1.95, 40], fov: 38, roll: 0 };
  },
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
  update(t, u) { u.uRay.value = ease.inOut3((t - (L2.start - 0.5)) / 3.5); },
  post(t) { return grade(t, { exposure: 0.95, bloom: 0.12 }); },
});
