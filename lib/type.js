// The words' voices and type helpers. Only lyric modules (and scenes whose words are baked in)
// import this, so typography changes never re-render pictures.
import { keys, ease, wordState, smartQuotes, clamp01 } from '/engine.js';
import { SIGNAL, BONE, level, dayCount, clean } from '/song/lib/look.js';
export * from '/song/lib/look.js';

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

// ---------- the words' voices ----------
// Each word is set by what it is: its colour, weight and face carry its meaning.
const CLASSES = {
  divine: { words: ['god', 'lord', 'himself', 'heaven', 'heavens'], color: '242, 196, 104', font: (px) => `600 ${px}px "EB Garamond"`, caps: true, track: 0.14, scale: 1.08 },
  water: { words: ['waters', 'water', 'deep', 'rain', 'springs', 'floodgates', 'fall', 'falling', 'ebbed', 'withdrawn', 'wind'], color: '132, 200, 222', font: (px) => `italic 400 ${px}px "EB Garamond"`, track: 0.01, scale: 1.12 },
  earth: { words: ['earth', 'ground', 'dry', 'mountains', 'mountain', 'peaks', 'ararat', 'ararat’s', 'earth’s'], color: '222, 150, 88', font: (px) => `800 ${px}px "EB Garamond"`, track: -0.01, scale: 1.12 },
  bird: { words: ['dove', 'raven', 'bird', 'birds', 'flew', 'leaf', 'olive'], color: '250, 250, 246', font: (px) => `italic 600 ${px}px "EB Garamond"`, track: 0.02, scale: 1.15 },
  life: { words: ['beast', 'beasts', 'herd', 'creature', 'creeping', 'flesh', 'living', 'life', 'crawls', 'cattle', 'teem', 'multiply', 'kind', 'thing', 'fill'], color: '156, 204, 110', font: (px) => `700 ${px}px "EB Garamond"`, track: 0, scale: 1.06 },
  ark: { words: ['ark', 'ark’s', 'window', 'covering', 'altar', 'offerings', 'burnt'], color: '214, 160, 112', font: (px) => `700 ${Math.round(px * 0.82)}px "Inter Tight"`, caps: true, track: 0.12, scale: 1.0 },
  time: { words: ['one', 'hundred', 'fifty', 'days', 'seven', 'month', 'ten', 'twenty-seven', 'first', 'year', 'forty', 'six', 'evening', 'day', 'night', 'seedtime', 'harvest', 'cold', 'heat', 'summer', 'spring', 'rhythm', 'youth'], color: '236, 232, 224', font: (px) => `600 ${Math.round(px * 0.8)}px "Inter Tight"`, caps: true, track: 0.1, scale: 1.0 },
  people: { words: ['noe', 'noe’s', 'wife', 'sons', 'sons’', 'wives', 'humanity', 'human', 'heart', 'man'], color: '248, 238, 222', font: (px) => `600 ${px}px "EB Garamond"`, track: 0, scale: 1.04 },
};
const LEX = {};
for (const [k, c] of Object.entries(CLASSES)) for (const w of c.words) LEX[w] = k;
const PLAIN = { color: '246, 240, 230', font: (px, it) => `${it ? 'italic ' : ''}500 ${px}px "EB Garamond"`, track: -0.01, scale: 1 };
export function voiceOf(word) {
  const key = clean(word).toLowerCase().replace(/[^a-z’-]/g, '');
  return CLASSES[LEX[key]] ?? PLAIN;
}
// Set one word in its voice at (x, baseline y); returns the advance to the next word (with a space).
// px is the line's size; alpha 0..1; italic applies to plain words only; ink overrides the colour.
export function paint(ctx, word, x, y, px, { alpha = 1, italic = false, ink } = {}) {
  const v = voiceOf(word);
  const s = clean(word).replace(/[;,.:“”—]+$/, '').replace(/^“/, '');
  const size = Math.round(px * v.scale);
  ctx.font = v === PLAIN ? PLAIN.font(size, italic) : v.font(size);
  ctx.fontVariantCaps = v.caps ? 'all-small-caps' : 'normal';
  ctx.letterSpacing = `${(v.track ?? 0) * size}px`;
  const w = ctx.measureText(s).width;
  // words reach full strength almost as soon as they arrive; motion carries the entrance
  const a = Math.min(1, alpha * 3);
  if (alpha > 0.002) { ctx.fillStyle = `rgba(${ink ?? v.color}, ${a.toFixed(3)})`; ctx.fillText(s, x, y); }
  ctx.font = PLAIN.font(px, false); ctx.fontVariantCaps = 'normal'; ctx.letterSpacing = '0px';
  // italic and heavy voices overhang their measured box: give them a little more room
  const extra = (v === PLAIN ? italic : /italic/.test(v.font(10))) ? size * 0.09 : 0;
  return w + ctx.measureText(' ').width * 1.05 + extra;
}
// Width a line will take when painted word by word.
export function lineWidth(ctx, words, px, italic = false) {
  let w = 0;
  for (const x of words) w += paint(ctx, x.w ?? x, 0, 0, px, { alpha: 0, italic });
  return w - ctx.measureText(' ').width * 1.05;
}
// Paint a word in its voice at the size and slant of the context's current font, leaving the
// context's font settings as they were. Returns the advance to the next word.
export function paintHere(ctx, word, x, y, alpha = 1, ink) {
  const f = ctx.font, ls = ctx.letterSpacing, caps = ctx.fontVariantCaps;
  const px = parseFloat((f.match(/(\d+(?:\.\d+)?)px/) ?? [0, 160])[1]);
  const adv = paint(ctx, word, x, y, px, { alpha, italic: /italic/.test(f), ink });
  ctx.font = f; ctx.letterSpacing = ls; ctx.fontVariantCaps = caps;
  return adv;
}
// Width of a run of words painted in their voices at the context's current font.
export function widthHere(ctx, words) {
  let w = 0;
  for (const x of words) w += paintHere(ctx, x, 0, 0, 0);
  return w - ctx.measureText(' ').width * 1.05;
}
// The voice of a word as plain settings (for drawing it letter by letter).
export function voiceStyle(word, px, italic = false) {
  const v = voiceOf(word);
  const size = Math.round(px * v.scale);
  return { font: v === PLAIN ? PLAIN.font(size, italic) : v.font(size), caps: v.caps ? 'all-small-caps' : 'normal', track: `${(v.track ?? 0) * size}px`, color: v.color };
}
