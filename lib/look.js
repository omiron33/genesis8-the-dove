// The film's shared look: palette, colour build, the waterline gauge and the lyric voices.
import { keys, ease, wordState, smartQuotes, clamp01 } from '/engine.js';
import lyrics from '/timing.js';

export const SIGNAL = '255, 204, 112';           // waterline gold, the one colour that glows
export const BONE = '246, 240, 230';

// Colour build over the whole song: silver flood, first warmth at the dove, full colour from
// "Come out of the ark". Returns 0..1 warmth and the grade the engine applies.
export function warmth(t) {
  return keys(t, [[0, 0], [140, 0.08], [152, 0.35], [175, 0.45], [195, 0.6], [221, 1.0], [342.4, 1.0]]);
}
export function grade(t, extra = {}) {
  const w = warmth(t);
  return {
    saturation: 0.9 + 0.15 * w,
    contrast: 1.04,
    lift: [0.008 - 0.004 * w, 0.011 - 0.004 * w, 0.016 - 0.008 * w],
    gain: [0.96 + 0.05 * w, 0.99, 1.03 - 0.06 * w],
    grain: 0.03,
    vignette: 0.5,
    ca: 0.3,
    bloom: 0.08,
    threshold: 1.15,
    ...extra,
  };
}

// The flood's level as the song tells it, in cubits above the peaks (15 at the start, 0 when the
// peaks appear, below ground at "the waters had ebbed").
export function level(t) {
  return keys(t, [[0, 15], [36, 15], [54, 13], [64, 11], [76, 8], [95, 0], [150, -6], [181, -9], [194, -15]]);
}
export function dayCount(t) {
  return Math.round(keys(t, [[0, 150], [55, 150], [64, 150], [96, 224], [140, 264], [152, 271], [165, 278], [180, 314], [204, 370], [342.4, 370]], (x) => x));
}

export function linesFrom(...prefixes) {
  const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]/g, '').trim();
  let from = 0;
  return prefixes.map((p) => {
    const l = lyrics.lines.find((l) => l.start >= from && norm(l.text).startsWith(norm(p)));
    if (!l) throw Error('no line: ' + p);
    from = l.start;
    return { ...l, words: lyrics.words.filter((w) => w.start >= l.start - 0.05 && w.end <= l.end + 0.05) };
  });
}

export const clean = (s) => smartQuotes(s).replace(/[“”"]/g, '');

// ---------- Canvas2D voices ----------
export function lyricFont(px, { italic = false, weight = 500 } = {}) { return `${italic ? 'italic ' : ''}${weight} ${px}px "EB Garamond"`; }
export function gaugeFont(px, weight = 500) { return `${weight} ${px}px "Inter Tight"`; }

// Set a line word by word, each word appearing on its measured start. Returns the laid-out words.
// opts: x, y, size, italic, align ('left'|'center'|'right'), color (rgb string), alpha, tracking,
// rise (px the word travels as it arrives), stay (seconds a word keeps after the line ends; Infinity by default),
// fadeOut ([t0, t1]) to clear the line.
export function setLine(ctx, line, t, o = {}) {
  const size = o.size ?? 200;
  ctx.font = lyricFont(size, { italic: o.italic });
  ctx.letterSpacing = `${o.tracking ?? -0.012 * size}px`;
  const words = line.words.map((w) => ({ ...w, s: o.keepPunct ? clean(w.w) : clean(w.w).replace(/[,;:.]+$/, '') }));
  const space = ctx.measureText(' ').width;
  const widths = words.map((w) => ctx.measureText(w.s).width);
  const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  let x = o.x ?? 0;
  if (o.align === 'center') x -= total / 2; else if (o.align === 'right') x -= total;
  const out = o.fadeOut ? 1 - ease.inOut3((t - o.fadeOut[0]) / (o.fadeOut[1] - o.fadeOut[0])) : 1;
  const laid = [];
  words.forEach((w, i) => {
    const st = wordState(w, t);
    const a = st.a * out * (o.alpha ?? 1);
    if (a > 0.002) {
      ctx.fillStyle = `rgba(${o.color ?? BONE}, ${a.toFixed(3)})`;
      ctx.fillText(w.s, x, (o.y ?? 0) + (1 - st.on) * (o.rise ?? size * 0.12));
    }
    laid.push({ ...w, x, width: widths[i], st, a });
    x += widths[i] + space;
  });
  return { words: laid, width: total };
}

// Small tracked capitals in the gauge voice.
export function annotate(ctx, text, x, y, { size = 52, alpha = 0.75, color = BONE, align = 'left', tracking = 0.26 } = {}) {
  ctx.font = gaugeFont(size);
  ctx.letterSpacing = `${size * tracking}px`;
  ctx.fillStyle = `rgba(${color}, ${alpha})`;
  const w = ctx.measureText(text).width;
  ctx.fillText(text, align === 'center' ? x - w / 2 : align === 'right' ? x - w : x, y);
  return w;
}

// The gauge: chapter and verse, day count and level, with a hairline rule.
export function gauge(ctx, t, x, y, { verse = '8', alpha = 0.8, size = 44, day = true, color = BONE } = {}) {
  const lv = level(t);
  const parts = [`GENESIS ${verse}`];
  if (day) parts.push(`DAY ${dayCount(t)}`);
  parts.push(lv > 0 ? `WATER +${lv.toFixed(1)} CUBITS` : lv > -14 ? `WATER \u2212${(-lv).toFixed(1)} CUBITS` : 'THE EARTH IS DRY');
  const w = annotate(ctx, parts.join('   ·   '), x, y, { size, alpha });
  ctx.fillStyle = `rgba(${SIGNAL}, ${alpha})`;
  ctx.fillRect(x, y + size * 0.55, Math.min(w, size * 12), Math.max(2, size * 0.06));
}

export { keys, ease, clamp01, wordState, smartQuotes, lyrics };

// Project a world point through a camera to text-canvas pixels (canvas W×H spanning the frame).
export function project(cam, p, W = 3840, H = 2160) {
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const ww = norm(sub(cam.target, cam.pos));
  const roll = cam.roll ?? 0;
  const uu = norm(cross(ww, [Math.sin(roll), Math.cos(roll), 0])), vv = cross(uu, ww);
  const d = sub(p, cam.pos);
  const z = dot(d, ww);
  const f = 1 / Math.tan(((cam.fov ?? 40) * Math.PI) / 360);
  const x = (dot(d, uu) / z) * f, y = (dot(d, vv) / z) * f;   // y in units of half-height
  return { x: W / 2 + x * (H / 2), y: H / 2 - y * (H / 2), z };
}
