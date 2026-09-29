// 02 · "God remembered Noe, / and every beast and bird,"
// The words rise from under the water and settle on the surface; the camera cranes up to find the
// ark small on the horizon.
import { keys, ease, gauge, grade, warmth, linesFrom, setLine, clamp01 } from '/song/lib/look.js';
import { SEA_GLSL, SEA_UNIFORMS } from '/song/lib/sea.js';

const [L1, L2] = linesFrom('God remembered Noe', 'and every beast and bird');
// the lyric plane stands in the water, 9 m out, 5.2 m wide; canvas row 1100 of 2048 is the surface
const PZ = 7.5, PW = 7.2;

export default (P) => ({
  name: 's02-rise', from: P.from, to: P.to,
  textSize: [4096, 2048],
  frag: SEA_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float depth;
  vec3 c = seaScene(ro, rd, depth);
  vec3 tp = planeUV(ro, rd, uTxC, uTxX, uTxY, uTxHS);
  if (tp.z > 0.0 && all(greaterThan(tp.xy, vec2(0))) && all(lessThan(tp.xy, vec2(1)))) {
    vec3 p = ro + rd * tp.z;
    float under = seaH(p.xz, 5) - p.y;
    if (under < 0.0 && tp.z < depth) {
      vec4 tx = texture(uText, tp.xy);
      // letters standing in the grey air take a little of the sky
      c = c * (1.0 - tx.a) + tx.rgb * mix(vec3(1.25), skyCol(rd) * 1.6, 0.25);
    } else if (under > 0.0) {
      // seen through the surface: bent by the swell, dimmed and tinted by depth
      vec3 n = seaNormal(p, tp.z);
      vec2 uv = tp.xy + n.xz * 0.012;
      vec4 tx = texture(uText, uv);
      float k = exp(-under * 3.5) * 0.75;
      c = mix(c, c * (1.0 - tx.a * k) + tx.rgb * k * vec3(0.55, 0.78, 0.8), 1.0);
    }
  }
  return c;
}`,
  uniforms: { ...SEA_UNIFORMS, uNight: 0.22, uWind: 0.18, uArkDist: 900, uSunDir: [0.25, 0.06, 1.0], uSunCol: [0.85, 0.87, 0.9] },
  camera(t) {
    const p = ease.inOut3((t - P.from) / (P.to - P.from));
    const pos = [keys(t, [[P.from, -0.6], [P.to, 0.4]]), 0.55 + 2.6 * p, -1.5 * p];
    const target = [0, 0.35 + 0.9 * p, PZ + 40 * p * p];
    return { pos, target, fov: keys(t, [[P.from, 40], [P.to, 34]]), roll: -0.01 };
  },
  textPlane() { return { c: [0, 1.1 - 0.0, PZ], ax: [-1, 0, 0], ay: [0, 1, 0], hs: [PW / 2, PW / 4] }; },
  update(t, u) { u.uWarm.value = warmth(t); },
  post(t) { return grade(t, { exposure: 1.0 }); },
  drawText(ctx, t) {
    // plane: y from -0.2 m (bottom) to 2.4 m (top); the surface (y = 0) is at canvas row 2048 * (1 - 0.2 / 2.6)
    const surf = 2048 * (1 - 0.2 / 2.6);
    const rise = (w) => ease.out3((t - w.start + 0.25) / Math.max(0.35, w.end - w.start + 0.25));
    const drawRow = (L, y0, size, italic) => {
      ctx.font = `${italic ? 'italic ' : ''}500 ${size}px "EB Garamond"`;
      ctx.letterSpacing = `${-0.012 * size}px`;
      const words = L.words.map((w) => ({ ...w, s: w.w.replace(/[,;:.]+$/, '').replace(/'/g, '’') }));
      const sp = ctx.measureText(' ').width;
      const total = words.reduce((a, w) => a + ctx.measureText(w.s).width, 0) + sp * (words.length - 1);
      let x = (4096 - total) / 2;
      for (const w of words) {
        const r = rise(w);
        if (t > w.start - 0.35) {
          // each word travels up from 0.6 m under the surface to its row
          const y = y0 + (1 - r) * (surf - y0 + size * 1.1);
          ctx.fillStyle = `rgba(246, 240, 230, ${(0.35 + 0.65 * r).toFixed(3)})`;
          ctx.fillText(w.s, x, y);
        }
        x += ctx.measureText(w.s).width + sp;
      }
    };
    const lift = ease.inOut3((t - (L2.start - 0.4)) / 0.9);   // line 1 makes room for line 2
    drawRow(L1, 900 - 330 * lift, 300, false);
    if (t > L2.start - 0.8) drawRow(L2, 1300 - 330 * lift + 330, 230, true);
    const ga = clamp01((t - P.from) / 0.4);
    void ga;
  },
});
