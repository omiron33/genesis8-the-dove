# Genesis 8, The Dove

Scenes for a lyric film of *Genesis 8, The Dove*, drawn entirely in code. There are no generated
or photographic images: every frame is a raymarched GPU shader (terrain, cloud, water, timber,
feathers) with one sun, soft shadows and light in the air, rendered at 1920×1080 and 60 fps.

The renderer itself is a separate lyric film engine (not public); it averages many jittered
sub-frames per frame for motion blur and anti-aliasing and adds one shared film finish. This
repository holds only what belongs to this song:

- `scenes/`: one module per scene. Each defines its shader, camera path, scene timing and how the
  lyric is set and placed in the world.
- `data/lyrics.json`: the words with their sung start and end times, force-aligned to the recording.
- `data/audio.json`: measured beats and loudness envelopes.
- `tools/analyze.py`: the beat and envelope measurement.

## The film

36 scenes (`film.json`, plan in `docs/BRIEF.md`), 5:42 at 1920×1080 and 60 fps. One running motif, the
waterline, a thin line of gold light that is the flood's level in every scene and settles at the end
as the horizon. The colour builds from a silver flood to full morning at "Come out of the ark".
`lib/` holds the shared worlds (sea, mountain, the ark's hold, dry ground, birds) and the look.
The earlier test scenes `ararat`, `dove` and `ark` are kept in `scenes/`.

Scripture text follows the Septuagint wording used in the song.
