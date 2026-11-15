# Nova Rift — The Eight Relays

A free, single-player 3D platform adventure built with JavaScript and Three.js. Explore eight worlds and 32 stages, battle machine Wardens, and restore a forgotten planetary network.

## Features

- Three playable explorers: Nova, Atlas and Mira.
- Land, underground, underwater, skyway and reactor stages.
- Energy weapons, invincibility stars, checkpoints and hidden tunnels.
- Medals, score bonuses and fireworks.
- Locally generated 3D artwork and synthesized music.
- Saved scores, world unlocks and sound preferences in your browser.
- Balanced graphics and reduced-motion settings.

No accounts, API keys or external services are required. Once downloaded, the game can be played offline using its local server.

## Play

Install **Node.js 24 or 26** and use a desktop browser with **WebGL 2** graphics support.

Download or clone this repository, open a terminal in the project folder, and run:

```sh
npm start
```

Open **http://localhost:8642**, choose your explorer, and select **Begin expedition**. Press **Ctrl+C** in the terminal to stop the server.

On macOS, you can also double-click `start.command` after installing Node.js.

**No package installation is needed to play.** Open the local address above rather than opening `index.html` directly. The game requires a keyboard; touch controls are not implemented. If graphics are slow, select **Balanced** in the pause menu.

## Controls

| Key | Action |
| --- | --- |
| A / D or Left / Right | Move |
| Space / Z / Up | Jump; hold for height; tap to swim |
| Shift | Sprint |
| X / J | Fire an equipped weapon |
| S / Down | Crouch in armor or enter a tunnel |
| Enter | Start, pause, resume or continue |
| Escape / P | Pause or resume |
| H | Field guide |
| M | Toggle sound |
| F | Fullscreen |

Sound starts after your first interaction. Pick up a blaster and a Nova Star near the start of each stage. Stars protect against enemy contact for 12 seconds; pits and lava remain lethal.

## Saved progress

Best score, furthest unlocked world and mute preference are stored in your browser. Continue starts at the first stage of your furthest unlocked world. Exact position and inventory are not saved.

Use the same browser and `localhost:8642` address to keep accessing your save. Clearing site data removes progress. There are no analytics or remote saves.

## Tests

```sh
npm ci
npm run check
npm test
```

For browser tests:

```sh
npx playwright install chromium
npm run test:e2e
```

The browser test renders all 32 stages and checks a representative gameplay journey in Chromium. Safari and Firefox have not been verified.

## Static build

```sh
npm run build
```

Host the generated `dist/` folder on a static web server. It contains the game assets and license notices, without Git history, local configuration or development tools.

## License

Project code is available under the [MIT License](LICENSE). Three.js retains its own [MIT license](vendor/THREE-LICENSE.txt); see [third-party notices](THIRD_PARTY_NOTICES.md).
