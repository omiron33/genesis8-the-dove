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

## Test scenes

| Scene | Lyric | Idea |
| --- | --- | --- |
| `ararat` | "the mountain peaks came into view." | An aerial dawn over a sea of cloud; the deck sinks and the snow-lined peaks break through. |
| `dove` | "At evening she came back, / an olive leaf held in her beak." | Slow motion, low over the withdrawing water, the dove backlit by the evening sun. |
| `ark` | "Come out of the ark, / you, your wife, your sons," | The dark timber hold; the great door lowers and morning pours in along the floor. |

Scripture text follows the Septuagint wording used in the song.
