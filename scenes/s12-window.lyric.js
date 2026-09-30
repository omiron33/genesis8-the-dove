// The words of s12-window: the first line across the dark top of the hold, the second set low
// and large beside the bar of light the window throws across the floor.
import { ease, linesFrom, clean, clamp01, gauge, paintHere, widthHere } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

const [L1, L2] = linesFrom('After forty days', 'the window he had made');

export default () => ({
  textSize: [3840, 2160],
  shade: 1.0,
  textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 0.5, aspect: 16 / 9 }); },
  drawText(ctx, t) {
    const out = 1 - clamp01((t - (L2.start + 0.5)) / 0.8);
    ctx.font = '500 170px "EB Garamond"'; ctx.letterSpacing = '-1px';
    let x = 200;
    for (const w of L1.words) {
      const s = clean(w.w).replace(/[;,.]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.4);
      if (k > 0) paintHere(ctx, s, x, 420, k * out);
      x += paintHere(ctx, s, 0, 0, 0);
    }
    gauge(ctx, t, 200, 180, { alpha: 0.7 * out, size: 40 });
    // the second line comes in large and low, beside the light on the floor
    ctx.font = 'italic 500 230px "EB Garamond"'; ctx.letterSpacing = '-2px';
    const rows = [L2.words.slice(0, 2), L2.words.slice(2)];
    rows.forEach((ws, ri) => {
      let xx = 1350 + ri * 200;
      ws.forEach((w) => {
        const s = clean(w.w).replace(/[;,.]+$/, ''); const k = ease.out3((t - w.start + 0.1) / 0.4);
        if (k > 0) paintHere(ctx, s, xx, 1500 + ri * 300 + (1 - k) * 30, k);
        xx += paintHere(ctx, s, 0, 0, 0);
      });
    });
  },
});
