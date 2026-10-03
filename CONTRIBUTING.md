# Contributing to Genesis 8, The Dove

Pull requests are welcome: bug fixes, documentation, tests, new scene ideas and tooling.

Every pull request needs an approving review from Shane Fisher (@omiron33), the code owner, before it can be merged. `main` is protected, so please work on a branch or a fork and open a pull request against `main`.

## Run it

This repository holds the song's scenes and data: `scenes/` (one module per scene, plus `.lyric.js` lyric layers), `lib/` (shared worlds and type), `data/` (aligned lyrics and measured audio) and `film.json` (scene order and timing).

- `python3 tools/analyze.py media/song.wav data/audio.json` (needs numpy) measures beats and loudness envelopes.
- `python3 tools/timeline.py` rebuilds `film.json` from `tools/scenes.txt`, snapping cuts to measured beats.

The scenes are drawn by the Ark engine's photoreal GPU scene renderer (https://github.com/omiron33/ark-video-studio). The source recording belongs at `media/song.wav` and is never committed. The visual plan is in [docs/BRIEF.md](docs/BRIEF.md).

## Before you open a pull request

- Keep pull requests small and focused, and explain what you changed and how you checked it.
- For visual changes, render a still or a short clip and attach it to the pull request.
- Do not commit secrets, `.env` files, cookies, song recordings, full renders, or model weights. Large media stays out of git.
- Issues: use the bug report or feature request template.

## License

By contributing, you agree that your contributions are licensed under the repository's [MIT License](LICENSE). Fonts and third-party files keep their own notices.
