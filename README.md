# VAULTBREAK: The Meridian Job

[![make.fun competition](https://make.fun/bounty/best-heist-game-20261122-0559/badge.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![make.fun rank](https://make.fun/bounty/best-heist-game-20261122-0559/rank/azkia13.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![make.fun reward](https://make.fun/bounty/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

A top-down 2D stealth heist game. One museum, one vault, one gold star worth
$5,000 — slip past the night guards and the wall cameras, lift the Meridian
Star, and reach the getaway door. Quiet, or not at all.

## How to play

Open `game/index.html` in desktop Chrome (or serve `game/` with any static
server, e.g. `node serve.mjs game 8080`).

- **WASD / arrow keys** — move
- **Shift** — sneak (slower, harder to spot)
- **Space** — dash (fast, but loud — guards hear it)
- **E** — lift the Meridian Star / work a lock (hold it by the artifact)
- **Click** — interact, or toss a coin toward the pointer
- **1** — smoke bomb (breaks line of sight)
- **2** — lockpick the shortcut door (stand by it, hold still)
- **3** — toss a coin (pulls nearby guards to where it lands)
- **R** — try the job again after being caught or escaping

Guards patrol with vision cones; cameras sweep the halls. Being seen raises
your suspicion and the **ALARM** meter — at 100 the museum locks down and the
night is over. The meter only falls while nobody sees you. Grab the Star,
then run for the green GETAWAY door. A ghost run (alarm never above 30) pays
a $2,000 bonus.

## Structure

- `game/index.html` — the page and canvas
- `game/src/config.js` — constants and the room layout
- `game/src/random.js` — seeded random generator
- `game/src/input.js` — keyboard and mouse state
- `game/src/world.js` — state, patrols, detection, alarm, gadgets, win/lose
- `game/src/render.js` — canvas drawing: floor, cones, HUD, screens
- `game/src/audio.js` — WebAudio beeps, no audio files
- `game/src/shots.js` — deterministic screenshot staging + autopilot
- `game/src/main.js` — frame loop and screen flow

`main.ts` (Node 22 stdlib only) copies `game/` and `screenshots/` to
`MAKEFUN_OUTPUT_DIR` (or `/output`) and writes `dossier.json` with the
vendored `vendor/makefun-game.ts` library.

## License

SPDX-License-Identifier: MIT — see `LICENSE`.
