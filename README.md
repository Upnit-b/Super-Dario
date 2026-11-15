# Nova Rift — The Eight Relays

An original, locally playable 3D side-scrolling adventure. This upgrades the former Foxfire game with a new visual identity, human explorers, robot adversaries, energy weapons, guaranteed invincibility stars, portal checkpoints, a story, medal-driven fireworks, and a new electronic score.

The world and characters are real 3D meshes with lighting, shadows and perspective. Movement deliberately stays on a side-scrolling plane. The artwork is stylized and generated in code; it is not photorealistic or a freely roaming third-person game.

The eight worlds have their own scenery. Look for solar arrays in the wastes, crystalline ridges in the Lunar Gardens, snowy conifers at Glacier Array, and glowing towers in the reactors. Underwater stages use their own lighting and sea plants. The stone and metal surfaces use textures generated on your Mac.

## Play on your Mac

1. Double-click **start.command**. If macOS blocks it, right-click → Open.
2. Keep the Terminal window open while playing. It runs Python's local file server, listening only on your own computer.
3. Click **Begin expedition**, choose your explorer, then enter the first stage.
4. Close that Terminal window or press Control+C when finished.

Alternatively, from this folder:

```zsh
npm start
```

Then visit <http://localhost:8642>. Node/npm are needed only for that alternative command and tests. The double-click launcher needs Python 3, which is present on the development Mac.

**Do not open index.html directly.** The 3D engine uses JavaScript modules, so the game needs the local server. Once the included files are on disk, playing does not require the internet, an account, or a paid service. No assets are fetched from external servers during play.

The browser must support WebGL 2, the graphics interface used to draw the 3D world. Tested in the installed Google Chrome on this Mac. Safari and Firefox were not verified. Use **Balanced** graphics in the pause menu if the high-quality shadow setting is too demanding.

## Controls

| Key | Action |
| --- | --- |
| A / D or left / right arrows | Move |
| Space / Z / up arrow | Jump; hold for a higher jump; tap to swim underwater |
| Shift | Sprint for longer jumps |
| X / J | Hold to fire an equipped weapon |
| S / down arrow | Crouch in armor; enter a hidden tunnel while standing on its entrance |
| Enter | Start / pause / resume; advance stage results |
| Escape / P | Pause / resume |
| H | Field guide |
| M | Toggle sound |
| F | Fullscreen |
| Tab, then Enter | Use interface buttons with the keyboard |

Sound begins after your first interaction, as required by browser audio policies. There are also mouse controls for starting, continuing, character selection, sound, fullscreen, pause and results.

## Your expedition

The Helix network was built to keep the planet alive. Its caretaker has sealed the eight relays and turned the maintenance machines against returning explorers. Nova, Atlas and Mira follow their navigator Echo's transmissions to restore the network.

Choose one of three animated human explorers. Their appearances differ; physics, weapons and difficulty are identical. There are eight worlds with four stages each:

1. Verdant Reach
2. Solar Wastes
3. Lunar Gardens
4. Glacier Array
5. Amber Wilds
6. Violet Marsh
7. Tidal Frontier
8. The Helix Core

The four stage types are Expedition, Undercity (Deep Dive in worlds 3 and 6), Skyway, and Reactor. Each reactor ends with a Warden battle. Between worlds, a story transmission advances the expedition. The final clear has an ending.

## Weapons, stars and supplies

- **Ion blaster:** guaranteed on the safe starting path of every stage, with a replacement beside the checkpoint. Unlimited ammunition. Hold X to fire.
- **Pulse rifle:** floats above the checkpoint. Faster fire and double damage against Wardens. Armor/pepper upgrades can also grant it.
- **Nova Star:** guaranteed near the beginning and checkpoint of every stage. Gives 12 seconds of invincibility against enemy contact and destroys ordinary enemies on contact. Against Wardens, contact deals damage at a controlled interval. Pits and lava remain lethal.
- **Armor:** absorbs one hit and allows brick breaking. A new expedition starts armored; respawning after a death starts without armor.
- **Heart:** extra life. Every 100 coins also grants a life.

Guns destroy walking robots, rolling armored shells, airborne drones, aquatic drones, turrets, exposed hazard entities and enemy projectiles. Wardens require multiple hits. Solid terrain blocks shots. Hazards represented by terrain—lava, pits and spike tiles—are not shootable enemies.

