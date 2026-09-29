"""Write film.json from the scene plan, snapping each cut to the nearest measured beat within half a
second, but never across a sung line."""
import json
a = json.load(open('data/audio.json')); beats = a['beats']
L = json.load(open('data/lyrics.json'))['lines']
plan = [l.split() for l in open('tools/scenes.txt') if l.strip()]
starts = [float(r[2]) for r in plan]
snapped = [0.0]
for b in starts[1:]:
    lo = max([l['end'] for l in L if l['end'] <= b + 0.001] + [0]) + 0.05
    hi = min([l['start'] for l in L if l['start'] >= b - 0.001] + [999]) - 0.25
    cands = [x for x in beats if lo <= x <= hi and abs(x - b) < 0.5]
    nb = min(cands, key=lambda x: abs(x - b)) if cands else b
    snapped.append(round(round(nb * 60) / 60, 4))
end = 342.4
scenes = [{'id': r[0], 'scene': r[1], 'from': snapped[i], 'to': snapped[i + 1] if i + 1 < len(plan) else end} for i, r in enumerate(plan)]
json.dump({'fps': 60, 'samples': 8, 'scenes': scenes}, open('film.json', 'w'), indent=1)
for s, b in zip(scenes, starts): print(s['id'], s['scene'], b, '->', s['from'])