Weapons survive ordinary damage; a death removes the weapon. The checkpoint's supply pickups let you re-equip. Checkpoints persist only for the current session and stage.

The old pixel creature names remain as internal simulation identifiers, but the live renderer displays robot models. `js/sprites.js` is retained as the original artwork file and is no longer loaded by the game.

## Portals, medals and fireworks

Small illuminated rings are checkpoints. Large transit gates mark the end of normal stages. Defeating the Warden restores a world relay.

Earn any one of these medals to launch fireworks when clearing a stage:

| Medal | Rule | Bonus |
| --- | --- | --- |
| Untouched | Take no damage during this attempt | 1,500 points |
| Collector | Collect at least 70% of the stage's coin target | 1,500 points |
| Speedrunner | Finish with at least 60% of the starting timer remaining | 1,500 points |

The coin target counts visible main-route coins plus coin-containing caches; a multi-coin cache counts as one target entry, and bonus-room coins count toward your collected total. Medals reset for each respawned attempt. Results stay visible until you continue. The game timer measures actual simulation seconds and stops when paused.

## Music

Nine original synthesized arrangements cover title, expedition, undercity, water, skyway, reactor, boss, invincibility and ending. The score layers chords, stereo plucks, bass, kick/snare/hat patterns, delay and reverb. Arrangement sections alternate through a sixteen-bar cycle. Combat and power-up effects use separate levels from music. Audio nodes disconnect after playback.

The music is synthesized, not recorded orchestral music. Musical taste and long-session listening comfort still need your own playtest.

## Saved progress

The browser stores your best score, furthest unlocked world, and mute preference in local storage under the original `foxfire.save.v1` key. Existing progress is retained **when using the same browser and origin**. `localhost`, `127.0.0.1`, and directly opened files have different storage areas. If your old progress was on `localhost:8642`, use that address again.

Clearing browser site data removes the save. Continue begins at the first stage of the furthest unlocked world; it does not save your exact position or inventory. Storage failures display a warning; gameplay can continue in the current tab.

## Files and runtime

| File | Role |
| --- | --- |
| index.html / styles.css | Interface, HUD, dialogs and responsive layout |
| js/game.js | Fixed 60-step-per-second simulation, input, collision, combat, rewards, state and saving |
| js/levels.js | Deterministic stage generation and guaranteed supply placement |
| js/renderer.mjs | Three.js meshes, humanoid animation, environment palettes, lighting, camera and particles |
| js/ui.js | Character selection, story, HUD, dialogs and settings |
| js/audio.js | Web Audio score, scheduling, mixing and effects |
| vendor/three.module.min.js / vendor/three.core.js | Local Three.js 0.187.0 rendering library |
| vendor/THREE-LICENSE.txt | MIT license for Three.js |
| start.command | macOS zsh launcher and local-server lifetime management |
| tests/game.test.cjs / tests/audio.test.cjs | Simulation and audio-contract regression checks |
| tests/browser-smoke.cjs | Isolated Chrome rendering and interaction regression check |

The browser runs all gameplay. Python only serves files; there is no backend, database, cloud deployment or telemetry. Game geometry and audio are produced locally. Source changes require only a browser reload, with no build step.

## Verify changes

```zsh
npm test
npm run check
```

`npm test` runs Node's built-in test runner. `npm run check` checks syntax for the five active JavaScript modules. There is no configured type checker or linter.

The browser test requires an existing Playwright installation and Chrome. Run the local server first, then point `PLAYWRIGHT_MODULE` at your installed package if it is not resolvable normally:

```zsh
PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright node tests/browser-smoke.cjs
```

The test creates temporary screenshots under `/private/tmp/nova-*.png`. It uses an isolated browser profile, not your signed-in profile. It covers all 32 stage renders and a representative control flow, not a human completion of every level.

For focused development, use `?w=3&s=2` to open a specific stage. `&pw=2` starts with armor; `&god=1` enables the existing development damage override. These are developer checks, not normal play modes.

Three.js source and documentation: <https://threejs.org/docs/>. Version and license verified against <https://registry.npmjs.org/three/0.187.0>. The vendored module is served locally and imports the accompanying core file.
